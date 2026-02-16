/**
 * Unit tests for Email helpers.
 */

import { describe, it, expect } from "vitest"
import { getResendClient } from "@/services/Email/helpers"

describe("Email helpers", () => {
  describe("getResendClient", () => {
    it("returns a client with emails.send", () => {
      const client = getResendClient()
      expect(client).toBeDefined()
      expect(client.emails).toBeDefined()
      expect(typeof client.emails.send).toBe("function")
    })
  })
})
