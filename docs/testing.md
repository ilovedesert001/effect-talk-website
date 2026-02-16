# Testing checklist

Use this to smoke-test the app after deploy or before release.

## Public pages (no login)

- [ ] **Home** (`/`) – loads, nav works
- [ ] **Effect Patterns** (`/patterns`) – list loads
- [ ] **Pattern detail** (`/patterns/[id]`) – pick one, content renders
- [ ] **Blog** (`/blog`) – list loads
- [ ] **Blog post** (`/blog/[slug]`) – pick one, content renders
- [ ] **Consulting** (`/consulting`) – form loads; submit (optional, sends email/inquiry)
- [ ] **Playground** (`/playground`) – loads
- [ ] **Code Review** (`/code-review`) – waitlist/CTA
- [ ] **CLI** (`/cli`) – page loads
- [ ] **MCP** (`/mcp`) – page loads
- [ ] **Search** (`/search`) – search patterns/rules
- [ ] **Rules** (`/rules`) – list loads
- [ ] **Rule detail** (`/rules/[id]`) – pick one, content renders
- [ ] **Tour** (`/tour`) – overview loads

## Auth

- [ ] **Sign-in** (`/auth/sign-in`) – “Continue with GitHub” redirects to WorkOS then back
- [ ] **Sign-out** – header/profile menu → sign out, then confirm logged out

## Logged-in only

- [ ] **Settings** (`/settings`) – profile card, name/email shown
- [ ] **Profile update** – change display name or email, Save → success
- [ ] **API Keys** (`/settings/api-keys`) – list (empty or existing keys)
- [ ] **Create API key** – create key, copy shown once, appears in list
- [ ] **Revoke API key** – revoke one, it disappears or shows revoked
- [ ] **Tour lesson** (`/tour/[slug]`) – start a lesson, progress saves (check step completion)

## API routes (via UI or curl)

- [ ] `POST /api/waitlist` – waitlist signup (e.g. from Code Review)
- [ ] `POST /api/consulting` – consulting form submit
- [ ] `POST /api/events` – analytics event (if used by frontend)
- [ ] `GET/POST /api/tour/progress` – get/update tour progress (logged in)
- [ ] `POST /api/tour/progress/sync` – sync tour progress (logged in)
- [ ] `GET/POST /api/profile` – get/update profile (logged in)
- [ ] `POST /api/preferences` – save preferences (logged in)
- [ ] `GET/POST /api/api-keys`, `POST /api/api-keys/[id]` – CRUD API keys (logged in)

## Local vs production

- **Local**: `bun dev`, use `.env.local` with WorkOS redirect `http://localhost:3000/auth/callback` and add that URL in WorkOS Dashboard.
- **Production**: All env vars in Vercel; no trailing newlines (use `printf 'value' | vercel env add KEY production`). `DATABASE_URL` (Neon), `APP_ENV=production`, and `db:migrate` run once against Neon.
