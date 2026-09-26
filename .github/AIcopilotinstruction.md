# SpeakBetter AI Copilot Instructions

SpeakBetter is a communication-improvement app, not just a recorder. Preserve the core loop:

Practice -> Record -> Review -> Analyze -> Understand -> Learn -> Record Again -> Compare -> Track Progress.

The Interview Portal follows the same standard:

Select role/level/category -> Select a real question -> Read guidance -> Record -> Preview -> Save -> Review -> Retry -> Compare.

## Product Principles

- Never fake analysis, scores, percentages, eye contact, posture, confidence, transcript, or speech metrics.
- Show a metric only when it comes from real stored data, deterministic calculation, documented heuristic logic, real transcript analysis, or real AI analysis.
- If a metric cannot be measured reliably, show an honest state such as "Not enough data", "Analysis unavailable", or "Transcript required for this metric".
- Interview duration bands are deterministic guidance, not quality scores.
- Interview word count, words-per-minute, filler-word, and STAR-structure metrics require a real transcript.
- Optional transcription and AI providers must be disabled by default and must never return fake fallback text or feedback.
- Coaching language must be supportive, professional, and specific. Prefer "Try...", "Consider...", and "Focus next..." over judgmental language.
- Prioritize one clear next-practice goal over many suggestions.

## Frontend Guidelines

- Keep the Practice dashboard premium, spacious, and coach-like.
- Keep Interview Portal pages consistent with the existing indigo/violet identity and clearly separate interview progress from general speaking-practice progress.
- Use the existing indigo/violet identity with restrained accents, subtle shadows, strong typography hierarchy, and responsive layouts.
- Do not add visible controls that do nothing.
- Make all buttons, links, tabs, form fields, and recording controls keyboard-accessible.
- Respect `prefers-reduced-motion` for animations and transitions.
- Keep dashboard personalization based on actual session history only.

## Recording And Review

- Camera and microphone permission errors should be clear and actionable.
- Always clean up media streams and recorder resources when recording stops or a component unmounts.
- Transcript, audio markers, video engagement, posture, and eye-contact features must be presented as unavailable unless a real implementation exists.
- Review screens should clearly explain any heuristic score methodology.
- Interview review screens must distinguish deterministic metrics from transcript-dependent metrics and AI analysis.
- Deleting an interview session must remove its media and metadata through the same storage abstraction used for practice recordings.

## Engineering Guidelines

- Prefer existing architecture and local patterns.
- Keep changes scoped and avoid unnecessary rewrites.
- Run frontend tests, build, and lint before committing UI changes.
- Run focused backend tests for interview domain/API/metric changes, and run the full backend suite when local Postgres test credentials are available.
- Keep backend storage and API contracts stable unless a feature explicitly requires backend work.
