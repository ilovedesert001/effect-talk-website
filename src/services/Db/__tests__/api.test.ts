/**
 * Unit tests for Db service API (patterns, rules, search, analytics).
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import * as DbApi from "@/services/Db/api"

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

function chainMock<T>(resolved: T) {
  const rows = Array.isArray(resolved) ? resolved : [resolved]
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
      orderBy: vi.fn().mockResolvedValue(rows),
    }),
  }
}

describe("Db api", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { db } = await import("@/db/client")
    vi.mocked(db.select).mockReturnValue(chainMock([]) as never)
  })

  describe("getAllPatterns", () => {
    it("returns mapped patterns from db", async () => {
      const createdAt = new Date()
      const updatedAt = new Date()
      const patternRows = [
        {
          id: "pattern-1",
          title: "Pattern One",
          summary: "Summary one",
          content: "Content one",
          category: "cat",
          difficulty: "easy",
          tags: ["a", "b"],
          releaseVersion: "0.12.0",
          createdAt,
          updatedAt,
        },
      ]
      const { db } = await import("@/db/client")
      vi.mocked(db.select).mockReturnValue(
        chainMock(patternRows) as never
      )
      const result = await Effect.runPromise(DbApi.getAllPatterns())
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("pattern-1")
      expect(result[0].title).toBe("Pattern One")
      expect(result[0].description).toBe("Summary one")
      expect(result[0].new).toBe(true)
    })
  })

  describe("getPatternById", () => {
    it("returns null when not found", async () => {
      const { db } = await import("@/db/client")
      vi.mocked(db.select).mockReturnValue(
        chainMock([]) as never
      )
      const result = await Effect.runPromise(DbApi.getPatternById("missing"))
      expect(result).toBe(null)
    })

    it("returns mapped pattern when found", async () => {
      const createdAt = new Date()
      const updatedAt = new Date()
      const row = {
        id: "p-1",
        title: "T",
        summary: "S",
        content: "C",
        category: null,
        difficulty: null,
        tags: null,
        releaseVersion: "0.10.0",
        createdAt,
        updatedAt,
      }
      const { db } = await import("@/db/client")
      vi.mocked(db.select).mockReturnValue(chainMock(row) as never)
      const result = await Effect.runPromise(DbApi.getPatternById("p-1"))
      expect(result).not.toBe(null)
      expect(result?.id).toBe("p-1")
      expect(result?.new).toBe(false)
    })
  })

  describe("getAllRules", () => {
    it("returns mapped rules from db", async () => {
      const createdAt = new Date()
      const updatedAt = new Date()
      const ruleRows = [
        {
          id: "rule-1",
          title: "Rule One",
          description: "Desc",
          content: "Content",
          category: null,
          severity: null,
          tags: null,
          createdAt,
          updatedAt,
        },
      ]
      const { db } = await import("@/db/client")
      vi.mocked(db.select).mockReturnValue(chainMock(ruleRows) as never)
      const result = await Effect.runPromise(DbApi.getAllRules())
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("rule-1")
      expect(result[0].title).toBe("Rule One")
    })
  })

  describe("getRuleById", () => {
    it("returns null when not found", async () => {
      const { db } = await import("@/db/client")
      vi.mocked(db.select).mockReturnValue(chainMock([]) as never)
      const result = await Effect.runPromise(DbApi.getRuleById("missing"))
      expect(result).toBe(null)
    })
  })

  describe("searchPatternsAndRules", () => {
    it("returns patterns and rules matching query", async () => {
      const createdAt = new Date()
      const updatedAt = new Date()
      const patternRow = {
        id: "p1",
        title: "Test",
        summary: "S",
        content: "C",
        category: null,
        difficulty: null,
        tags: null,
        releaseVersion: null,
        createdAt,
        updatedAt,
      }
      const ruleRow = {
        id: "r1",
        title: "Rule",
        description: "D",
        content: "C",
        category: null,
        severity: null,
        tags: null,
        createdAt,
        updatedAt,
      }
      const { db } = await import("@/db/client")
      let callCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        callCount++
        if (callCount === 1) return chainMock([patternRow]) as never
        return chainMock([ruleRow]) as never
      })
      const result = await Effect.runPromise(DbApi.searchPatternsAndRules("test"))
      expect(result.patterns).toHaveLength(1)
      expect(result.rules).toHaveLength(1)
      expect(result.patterns[0].title).toBe("Test")
      expect(result.rules[0].title).toBe("Rule")
    })
  })

  describe("insertAnalyticsEvent", () => {
    it("inserts event and returns void", async () => {
      const { db } = await import("@/db/client")
      const mockInsert = {
        values: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(db.insert).mockReturnValue(mockInsert as never)
      await Effect.runPromise(
        DbApi.insertAnalyticsEvent("waitlist_submitted", { source: "playground" })
      )
      expect(db.insert).toHaveBeenCalled()
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "waitlist_submitted", payload: { source: "playground" } })
      )
    })
  })
})
