/**
 * API Keys service helpers.
 */

import { randomBytes, createHash } from "node:crypto"
import {
  DEFAULT_API_KEY_PEPPER,
  API_KEY_RANDOM_BYTES,
  API_KEY_PREFIX,
} from "@/types/constants"

function getPepper(): string {
  const raw = process.env.API_KEY_PEPPER ?? DEFAULT_API_KEY_PEPPER
  const appEnv = process.env.APP_ENV as "local" | "staging" | "production" | undefined
  if (appEnv === "production" || appEnv === "staging") {
    if (!raw || raw === DEFAULT_API_KEY_PEPPER) {
      throw new Error(
        "API_KEY_PEPPER must be set to a strong secret in production/staging (e.g. openssl rand -base64 32). Do not use the default."
      )
    }
  }
  return raw
}

/**
 * Hash a token with SHA-256 + server pepper.
 * NOTE: For v1 this is sufficient. Upgrade to Argon2/bcrypt for production.
 */
export function hashToken(token: string): string {
  return createHash("sha256")
    .update(token + getPepper())
    .digest("hex")
}

/**
 * Generate a new API key token.
 * Format: ek_<40 random hex characters>
 */
export function generateToken(): string {
  const random = randomBytes(API_KEY_RANDOM_BYTES).toString("hex")
  return `${API_KEY_PREFIX}${random}`
}
