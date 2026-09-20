package com.speakbetter.practice.service;

import com.speakbetter.practice.service.storage.VideoSource;

/** Where to get a recording's bytes from, plus the MIME type it was originally uploaded as. */
public record VideoFile(VideoSource source, String mimeType) {
}
