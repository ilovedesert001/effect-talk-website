import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { trackEvent, type AnalyticsEvent } from "@/services/Analytics"
import {
  PostHogAnalytics,
  analyticsEventToPostHog,
} from "@/services/PostHog"
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
  const rateCheck = await checkRateLimit(`events:${ip}`, RATE_LIMITS.events)
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMITS.events.maxRequests),
    "X-RateLimit-Remaining": String(rateCheck.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateCheck.resetAt / 1000)),
  }
  if (!rateCheck.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateCheck.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      { error: "Rate limited" },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(retryAfterSeconds),
        },
      }
    )
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
      { status: 400, headers: rateLimitHeaders }
    )
  }

  const event = decoded.right as AnalyticsEvent

  const program = Effect.gen(function* () {
    yield* trackEvent(event)
    const posthog = yield* PostHogAnalytics
    const { eventName, properties } = analyticsEventToPostHog(event)
    yield* posthog.capture(eventName, properties)
    yield* posthog.flush()
  }).pipe(Effect.provide(PostHogAnalytics.Default))

  try {
    await Effect.runPromise(program)
    return NextResponse.json({ success: true }, { headers: rateLimitHeaders })
  } catch (error) {
    console.error("Analytics event error:", error)
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
