import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getSessionUserId } from "@/services/Auth"
import { getUserById } from "@/services/Db"
import { getUserProgress, getStepProgress, upsertStepProgress } from "@/services/TourProgress"
import { formatSchemaErrors } from "@/lib/schema"

const UpdateProgressSchema = Schema.Struct({
  stepId: Schema.String,
  status: Schema.Literal("not_started", "completed", "skipped"),
  feedback: Schema.optional(Schema.String),
})

/**
 * GET /api/tour/progress - Get all progress for the current user.
 */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await Effect.runPromise(
      getUserById(userId).pipe(Effect.catchAll(() => Effect.succeed(null)))
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const progress = await Effect.runPromise(
      getUserProgress(userId).pipe(Effect.catchAll(() => Effect.succeed([] as const)))
    )

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Get progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

/**
 * POST /api/tour/progress - Update progress for a single step.
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

  const decoded = Schema.decodeUnknownEither(UpdateProgressSchema)(body)
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

    const updated = await Effect.runPromise(
      upsertStepProgress(userId, decoded.right.stepId, decoded.right.status, decoded.right.feedback).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    if (!updated) {
      return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
    }

    return NextResponse.json({ success: true, progress: updated })
  } catch (error) {
    console.error("Update progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
