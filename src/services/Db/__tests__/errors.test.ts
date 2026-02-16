/**
 * Unit tests for Db error types.
 */

import { describe, it, expect } from "vitest"
import { DbError } from "@/services/Db/errors"

describe("DbError", () => {
  it("is constructible with message", () => {
    const err = new DbError({ message: "Connection failed" })
    expect(err._tag).toBe("DbError")
    expect(err.message).toBe("Connection failed")
  })

  it("accepts optional cause", () => {
    const cause = new Error("underlying")
    const err = new DbError({ message: "Wrapped", cause })
    expect(err.cause).toBe(cause)
  })
})
