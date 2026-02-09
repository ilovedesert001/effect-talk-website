import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getSessionUserId } from "@/services/Auth"
import { getUserById } from "@/services/Db"
import { bulkUpsertProgress, type TourProgressStatus } from "@/services/TourProgress"
import { formatSchemaErrors } from "@/lib/schema"

const BulkSyncSchema = Schema.Struct({
  progress: Schema.Array(
    Schema.Struct({
      stepId: Schema.String,
      status: Schema.Literal("not_started", "completed", "skipped"),
    })
  ),
})

/**
 * POST /api/tour/progress/sync - Bulk sync progress from localStorage (guest to sovereign).
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const decoded = Schema.decodeUnknownEither(BulkSyncSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    const user = await Effect.runPromise(
      getUserById(userId).pipe(Effect.catchAll(() => Effect.succeed(null)))
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const synced = await Effect.runPromise(
      bulkUpsertProgress(
        userId,
        decoded.right.progress.map((p) => ({
          stepId: p.stepId,
          status: p.status as TourProgressStatus,
        }))
      ).pipe(Effect.catchAll(() => Effect.succeed([] as const)))
    )

    return NextResponse.json({ success: true, progress: synced })
  } catch (error) {
    console.error("Sync progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
