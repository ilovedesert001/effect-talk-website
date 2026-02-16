/**
 * Unit tests for Analytics service API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import * as AnalyticsApi from "@/services/Analytics/api"

vi.mock("@/db/client", () => ({
  db: {
    insert: vi.fn(),
  },
}))

vi.mock("@/services/Db/api", () => ({
  insertAnalyticsEvent: vi.fn(),
}))

describe("Analytics api", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const DbApi = await import("@/services/Db/api")
    vi.mocked(DbApi.insertAnalyticsEvent).mockReturnValue(
      Effect.succeed(undefined) as ReturnType<typeof DbApi.insertAnalyticsEvent>
    )
  })

  it("trackEvent succeeds when insert succeeds", async () => {
    await Effect.runPromise(
      AnalyticsApi.trackEvent({ type: "waitlist_submitted", source: "playground" })
    )
  })

  it("trackEvent swallows DbError and returns void", async () => {
    const DbApi = await import("@/services/Db/api")
    const { DbError } = await import("@/services/Db/errors")
    vi.mocked(DbApi.insertAnalyticsEvent).mockReturnValue(
      Effect.fail(new DbError({ message: "db down" })) as ReturnType<typeof DbApi.insertAnalyticsEvent>
    )
    const result = await Effect.runPromise(
      AnalyticsApi.trackEvent({ type: "consulting_submitted" })
    )
    expect(result).toBeUndefined()
  })
})
