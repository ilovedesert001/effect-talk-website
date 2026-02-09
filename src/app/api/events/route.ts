import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { trackEvent, type AnalyticsEvent } from "@/services/Analytics"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"
import { formatSchemaErrors } from "@/lib/schema"

const WaitlistSubmittedSchema = Schema.Struct({
  type: Schema.Literal("waitlist_submitted"),
  source: Schema.Literal("playground", "code_review"),
})

const ConsultingSubmittedSchema = Schema.Struct({
  type: Schema.Literal("consulting_submitted"),
})

const TabClickedSchema = Schema.Struct({
  type: Schema.Literal("tab_clicked"),
  tab: Schema.Literal("cli", "mcp", "playground", "code-review"),
})

const SearchPerformedSchema = Schema.Struct({
  type: Schema.Literal("search_performed"),
  queryLength: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  patternCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  ruleCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  pageCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
})

const TourStartedSchema = Schema.Struct({
  type: Schema.Literal("tour_started"),
})

const LessonStartedSchema = Schema.Struct({
  type: Schema.Literal("lesson_started"),
  lessonSlug: Schema.String,
})

const StepCompletedSchema = Schema.Struct({
  type: Schema.Literal("step_completed"),
  lessonSlug: Schema.String,
  stepId: Schema.String,
})

const LessonCompletedSchema = Schema.Struct({
  type: Schema.Literal("lesson_completed"),
  lessonSlug: Schema.String,
})

const EventSchema = Schema.Union(
  WaitlistSubmittedSchema,
  ConsultingSubmittedSchema,
  TabClickedSchema,
  SearchPerformedSchema,
  TourStartedSchema,
  LessonStartedSchema,
  StepCompletedSchema,
  LessonCompletedSchema
)

/**
 * POST /api/events - Track an analytics event.
 */
export async function POST(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
  const rateCheck = checkRateLimit(`events:${ip}`, RATE_LIMITS.events)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const decoded = Schema.decodeUnknownEither(EventSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Invalid event", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    await Effect.runPromise(trackEvent(decoded.right as AnalyticsEvent))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Analytics event error:", error)
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 })
  }
}
