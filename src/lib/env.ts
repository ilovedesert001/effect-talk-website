/**
 * Typed environment variable parsing.
 * All env vars are validated at import time on the server.
 * Client-safe vars must use NEXT_PUBLIC_ prefix.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

/** Server-only env vars. Do NOT import this file in client components. */
export const env = {
  /** Optional: used only if an external backend API is configured; pattern/rule data comes from DB. */
  BACKEND_API_BASE_URL: optionalEnv("BACKEND_API_BASE_URL", "http://localhost:4000"),
  DATABASE_URL: requireEnv("DATABASE_URL"),
  WORKOS_API_KEY: requireEnv("WORKOS_API_KEY"),
  WORKOS_CLIENT_ID: requireEnv("WORKOS_CLIENT_ID"),
  WORKOS_REDIRECT_URI: requireEnv("WORKOS_REDIRECT_URI"),
  RESEND_API_KEY: requireEnv("RESEND_API_KEY"),
  API_KEY_PEPPER: requireEnv("API_KEY_PEPPER"),
  APP_BASE_URL: optionalEnv("APP_BASE_URL", "http://localhost:3000"),
  APP_ENV: optionalEnv("APP_ENV", "local") as "local" | "staging" | "production",
} as const
