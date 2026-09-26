# SpeakBetter frontend

React + TypeScript + Vite app. See the [project README](../README.md) for setup, configuration, and the full feature list.

The Interview Portal lives at `#/interview`, with history at `#/interview/history` and review pages at `#/interview/review/:id`. It reuses the existing recorder and shows only backend-provided deterministic metrics. Transcript and AI panels intentionally show unavailable states unless real providers are configured server-side.

Quick start:

```bash
npm install
npm run dev
```

Validation:

```bash
npm test
npm run build
npx oxlint
```

Interview progress is intentionally separate from general speaking-practice progress so totals and comparisons do not mix different practice modes.
