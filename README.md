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
