#!/usr/bin/env bun

/**
 * Check that env has real values needed for CLI deploy (sign-in and API keys).
 * Run before `vercel` or `vercel --prod` so the built app works.
 *
 * Usage: bun run env:check   (or bun run scripts/check-env-for-deploy.ts)
 *
 * Exits 0 if ready, 1 with messages if something is missing. Never prints secret values.
 */

import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}
  const out: Record<string, string> = {}
  const content = readFileSync(filePath, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1)
    out[key] = value
  }
  return out
}

const env = { ...parseEnvFile(path.join(root, ".env")), ...parseEnvFile(path.join(root, ".env.local")) }

const errors: string[] = []

const workosApiKey = env.WORKOS_API_KEY ?? ""
const workosClientId = env.WORKOS_CLIENT_ID ?? ""
const redirectUri = env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? env.WORKOS_REDIRECT_URI ?? ""
const cookiePassword = env.WORKOS_COOKIE_PASSWORD ?? ""

if (!workosApiKey || workosApiKey === "sk_test_xxx")
  errors.push("WORKOS_API_KEY missing or still placeholder (set real value in .env.local)")
if (!workosClientId || workosClientId === "client_xxx")
  errors.push("WORKOS_CLIENT_ID missing or still placeholder (set real value in .env.local)")
if (!redirectUri) errors.push("WORKOS_REDIRECT_URI or NEXT_PUBLIC_WORKOS_REDIRECT_URI missing in .env.local")
if (!cookiePassword || cookiePassword === "xxx")
  errors.push("WORKOS_COOKIE_PASSWORD missing or placeholder (set 32+ char secret in .env.local)")
else if (cookiePassword.length < 32)
  errors.push(`WORKOS_COOKIE_PASSWORD must be at least 32 characters (current length: ${cookiePassword.length})`)

const pepper = env.API_KEY_PEPPER ?? ""
if (!pepper || pepper === "change-me-in-production")
  errors.push("API_KEY_PEPPER missing or default (set strong secret in .env.local for API keys in deploy)")

if (errors.length > 0) {
  console.error("Env check failed. Fix .env.local before vercel / vercel --prod:\n")
  for (const e of errors) console.error("  -", e)
  console.error("\nSee docs/env.md.")
  process.exit(1)
}

console.log("Env check passed. .env.local has required values for sign-in and API keys.")
