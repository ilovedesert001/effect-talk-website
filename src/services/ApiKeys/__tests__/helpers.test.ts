/**
 * Unit tests for ApiKeys service helpers.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { hashToken, generateToken } from "@/services/ApiKeys/helpers"

describe("ApiKeys helpers", () => {
  const originalPepper = process.env.API_KEY_PEPPER
  const originalAppEnv = process.env.APP_ENV

  beforeEach(() => {
    process.env.API_KEY_PEPPER = "test-pepper"
    process.env.APP_ENV = "local"
  })

  afterEach(() => {
    process.env.API_KEY_PEPPER = originalPepper
    process.env.APP_ENV = originalAppEnv
  })

  describe("generateToken", () => {
    it("should generate token with correct format", () => {
      const token = generateToken()

      expect(token).toMatch(/^ek_[a-f0-9]{40}$/)
      expect(token.length).toBe(43) // "ek_" + 40 hex chars
    })

    it("should generate unique tokens", () => {
      const token1 = generateToken()
      const token2 = generateToken()

      expect(token1).not.toBe(token2)
    })
  })

  describe("hashToken", () => {
    it("should hash token consistently", () => {
      const token = "ek_test123456789012345678901234567890"
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 produces 64 hex chars
    })

    it("should produce different hashes for different tokens", () => {
      const token1 = "ek_test123456789012345678901234567890"
      const token2 = "ek_different1234567890123456789012345"

      const hash1 = hashToken(token1)
      const hash2 = hashToken(token2)

      expect(hash1).not.toBe(hash2)
    })

    it("should use pepper in hash", () => {
      const token = "ek_test123456789012345678901234567890"
      process.env.API_KEY_PEPPER = "pepper1"
      const hash1 = hashToken(token)

      process.env.API_KEY_PEPPER = "pepper2"
      const hash2 = hashToken(token)

      expect(hash1).not.toBe(hash2)
    })

    it("should use default pepper when env var not set", () => {
      delete process.env.API_KEY_PEPPER
      const token = "ek_test123456789012345678901234567890"
      const hash = hashToken(token)

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it("throws in production when pepper is default or missing", () => {
      process.env.APP_ENV = "production"
      process.env.API_KEY_PEPPER = "default-pepper-change-me"
      expect(() => hashToken("ek_test123456789012345678901234567890")).toThrow(
        /API_KEY_PEPPER must be set/
      )

      process.env.API_KEY_PEPPER = ""
      expect(() => hashToken("ek_test123456789012345678901234567890")).toThrow(
        /API_KEY_PEPPER must be set/
      )
    })
  })
})
