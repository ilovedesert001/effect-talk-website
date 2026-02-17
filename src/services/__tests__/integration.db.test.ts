/**
 * Integration tests for Db, Analytics, and ApiKeys using a real database.
 *
 * Use a dedicated test database only. Never set DATABASE_URL to your production
 * or staging database—these tests TRUNCATE users, api_keys, waitlist_signups,
 * consulting_inquiries, feedback, and analytics_events, which would destroy production data.
 *
 * To run: set RUN_INTEGRATION_TESTS=1 and DATABASE_URL to a test Postgres instance
 * (e.g. a separate Neon branch or local Docker). Skipped when RUN_INTEGRATION_TESTS
 * is not set. If APP_ENV=production or DATABASE_URL looks like production (e.g.
 * neon.tech), tests are skipped and truncation is never run.
 *
 * Pattern/rules tests were removed—they assumed a dedicated test DB with truncation
 * and direct writes. Production has effect_patterns (read-only), rules (write-locked),
 * and cannot be truncated.
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest"
import { Effect } from "effect"
import { sql } from "drizzle-orm"

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1"
/** Production-like hosts: do not truncate or run destructive tests. */
const PRODUCTION_URL_PATTERNS = ["neon.tech", "neon.build", ".neon.azure"]

function isProductionLikeDb(): boolean {
  if (process.env.APP_ENV === "production" || process.env.APP_ENV === "staging") return true
  const url = process.env.DATABASE_URL ?? ""
  return PRODUCTION_URL_PATTERNS.some((p) => url.includes(p))
}

let dbAvailable = false

describe("Db + Analytics + ApiKeys integration (real DB)", () => {
  beforeAll(async () => {
    if (!runIntegrationTests) return
    if (isProductionLikeDb()) {
      console.warn(
        "Integration tests skipped: DATABASE_URL or APP_ENV looks like production. Use a dedicated test database only."
      )
      return
    }
    try {
      const { db } = await import("../../db/client")
      await db.execute(sql`SELECT 1`)
      dbAvailable = true
    } catch (err) {
      console.warn(
        "Integration tests skipped: database unavailable (set DATABASE_URL to a test Postgres instance to run them).",
        err instanceof Error ? err.message : err
      )
    }
  })

  beforeEach(async () => {
    if (!runIntegrationTests || !dbAvailable || isProductionLikeDb()) return
    const { db } = await import("../../db/client")
    await db.execute(
      sql`TRUNCATE analytics_events, api_keys, consulting_inquiries, feedback, waitlist_signups, users RESTART IDENTITY CASCADE`
    )
  })

  describe("Waitlist and Analytics", () => {
    it("inserts waitlist signup and tracks event", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const AnalyticsApi = await import("../Analytics/api")
      const signup = await Effect.runPromise(
        DbApi.insertWaitlistSignup("waitlist@example.com", "playground", "Developer")
      )
      expect(signup.email).toBe("waitlist@example.com")
      expect(signup.source).toBe("playground")
      expect(signup.role_or_company).toBe("Developer")
      expect(signup.id).toBeDefined()
      expect(signup.created_at).toBeDefined()

      await Effect.runPromise(
        AnalyticsApi.trackEvent({ type: "waitlist_submitted", source: "playground" })
      )
    })
  })

  describe("Consulting inquiry", () => {
    it("inserts consulting inquiry", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const inquiry = await Effect.runPromise(
        DbApi.insertConsultingInquiry({
          name: "Jane Doe",
          email: "jane@example.com",
          role: "CTO",
          company: "Acme",
          description: "Need help with Effect.",
        })
      )
      expect(inquiry.name).toBe("Jane Doe")
      expect(inquiry.email).toBe("jane@example.com")
      expect(inquiry.description).toBe("Need help with Effect.")
      expect(inquiry.id).toBeDefined()
    })
  })

  describe("Feedback", () => {
    it("inserts feedback", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const result = await Effect.runPromise(
        DbApi.insertFeedback({
          email: "feedback@example.com",
          message: "This is at least ten characters of feedback.",
        })
      )
      expect(result.id).toBeDefined()
      expect(result.email).toBe("feedback@example.com")
      expect(result.message).toBe("This is at least ten characters of feedback.")
      expect(result.name).toBeNull()
      expect(result.created_at).toBeDefined()
    })

    it("inserts feedback with optional name", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const result = await Effect.runPromise(
        DbApi.insertFeedback({
          name: "Feedback User",
          email: "named@example.com",
          message: "Another valid message that is long enough.",
        })
      )
      expect(result.id).toBeDefined()
      expect(result.email).toBe("named@example.com")
      expect(result.name).toBe("Feedback User")
      expect(result.message).toBe("Another valid message that is long enough.")
      expect(result.created_at).toBeDefined()
    })
  })

  describe("User and API keys", () => {
    it("creates user, API key, lists, and revokes", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const ApiKeysApi = await import("../ApiKeys/api")
      const user = await Effect.runPromise(
        DbApi.upsertUser({
          workosId: "workos-test-123",
          email: "apikey@example.com",
          name: "API Key User",
          avatarUrl: undefined,
        })
      )
      expect(user).not.toBeNull()
      expect(user?.email).toBe("apikey@example.com")
      const userId = user?.id

      const created = await Effect.runPromise(ApiKeysApi.createApiKey(userId, "My Key"))
      expect(created.plaintext).toMatch(/^ek_[a-f0-9]{40}$/)
      expect(created.record.name).toBe("My Key")
      expect(created.record.user_id).toBe(userId)

      const listed = await Effect.runPromise(ApiKeysApi.listUserApiKeys(userId))
      expect(listed.length).toBe(1)
      expect(listed[0].name).toBe("My Key")

      const revoked = await Effect.runPromise(
        ApiKeysApi.revokeUserApiKey(created.record.id, userId)
      )
      expect(revoked).not.toBeNull()
      expect(revoked?.revoked_at).toBeDefined()

      const listedAfter = await Effect.runPromise(ApiKeysApi.listUserApiKeys(userId))
      expect(listedAfter.length).toBe(1)
      expect(listedAfter[0].revoked_at).toBeDefined()
    })
  })

})
