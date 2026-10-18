# SpeakBetter frontend

React, TypeScript and Vite. The Go API lives in `../backend` and defaults to http://localhost:8081.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
```

`VITE_API_BASE_URL` overrides the backend URL at development/build time. The root Compose build uses an empty base URL and nginx forwards `/api/` to the Go API on the same origin. The application uses HashRouter, so static hosting does not require route rewrites. Public hosting still requires protected backend/media access; local parity is not production authorization.

See the root README and `docs/v2/` for environment setup, actual feature status and tests.
