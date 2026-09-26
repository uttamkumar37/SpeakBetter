# SpeakBetter AI Copilot Instructions

SpeakBetter is a communication-improvement app, not just a recorder. Preserve the core loop:

Practice -> Record -> Review -> Analyze -> Understand -> Learn -> Record Again -> Compare -> Track Progress.

## Product Principles

- Never fake analysis, scores, percentages, eye contact, posture, confidence, transcript, or speech metrics.
- Show a metric only when it comes from real stored data, deterministic calculation, documented heuristic logic, real transcript analysis, or real AI analysis.
- If a metric cannot be measured reliably, show an honest state such as "Not enough data", "Analysis unavailable", or "Transcript required for this metric".
- Coaching language must be supportive, professional, and specific. Prefer "Try...", "Consider...", and "Focus next..." over judgmental language.
- Prioritize one clear next-practice goal over many suggestions.

## Frontend Guidelines

- Keep the Practice dashboard premium, spacious, and coach-like.
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

## Engineering Guidelines

- Prefer existing architecture and local patterns.
- Keep changes scoped and avoid unnecessary rewrites.
- Run frontend tests, build, and lint before committing UI changes.
- Keep backend storage and API contracts stable unless a feature explicitly requires backend work.
