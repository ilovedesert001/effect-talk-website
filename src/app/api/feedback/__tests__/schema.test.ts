/**
 * Unit tests for feedback request schema validation.
 */

import { describe, it, expect } from "vitest"
import { Schema, Either } from "effect"
import { FeedbackSchema } from "@/app/api/feedback/schema"

describe("FeedbackSchema", () => {
  it("decodes valid payload with name, email, and message", () => {
    const payload = {
      name: "Jane",
      email: "jane@example.com",
      message: "This is at least ten characters of feedback.",
    }
    const result = Schema.decodeUnknownEither(FeedbackSchema)(payload)
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).toEqual(payload)
    }
  })

  it("decodes valid payload without name", () => {
    const payload = {
      email: "anon@example.com",
      message: "Anonymous feedback that is long enough.",
    }
    const result = Schema.decodeUnknownEither(FeedbackSchema)(payload)
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.email).toBe("anon@example.com")
      expect(result.right.message).toBe("Anonymous feedback that is long enough.")
      expect(result.right.name).toBeUndefined()
    }
  })

  it("rejects invalid email", () => {
    const payload = {
      email: "not-an-email",
      message: "Message that is long enough to pass.",
    }
    const result = Schema.decodeUnknownEither(FeedbackSchema)(payload)
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects message shorter than 10 characters", () => {
    const payload = {
      email: "user@example.com",
      message: "short",
    }
    const result = Schema.decodeUnknownEither(FeedbackSchema)(payload)
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects empty message", () => {
    const payload = {
      email: "user@example.com",
      message: "",
    }
    const result = Schema.decodeUnknownEither(FeedbackSchema)(payload)
    expect(Either.isLeft(result)).toBe(true)
  })
})
