/**
 * Unit tests for rate limiting (in-memory).
 */

import { describe, it, expect } from "vitest"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"

describe("rateLimit", () => {
  describe("checkRateLimit", () => {
    it("allows requests under the limit", async () => {
      const result = await checkRateLimit("key-under-limit", {
        maxRequests: 3,
        windowMs: 60_000,
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
      expect(result.resetAt).toBeGreaterThan(Date.now())
    })

    it("consumes tokens and eventually denies", async () => {
      const key = "key-exhaust-" + Date.now()
      const config = { maxRequests: 2, windowMs: 60_000 }

      const r1 = await checkRateLimit(key, config)
      expect(r1.allowed).toBe(true)
      expect(r1.remaining).toBe(1)

      const r2 = await checkRateLimit(key, config)
      expect(r2.allowed).toBe(true)
      expect(r2.remaining).toBe(0)

      const r3 = await checkRateLimit(key, config)
      expect(r3.allowed).toBe(false)
      expect(r3.remaining).toBe(0)
    })

    it("uses different keys independently", async () => {
      const config = { maxRequests: 1, windowMs: 60_000 }
      const r1 = await checkRateLimit("key-a", config)
      const r2 = await checkRateLimit("key-b", config)
      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
      expect(r1.remaining).toBe(0)
      expect(r2.remaining).toBe(0)
    })
  })

  describe("RATE_LIMITS", () => {
    it("exports form limit (5 per minute)", () => {
      expect(RATE_LIMITS.form.maxRequests).toBe(5)
      expect(RATE_LIMITS.form.windowMs).toBe(60_000)
    })

    it("exports apiKey limit (10 per minute)", () => {
      expect(RATE_LIMITS.apiKey.maxRequests).toBe(10)
      expect(RATE_LIMITS.apiKey.windowMs).toBe(60_000)
    })

    it("exports events limit (30 per minute)", () => {
      expect(RATE_LIMITS.events.maxRequests).toBe(30)
      expect(RATE_LIMITS.events.windowMs).toBe(60_000)
    })
  })
})
