#!/usr/bin/env bun
/**
 * Write .env.local with same keys as .env and generated WORKOS_COOKIE_PASSWORD + API_KEY_PEPPER.
 * Run once: bun run scripts/write-env-local.ts
 * Replace WORKOS_API_KEY and WORKOS_CLIENT_ID with values from WorkOS Dashboard.
 */

import { writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { randomBytes } from "node:crypto"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const cookie = randomBytes(24).toString("base64")
const pepper = randomBytes(32).toString("base64")

const content = `# Local overrides. Same keys as .env. Generated WORKOS_COOKIE_PASSWORD and API_KEY_PEPPER.
# Replace WORKOS_API_KEY and WORKOS_CLIENT_ID with values from WorkOS Dashboard. Do not commit.

BACKEND_API_BASE_URL=http://localhost:4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/effecttalk

WORKOS_API_KEY=sk_test_xxx
WORKOS_CLIENT_ID=client_xxx
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
WORKOS_COOKIE_PASSWORD=${cookie}

RESEND_API_KEY=re_xxx
API_KEY_PEPPER=${pepper}

APP_BASE_URL=http://localhost:3000
APP_ENV=local

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
`

writeFileSync(path.join(root, ".env.local"), content)
console.log("Wrote .env.local with generated WORKOS_COOKIE_PASSWORD (32+) and API_KEY_PEPPER.")
console.log("Replace WORKOS_API_KEY and WORKOS_CLIENT_ID in .env.local with values from WorkOS Dashboard.")