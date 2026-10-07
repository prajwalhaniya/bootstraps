# sidecar

A minimal Node.js (Express + TypeScript) auxiliary process meant to run alongside a generated `nodejs` or `python` app — e.g. for background jobs, log shipping, or shared internal utilities that shouldn't live inside the main API process.

Unlike `nodejs/common`, this isn't a template cloned per-app: it's a single fixed scaffold you extend directly.

```bash
cd entry/sidecar
cp .env.example .env
pnpm install && pnpm run dev
```

Exposes `GET /health` as a starting point.
