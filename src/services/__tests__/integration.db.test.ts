/**
 * Integration tests for Db, Analytics, ApiKeys, Patterns, and Rules using the real database.
 * No mocks. Set RUN_INTEGRATION_TESTS=1 and DATABASE_URL to a test database to run.
 * Skipped when RUN_INTEGRATION_TESTS is not set (avoids loading DB client).
 * When RUN_INTEGRATION_TESTS=1 but DB is unreachable, tests are skipped with a message.
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest"
import { Effect } from "effect"
import { sql } from "drizzle-orm"

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1"
let dbAvailable = false

describe("Db + Analytics + ApiKeys + Patterns + Rules integration (real DB)", () => {
  beforeAll(async () => {
    if (!runIntegrationTests) return
    try {
      const { db } = await import("../../db/client")
      await db.execute(sql`SELECT 1`)
      dbAvailable = true
    } catch (err) {
      console.warn(
        "Integration tests skipped: database unavailable (set DATABASE_URL to a running Postgres to run them).",
        err instanceof Error ? err.message : err
      )
    }
  })

  beforeEach(async () => {
    if (!runIntegrationTests || !dbAvailable) return
    const { db } = await import("../../db/client")
    await db.execute(
      sql`TRUNCATE analytics_events, api_keys, consulting_inquiries, waitlist_signups, users, patterns, rules RESTART IDENTITY CASCADE`
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

  describe("Patterns", () => {
    it("getAllPatterns returns empty list on fresh DB", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const patterns = await Effect.runPromise(DbApi.getAllPatterns())
      expect(patterns).toEqual([])
    })

    it("inserts and retrieves patterns", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const { db } = await import("../../db/client")
      const { patterns: patternsTable } = await import("../../db/schema")
      const DbApi = await import("../Db/api")

      // Insert two patterns directly
      await db.insert(patternsTable).values({
        title: "Pattern A",
        description: "First pattern",
        content: "<p>Content A</p>",
        category: "Fundamentals",
        difficulty: "Beginner",
        tags: ["effect", "basics"],
      })
      await db.insert(patternsTable).values({
        title: "Pattern B",
        description: "Second pattern",
        content: "<p>Content B</p>",
        category: "Error Handling",
        difficulty: "Intermediate",
        tags: ["error", "catchTag"],
      })

      // getAllPatterns
      const all = await Effect.runPromise(DbApi.getAllPatterns())
      expect(all).toHaveLength(2)
      expect(all.map((p) => p.title).sort()).toEqual(["Pattern A", "Pattern B"])

      // Check shape
      const patternA = all.find((p) => p.title === "Pattern A")
      expect(patternA).not.toBeNull()
      expect(patternA?.description).toBe("First pattern")
      expect(patternA?.content).toBe("<p>Content A</p>")
      expect(patternA?.category).toBe("Fundamentals")
      expect(patternA?.difficulty).toBe("Beginner")
      expect(patternA?.tags).toEqual(["effect", "basics"])
      expect(patternA?.id).toBeDefined()
      expect(patternA?.created_at).toBeDefined()
      expect(patternA?.updated_at).toBeDefined()

      // getPatternById
      const found = await Effect.runPromise(DbApi.getPatternById(patternA?.id ?? ""))
      expect(found).not.toBeNull()
      expect(found?.title).toBe("Pattern A")

      // getPatternById with non-existent ID
      const notFound = await Effect.runPromise(DbApi.getPatternById("00000000-0000-0000-0000-000000000000"))
      expect(notFound).toBeNull()
    })

    it("searchPatternsAndRules finds matching patterns", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const { db } = await import("../../db/client")
      const { patterns: patternsTable } = await import("../../db/schema")
      const DbApi = await import("../Db/api")

      await db.insert(patternsTable).values({
        title: "Handle Errors with catchTag",
        description: "Type-safe error handling",
        content: "<p>catchTag content</p>",
        category: "Error Handling",
        difficulty: "Intermediate",
        tags: ["error"],
      })
      await db.insert(patternsTable).values({
        title: "Use Effect.gen",
        description: "Sequential code with generators",
        content: "<p>gen content</p>",
        category: "Fundamentals",
        difficulty: "Beginner",
        tags: ["gen"],
      })

      // Search by title
      const result1 = await Effect.runPromise(DbApi.searchPatternsAndRules("catchTag"))
      expect(result1.patterns).toHaveLength(1)
      expect(result1.patterns[0].title).toContain("catchTag")
      expect(result1.rules).toHaveLength(0)

      // Search by description
      const result2 = await Effect.runPromise(DbApi.searchPatternsAndRules("sequential"))
      expect(result2.patterns).toHaveLength(1)
      expect(result2.patterns[0].title).toContain("gen")

      // Search with no results
      const result3 = await Effect.runPromise(DbApi.searchPatternsAndRules("nonexistent-xyz"))
      expect(result3.patterns).toHaveLength(0)
    })
  })

  describe("Rules", () => {
    it("getAllRules returns empty list on fresh DB", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const rules = await Effect.runPromise(DbApi.getAllRules())
      expect(rules).toEqual([])
    })

    it("inserts and retrieves rules", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const { db } = await import("../../db/client")
      const { rules: rulesTable } = await import("../../db/schema")
      const DbApi = await import("../Db/api")

      await db.insert(rulesTable).values({
        title: "Always use Effect.Service",
        description: "Prefer Effect.Service over Context.Tag",
        content: "<p>Rule content</p>",
        category: "Services",
        severity: "error",
        tags: ["service", "di"],
      })

      const all = await Effect.runPromise(DbApi.getAllRules())
      expect(all).toHaveLength(1)
      expect(all[0].title).toBe("Always use Effect.Service")
      expect(all[0].category).toBe("Services")
      expect(all[0].severity).toBe("error")
      expect(all[0].tags).toEqual(["service", "di"])

      // getRuleById
      const found = await Effect.runPromise(DbApi.getRuleById(all[0].id))
      expect(found).not.toBeNull()
      expect(found?.title).toBe("Always use Effect.Service")

      // getRuleById with non-existent ID
      const notFound = await Effect.runPromise(DbApi.getRuleById("00000000-0000-0000-0000-000000000000"))
      expect(notFound).toBeNull()
    })

    it("searchPatternsAndRules finds matching rules", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const { db } = await import("../../db/client")
      const { rules: rulesTable } = await import("../../db/schema")
      const DbApi = await import("../Db/api")

      await db.insert(rulesTable).values({
        title: "Use tagged errors",
        description: "All errors should extend Data.TaggedError",
        content: "<p>Tagged error rule</p>",
        category: "Error Handling",
        severity: "error",
        tags: ["error"],
      })

      const result = await Effect.runPromise(DbApi.searchPatternsAndRules("tagged"))
      expect(result.rules).toHaveLength(1)
      expect(result.rules[0].title).toContain("tagged")
    })
  })

  describe("BackendApi (DB-backed)", () => {
    it("fetchPatterns returns patterns from DB", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const { db } = await import("../../db/client")
      const { patterns: patternsTable } = await import("../../db/schema")
      const BackendApi = await import("../BackendApi/api")

      await db.insert(patternsTable).values({
        title: "Test Pattern",
        description: "A test pattern",
        content: "<p>Test</p>",
        category: "Testing",
        difficulty: "Beginner",
        tags: ["test"],
      })

      const patterns = await Effect.runPromise(BackendApi.fetchPatterns())
      expect(patterns).toHaveLength(1)
      expect(patterns[0].title).toBe("Test Pattern")
      // BackendApi maps null -> undefined for optional fields
      expect(patterns[0].category).toBe("Testing")
      expect(patterns[0].difficulty).toBe("Beginner")
      expect(patterns[0].tags).toEqual(["test"])
      // BackendApi Pattern type does not include created_at/updated_at
      expect((patterns[0] as unknown as Record<string, unknown>).created_at).toBeUndefined()
    })

    it("fetchPattern returns single pattern or null", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const { db } = await import("../../db/client")
      const { patterns: patternsTable } = await import("../../db/schema")
      const BackendApi = await import("../BackendApi/api")

      const [row] = await db.insert(patternsTable).values({
        title: "Single Pattern",
        description: "One pattern",
        content: "<p>One</p>",
      }).returning()

      const found = await Effect.runPromise(BackendApi.fetchPattern(row.id))
      expect(found).not.toBeNull()
      expect(found?.title).toBe("Single Pattern")

      const notFound = await Effect.runPromise(BackendApi.fetchPattern("00000000-0000-0000-0000-000000000000"))
      expect(notFound).toBeNull()
    })

    it("searchBackend returns matched patterns and rules", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const { db } = await import("../../db/client")
      const { patterns: patternsTable, rules: rulesTable } = await import("../../db/schema")
      const BackendApi = await import("../BackendApi/api")

      await db.insert(patternsTable).values({
        title: "Error handling pattern",
        description: "Handle errors",
        content: "<p>Errors</p>",
      })
      await db.insert(rulesTable).values({
        title: "Error rule",
        description: "Handle errors properly",
        content: "<p>Rule</p>",
      })

      const result = await Effect.runPromise(BackendApi.searchBackend("error"))
      expect(result.patterns).toHaveLength(1)
      expect(result.rules).toHaveLength(1)

      const noResult = await Effect.runPromise(BackendApi.searchBackend("zzzzzzz"))
      expect(noResult.patterns).toHaveLength(0)
      expect(noResult.rules).toHaveLength(0)
    })
  })
})
