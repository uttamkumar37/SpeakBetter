#!/usr/bin/env python3
"""Exercise the built frontend/API with generated disposable WAV fixtures."""
import argparse
import io
import json
import urllib.error
import urllib.request
import uuid
import wave


def run(base):
    def request(method, path, body=None, headers=None, expected=200):
        req = urllib.request.Request(base + path, data=body, method=method, headers=headers or {})
        try:
            response = urllib.request.urlopen(req, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            data = response.read()
            if response.status != expected:
                raise RuntimeError(f"{method} {path}: expected {expected}, got {response.status}")
            return data, response.headers

    def json_request(method, path, value=None, expected=200):
        body = None if value is None else json.dumps(value).encode()
        data, _ = request(method, path, body, {"Content-Type": "application/json"}, expected)
        return json.loads(data) if data else None

    audio = io.BytesIO()
    with wave.open(audio, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\x00\x00" * 16000)
    recording = audio.getvalue()

    def upload(path, topic=None, expected=200):
        boundary = "speakbetter-smoke-" + uuid.uuid4().hex
        parts = []
        fields = {"durationSeconds": "1"}
        if topic is not None:
            fields["topic"] = topic
        for name, value in fields.items():
            parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n').encode())
        parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="video"; filename="smoke.wav"\r\nContent-Type: audio/wav\r\n\r\n').encode())
        parts.extend([recording, f"\r\n--{boundary}--\r\n".encode()])
        data, _ = request("POST", path, b"".join(parts), {"Content-Type": "multipart/form-data; boundary=" + boundary}, expected)
        return json.loads(data)

    practice_path = interview_path = None
    try:
        html, _ = request("GET", "/")
        assert b'id="root"' in html, "frontend HTML was not served"
        for probe in ["live", "ready"]:
            result = json_request("GET", "/api/v2/health/" + probe)
            assert result["service"] == "speakbetter-api"

        practice = upload("/api/practice-sessions", "Temporary infrastructure smoke", 201)
        practice_path = "/api/practice-sessions/" + practice["id"]
        assert practice["durationSeconds"] == 1 and practice["fillerWordCount"] is None
        reviewed = json_request("PUT", practice_path + "/review", {"wentWell": "smoke fixture", "notes": None, "needsImprovement": None, "fillerWordCount": 0})
        assert reviewed["wentWell"] == "smoke fixture"
        history = json_request("GET", "/api/practice-sessions")
        assert any(item["id"] == practice["id"] for item in history)
        media, _ = request("GET", practice["videoUrl"])
        assert media == recording
        media, headers = request("GET", practice["videoUrl"], headers={"Range": "bytes=0-15"}, expected=206)
        assert media == recording[:16] and headers.get("Content-Range", "").startswith("bytes 0-15/")
        data, _ = request("HEAD", practice["videoUrl"])
        assert not data

        questions = json_request("GET", "/api/interview-questions")
        assert len(questions) == 8
        question = questions[0]
        interview = json_request("POST", "/api/interview-sessions", {
            "role": question["role"], "level": question["level"], "category": question["category"], "questionId": question["id"],
        }, 201)
        interview_path = "/api/interview-sessions/" + interview["id"]
        assert interview["status"] == "CREATED" and interview["videoUrl"] is None
        saved = upload(interview_path + "/recording")
        assert saved["status"] == "READY" and saved["transcript"] is None
        assert saved["metrics"]["pacing"]["wordsPerMinute"] is None
        upload(interview_path + "/recording", expected=400)
        media, _ = request("GET", saved["videoUrl"], headers={"Range": "bytes=-16"}, expected=206)
        assert media == recording[-16:]
        print("PASS: frontend, probes, practice upload/history/review, full/range/HEAD playback, interview catalog/state/recording, missing-evidence states")
    finally:
        for path in [practice_path, interview_path]:
            if path:
                request("DELETE", path, expected=204)
                request("GET", path, expected=404)
    print("PASS: disposable recordings and metadata deleted")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:5173")
    arguments = parser.parse_args()
    run(arguments.base_url.rstrip("/"))
