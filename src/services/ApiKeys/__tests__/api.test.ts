/**
 * Unit tests for ApiKeys service API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import * as ApiKeysApi from "@/services/ApiKeys/api"
import { ApiKeyError } from "@/services/ApiKeys/errors"
import { hashToken } from "@/services/ApiKeys/helpers"

vi.mock("@/db/client", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}))

describe("ApiKeys api", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.API_KEY_PEPPER = "test-pepper"
    const { db } = await import("@/db/client")
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    } as never)
  })

  describe("verifyApiKey", () => {
    it("returns true when token matches stored hash", () => {
      const token = "ek_" + "a".repeat(40)
      const storedHash = hashToken(token)
      expect(ApiKeysApi.verifyApiKey(token, storedHash)).toBe(true)
    })

    it("returns false when token does not match stored hash", () => {
      const token = "ek_" + "a".repeat(40)
      const wrongHash = hashToken("ek_" + "b".repeat(40))
      expect(ApiKeysApi.verifyApiKey(token, wrongHash)).toBe(false)
    })
  })

  describe("error paths", () => {
    it("createApiKey returns ApiKeyError when insert fails", async () => {
      const { db } = await import("@/db/client")
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error("DB error")),
      } as never)
      const result = await Effect.runPromise(
        ApiKeysApi.createApiKey("user-1", "Key").pipe(Effect.either)
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") expect(result.left).toBeInstanceOf(ApiKeyError)
    })

    it("listUserApiKeys returns ApiKeyError when listApiKeys fails", async () => {
      const { db } = await import("@/db/client")
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error("DB error")),
          }),
        }),
      } as never)
      const result = await Effect.runPromise(
        ApiKeysApi.listUserApiKeys("user-1").pipe(Effect.either)
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") expect(result.left).toBeInstanceOf(ApiKeyError)
    })

    it("revokeUserApiKey returns ApiKeyError when revoke fails", async () => {
      const { db } = await import("@/db/client")
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error("DB error")),
      } as never)
      const result = await Effect.runPromise(
        ApiKeysApi.revokeUserApiKey("key-1", "user-1").pipe(Effect.either)
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") expect(result.left).toBeInstanceOf(ApiKeyError)
    })
  })

  describe("ApiKeyError", () => {
    it("is constructible with message", () => {
      const err = new ApiKeyError({ message: "test" })
      expect(err._tag).toBe("ApiKeyError")
      expect(err.message).toBe("test")
    })
  })
})
