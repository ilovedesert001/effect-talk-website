/**
 * Integration tests for POST /api/feedback.
 * Validation and rate-limit tests run always; success test runs only when
 * RUN_INTEGRATION_TESTS=1 and a non-production database is available.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { sql } from "drizzle-orm"
import { POST } from "@/app/api/feedback/route"

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1"
const PRODUCTION_URL_PATTERNS = ["neon.tech", "neon.build", ".neon.azure"]

function isProductionLikeDb(): boolean {
  if (process.env.APP_ENV === "production" || process.env.APP_ENV === "staging") return true
  const url = process.env.DATABASE_URL ?? ""
  return PRODUCTION_URL_PATTERNS.some((p) => url.includes(p))
}

let dbAvailable = false

function buildRequest(payload: unknown, ip?: string): NextRequest {
  const url = "http://localhost:3000/api/feedback"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (ip !== undefined) {
    headers["x-forwarded-for"] = ip
  }
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  })
}

describe("POST /api/feedback", () => {
  beforeAll(async () => {
    if (!runIntegrationTests || isProductionLikeDb()) return
    try {
      const { db } = await import("@/db/client")
      await db.execute(sql`SELECT 1`)
      dbAvailable = true
    } catch {
      // DB unavailable; success test will be skipped
    }
  })

  describe("validation (no DB required)", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = buildRequest("not json")
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data).toHaveProperty("error", "Invalid JSON")
    })

    it("returns 400 for invalid email", async () => {
      const req = buildRequest({
        email: "not-an-email",
        message: "This message is long enough to pass.",
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("Validation failed")
      expect(data.details).toBeDefined()
      expect(Array.isArray(data.details)).toBe(true)
    })

    it("returns 400 when message is shorter than 10 characters", async () => {
      const req = buildRequest({
        email: "user@example.com",
        message: "short",
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("Validation failed")
      expect(data.details).toBeDefined()
    })
  })

  describe("rate limit", () => {
    it("returns 429 after exceeding form rate limit (5 per minute)", async () => {
      const ip = `rate-limit-test-${Date.now()}`
      const validBody = {
        email: "ratelimit@example.com",
        message: "Valid message with enough length for the rate limit test.",
      }
      let lastStatus = 0
      for (let i = 0; i < 6; i++) {
        const req = buildRequest(validBody, ip)
        const res = await POST(req)
        lastStatus = res.status
        if (res.status === 429) break
      }
      expect(lastStatus).toBe(429)
    })
  })

  describe("success (DB required)", () => {
    beforeEach(async () => {
      if (!runIntegrationTests || !dbAvailable || isProductionLikeDb()) return
      const { db } = await import("@/db/client")
      await db.execute(sql`TRUNCATE feedback RESTART IDENTITY CASCADE`)
    })

    it(
      "returns 200 and success true for valid body when DB is available",
      { skip: !runIntegrationTests || !dbAvailable || isProductionLikeDb() },
      async () => {
        const req = buildRequest({
          name: "Test",
          email: "route@example.com",
          message: "Valid message with enough length.",
        })
        const res = await POST(req)
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data).toEqual({ success: true })

        const { db } = await import("@/db/client")
        const rows = await db.execute(
          sql`SELECT id, email, message, name FROM feedback WHERE email = 'route@example.com'`
        )
        const r = (rows.rows as Array<{ id: string; email: string; message: string; name: string | null }>)[0]
        expect(r).toBeDefined()
        expect(r.email).toBe("route@example.com")
        expect(r.message).toBe("Valid message with enough length.")
        expect(r.name).toBe("Test")
      }
    )
  })
})
