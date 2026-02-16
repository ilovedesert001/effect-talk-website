/**
 * Unit tests for Auth service API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import * as AuthApi from "@/services/Auth/api"

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: vi.fn(),
}))

vi.mock("@/services/Db/api", () => ({
  getUserById: vi.fn(),
  getUserByWorkosId: vi.fn(),
}))

describe("Auth api", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  describe("isWorkOSConfigured", () => {
    it("returns false when WORKOS_API_KEY is missing", () => {
      process.env.WORKOS_API_KEY = ""
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      expect(AuthApi.isWorkOSConfigured()).toBe(false)
    })

    it("returns false when WORKOS_CLIENT_ID is missing", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = ""
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      expect(AuthApi.isWorkOSConfigured()).toBe(false)
    })

    it("returns false when redirect URI contains placeholder", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = "http://xxx/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      expect(AuthApi.isWorkOSConfigured()).toBe(false)
    })

    it("returns false when WORKOS_COOKIE_PASSWORD is shorter than 32 chars", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "short"
      expect(AuthApi.isWorkOSConfigured()).toBe(false)
    })

    it("returns true when all required vars are set and valid", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      expect(AuthApi.isWorkOSConfigured()).toBe(true)
    })
  })

  describe("clearSessionCookie", () => {
    it("calls cookieStore.delete with SESSION_COOKIE", async () => {
      const mockDelete = vi.fn()
      const { cookies } = await import("next/headers")
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn(),
        set: vi.fn(),
        delete: mockDelete,
      } as unknown as Awaited<ReturnType<typeof cookies>>)
      await AuthApi.clearSessionCookie()
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe("getSessionUserId", () => {
    it("returns null when no session cookie", async () => {
      const { cookies } = await import("next/headers")
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as Awaited<ReturnType<typeof cookies>>)
      const result = await AuthApi.getSessionUserId()
      expect(result).toBe(null)
    })

    it("returns null when secret is too short", async () => {
      process.env.WORKOS_COOKIE_PASSWORD = "short"
      const { cookies } = await import("next/headers")
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "some-signed-value" }),
      } as unknown as Awaited<ReturnType<typeof cookies>>)
      const result = await AuthApi.getSessionUserId()
      expect(result).toBe(null)
    })
  })

  describe("setSessionCookie", () => {
    it("does not set cookie when secret is missing (production warn)", async () => {
      process.env.APP_ENV = "production"
      process.env.WORKOS_COOKIE_PASSWORD = ""
      const mockSet = vi.fn()
      const { cookies } = await import("next/headers")
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn(),
        set: mockSet,
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>)
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      await AuthApi.setSessionCookie("user-123")
      expect(mockSet).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("session cookie secret")
      )
      warnSpy.mockRestore()
    })
  })

  describe("getCurrentUser", () => {
    it("returns null when WorkOS not configured", async () => {
      process.env.WORKOS_API_KEY = ""
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const user = await AuthApi.getCurrentUser()
      expect(user).toBe(null)
      warnSpy.mockRestore()
    })

    it("returns null when WorkOS session has no user", async () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      const { withAuth } = await import("@workos-inc/authkit-nextjs")
      vi.mocked(withAuth).mockResolvedValue({ user: null } as Awaited<ReturnType<typeof withAuth>>)
      const user = await AuthApi.getCurrentUser()
      expect(user).toBe(null)
    })

    it("returns null when DB lookup fails for WorkOS user", async () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      const { withAuth } = await import("@workos-inc/authkit-nextjs")
      vi.mocked(withAuth).mockResolvedValue({
        user: { id: "workos-1", email: "u@example.com" },
      } as Awaited<ReturnType<typeof withAuth>>)
      const { getUserByWorkosId } = await import("@/services/Db/api")
      vi.mocked(getUserByWorkosId).mockReturnValue(
        Effect.fail(new (await import("@/services/Db/errors")).DbError({ message: "db down" }))
      )
      const user = await AuthApi.getCurrentUser()
      expect(user).toBe(null)
    })

    it("uses session cookie fallback when withAuth throws middleware error", async () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      const { withAuth } = await import("@workos-inc/authkit-nextjs")
      vi.mocked(withAuth).mockRejectedValue(
        new Error("isn't covered by the AuthKit middleware")
      )
      const { cookies } = await import("next/headers")
      const secret = "a".repeat(32)
      process.env.WORKOS_COOKIE_PASSWORD = secret
      const { createHmac } = await import("node:crypto")
      const value = "user-db-uuid-123"
      const sig = createHmac("sha256", secret).update(value).digest("base64url")
      const signed = `${value}.${sig}`
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: signed }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>)
      const { getUserById } = await import("@/services/Db/api")
      const mockUser = {
        id: "user-db-uuid-123",
        workos_id: "w1",
        email: "u@example.com",
        name: null,
        avatar_url: null,
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      vi.mocked(getUserById).mockReturnValue(Effect.succeed(mockUser))
      const user = await AuthApi.getCurrentUser()
      expect(user).toEqual(mockUser)
    })
  })

  describe("requireAuth", () => {
    it("redirects to sign-in when user is null", async () => {
      process.env.WORKOS_API_KEY = ""
      const { redirect } = await import("next/navigation")
      await AuthApi.requireAuth()
      expect(redirect).toHaveBeenCalledWith("/auth/sign-in")
    })
  })
})
