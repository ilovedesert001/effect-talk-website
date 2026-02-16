# Deployment checklist (beta / production)

Use this checklist before deploying to staging or production (e.g. Vercel + Neon).

**CLI deploy:** Build runs locally. Ensure `.env.local` has real values (see docs/env.md). Then run `vercel` or `vercel --prod`.

## Required environment variables

Set these in Vercel (or your host) for the **build** and **runtime** environments.

| Variable | Build | Runtime | Notes |
|----------|-------|---------|--------|
| `DATABASE_URL` | **Yes** | **Yes** | Next.js build runs `generateStaticParams` for patterns, rules, tour, and blog; the DB client loads at build time. Use the same Neon connection string (or a read-only URL) for both. |
| `WORKOS_API_KEY` | No | Yes | WorkOS AuthKit. |
| `WORKOS_CLIENT_ID` | No | Yes | |
| `WORKOS_REDIRECT_URI` | No | Yes | Must match WorkOS Dashboard Redirects (e.g. `https://effecttalk.com/auth/callback`). |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Yes | Yes | Same value as `WORKOS_REDIRECT_URI` (public for client redirect). |
| `WORKOS_COOKIE_PASSWORD` | No | Yes | **Min 32 characters.** Used for session cookies and AuthKit. Generate: `openssl rand -base64 24`. In production, use a strong secret and never commit it. |
| `RESEND_API_KEY` | No | Yes | Required for confirmation emails (waitlist, consulting). If unset, form submits succeed but no email is sent. |
| `API_KEY_PEPPER` | No | Yes | **Required in production/staging.** Strong secret for hashing API keys. Generate: `openssl rand -base64 32`. Must not be the default value. |
| `APP_ENV` | Optional | Yes | Set to `production` or `staging` so the app uses Neon serverless driver and enforces production safeguards. |
| `APP_BASE_URL` | No | Yes | e.g. `https://effecttalk.com`. |

## Pre-deploy steps

1. **Database**: Ensure the database has all required tables. Run `bun run db:check` against your target DB (see [docs/database.md](database.md)).
2. **Build**: In Vercel, add `DATABASE_URL` to **Build** environment variables as well as **Production/Preview**, so `next build` can run `generateStaticParams`.
3. **Secrets**: Confirm `API_KEY_PEPPER`, `WORKOS_COOKIE_PASSWORD`, and WorkOS keys are set and are not placeholder values.
4. **WorkOS**: In the WorkOS Dashboard, add your production redirect URI and ensure the GitHub (or other) provider is configured for the production client.

## Optional

- **PostHog**: Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` for analytics; omit for no-op.
- **BACKEND_API_BASE_URL**: Only needed if you use an external backend API; pattern/rule data comes from the database.
