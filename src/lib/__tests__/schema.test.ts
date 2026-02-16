/**
 * Unit tests for schema validation helpers.
 */

import { describe, it, expect } from "vitest"
import { Schema } from "effect"
import { formatSchemaErrors } from "@/lib/schema"

const TestSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  count: Schema.Number.pipe(Schema.int(), Schema.positive()),
})

describe("formatSchemaErrors", () => {
  it("formats a parse error into path and message array", () => {
    const result = Schema.decodeUnknownEither(TestSchema)({ name: "", count: 0 })
    if (result._tag === "Right") {
      expect.fail("Expected Left")
    }
    const formatted = formatSchemaErrors(result.left)
    expect(Array.isArray(formatted)).toBe(true)
    expect(formatted.length).toBeGreaterThan(0)
    for (const issue of formatted) {
      expect(issue).toHaveProperty("message")
      expect(issue).toHaveProperty("path")
      expect(Array.isArray(issue.path)).toBe(true)
    }
  })

  it("formats multiple errors", () => {
    const result = Schema.decodeUnknownEither(TestSchema)({ count: -1 })
    if (result._tag === "Right") {
      expect.fail("Expected Left")
    }
    const formatted = formatSchemaErrors(result.left)
    expect(formatted.length).toBeGreaterThanOrEqual(1)
  })
})
