# Environment files

How they work and how to manage them.

## How env files work

- **Load order:** Next.js loads `.env`, then `.env.local`, then env vars from the shell. Later sources override earlier ones for the same key.
- **Build and runtime:** Values are read at **build time** (e.g. `next build`, `vercel`) and at **runtime**. Middleware and server code use whatever was available when the app was built (and, on Vercel, runtime env can override for serverless/Edge where the platform injects vars).
- **CLI deploy:** When you run `vercel` or `vercel --prod`, the build runs on your machine. So the build sees `.env` and `.env.local` from your repo. The deployed app uses those inlined values; sign-in and API keys only work if `.env.local` had real values when you built.

## File roles

| File           | Committed? | Purpose |
|----------------|------------|--------|
| `.env`         | Yes        | Safe defaults only (localhost URLs, placeholder secrets). Ensures required keys exist everywhere. **Never put real secrets here.** |
| `.env.example` | Yes        | Template with the same keys as `.env`. Copy to `.env.local` and replace placeholders with real values. |
| `.env.local`   | No (gitignored) | Your real secrets. Overrides `.env` for local dev and for CLI deploy. **Never commit.** |

## Rules to manage env files

1. **Do not put real secrets in `.env`** — It is committed. Use only safe defaults and placeholders (e.g. `WORKOS_COOKIE_PASSWORD=xxx`, `API_KEY_PEPPER=change-me-in-production`).
2. **Do not commit `.env.local`** — It is gitignored. It holds real API keys, cookie passwords, and DB URLs.
3. **Keep `.env` and `.env.example` in sync** — Same keys, same order. When you add a new env var the app needs, add it to both (with a safe default in `.env`, same placeholder or value in `.env.example`).
4. **Set up `.env.local` once** — Copy from `.env.example`, fill in real values, then leave it. Only change when you add a new required variable or rotate a secret.
5. **WorkOS:** In `.env.local`, `WORKOS_COOKIE_PASSWORD` must be **at least 32 characters**. Generate with: `openssl rand -base64 24`.
6. **CLI deploy:** Before running `vercel` or `vercel --prod`, ensure `.env.local` has real values for WorkOS and any other features you need in the deployed app; the build reads `.env` and `.env.local` on your machine.

## One-time setup

1. `cp .env.example .env.local`
2. Edit `.env.local`: replace every placeholder with real values (WorkOS from dashboard, Resend key, etc.).
3. Set `WORKOS_COOKIE_PASSWORD` to a 32+ character secret (e.g. `openssl rand -base64 24`).
4. In WorkOS Dashboard → Redirects, add your callback URL (e.g. `http://localhost:3000/auth/callback`).
5. Do not commit `.env.local`.

After that, use the rules above when you add or change variables.
