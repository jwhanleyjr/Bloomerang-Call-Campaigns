# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Local setup and testing
1. Install dependencies so the Next.js CLI (`next`) is available:
   ```bash
   npm ci
   ```
2. Run linting after install:
   ```bash
   npm run lint
   ```

`npm ci` (or `npm install`) must complete successfully before running lint or tests; otherwise commands like `next lint` will fail because the bundled Next.js binary is missing.

## Bloomerang proxy endpoint
Use the built-in API route to verify Bloomerang connectivity without exposing your API key in the browser. With `BLOOMERANG_API_KEY` set in your environment (and optionally `BLOOMERANG_API_BASE` to point at a sandbox), you can fetch a constituent or household via:

```bash
curl "http://localhost:3000/api/bloomerang?id=24438&type=constituent"
curl "http://localhost:3000/api/bloomerang?id=825345&type=household"
```

The route streams the upstream response (status code and content-type preserved) so you can debug calls directly from the Next.js server runtime.
