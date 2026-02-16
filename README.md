This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local database (Docker)

The **Effect Pattern repo** is the schema source of truth for the shared `effect_patterns` table. This app only reads from it; see [docs/database.md](docs/database.md) for the contract and configuration. To verify the database has the effect_patterns table and required columns, run: `bun run db:check`.

To run Postgres locally for development and integration tests:

1. Start Docker, then:
   ```bash
   docker compose up -d
   ```
2. In `.env.local`, set:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/effecttalk
   ```
3. Apply the schema:
   ```bash
   bun run db:push
   ```
4. (Optional) Run integration tests: `RUN_INTEGRATION_TESTS=1 bun run test:run` (use a dedicated test database only—never point `DATABASE_URL` at production; tests truncate app tables).

## Sign-in (WorkOS AuthKit)

GitHub sign-in uses [WorkOS AuthKit](https://workos.com/docs/authkit) via `@workos-inc/authkit-nextjs`. In `.env.local` set:

- `WORKOS_CLIENT_ID`, `WORKOS_API_KEY` — from WorkOS Dashboard (e.g. Staging)
- `WORKOS_REDIRECT_URI` and `NEXT_PUBLIC_WORKOS_REDIRECT_URI` — e.g. `http://localhost:3000/auth/callback`
- `WORKOS_COOKIE_PASSWORD` — at least 32 characters (e.g. `openssl rand -base64 24`)

In [WorkOS Dashboard](https://dashboard.workos.com) → **Redirects**, add that same callback URL. If you see "Couldn't sign in", check the GitHub provider uses your app's credentials (not Demo), and that Redirect URI and environment match.

## Getting Started

First, run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Before deploying to staging or production, see **[docs/deployment.md](docs/deployment.md)** for environment variables and WorkOS setup. For env file setup (including CLI deploy), see **[docs/env.md](docs/env.md)**.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
