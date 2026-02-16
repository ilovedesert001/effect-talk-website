/**
 * Unit tests for Email service API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import * as EmailApi from "@/services/Email/api"
import { EmailError } from "@/services/Email/errors"

const mockSend = vi.fn()

vi.mock("@/services/Email/helpers", () => ({
  getResendClient: vi.fn(() => ({
    emails: { send: mockSend },
  })),
}))

describe("Email api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ id: "msg-1" })
  })

  describe("sendWaitlistConfirmation", () => {
    it("sends email and returns void on success", async () => {
      await Effect.runPromise(
        EmailApi.sendWaitlistConfirmation("user@example.com", "playground")
      )
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: expect.stringContaining("waitlist"),
        })
      )
    })

    it("returns EmailError when Resend throws", async () => {
      mockSend.mockRejectedValue(new Error("Resend API error"))
      const result = await Effect.runPromise(
        EmailApi.sendWaitlistConfirmation("user@example.com", "playground").pipe(
          Effect.either
        )
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(EmailError)
        expect(result.left.message).toContain("Resend")
      }
    })
  })

  describe("sendConsultingConfirmation", () => {
    it("sends email and returns void on success", async () => {
      await Effect.runPromise(
        EmailApi.sendConsultingConfirmation("jane@example.com", "Jane")
      )
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "jane@example.com",
          subject: expect.stringContaining("consulting"),
        })
      )
    })

    it("returns EmailError when Resend throws", async () => {
      mockSend.mockRejectedValue(new Error("Network error"))
      const result = await Effect.runPromise(
        EmailApi.sendConsultingConfirmation("jane@example.com", "Jane").pipe(
          Effect.either
        )
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(EmailError)
      }
    })
  })

  describe("EmailError", () => {
    it("is constructible with message", () => {
      const err = new EmailError({ message: "test" })
      expect(err._tag).toBe("EmailError")
      expect(err.message).toBe("test")
    })
  })
})
