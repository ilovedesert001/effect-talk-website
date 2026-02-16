# Agent instructions (effect-talk-website)

Guidance for AI agents and automated tooling working in this repo.

## Environment files

Follow the conventions in **docs/env.md**. Summary:

### File roles

- **`.env`** — Committed. Safe defaults and placeholders only. **Never add real secrets.**
- **`.env.example`** — Committed. Template; same keys and order as `.env`. Copy to `.env.local` and replace placeholders.
- **`.env.local`** — Gitignored. Real secrets. **Never commit.**

### Rules

1. **Do not put real secrets in `.env`** — Only safe defaults (e.g. `WORKOS_COOKIE_PASSWORD=xxx`, `API_KEY_PEPPER=change-me-in-production`).
2. **Do not commit `.env.local`** — It is gitignored; never add it or suggest adding it to the repo.
3. **Keep `.env` and `.env.example` in sync** — When adding a new env var the app needs, add it to both files with the same key and a safe default or placeholder.
4. **Do not remove or reorder keys** in `.env` or `.env.example` without a clear reason; prefer adding new keys and leaving existing ones unchanged.
5. **WorkOS:** `WORKOS_COOKIE_PASSWORD` must be at least 32 characters when used for sign-in; document or generate with `openssl rand -base64 24` where relevant.
6. **CLI deploy:** The build reads `.env` and `.env.local` on the machine running the build; for sign-in and API keys to work in the deployed app, `.env.local` must have real values when running `vercel` or `vercel --prod`.

### When editing code

- Do not add code that reads env from files other than via `process.env` (Next.js and the app already load `.env` and `.env.local`).
- Do not suggest committing `.env.local` or putting production secrets in `.env`.
- When introducing a new environment variable, add it to both `.env` and `.env.example` with a safe default or placeholder, and update docs/env.md if it affects the rules or setup.
