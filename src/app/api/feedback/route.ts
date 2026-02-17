import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { insertFeedback } from "@/services/Db"
import { sendFeedbackNotification } from "@/services/Email"
import { trackEvent } from "@/services/Analytics"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"
import { formatSchemaErrors } from "@/lib/schema"
import { FeedbackSchema } from "@/app/api/feedback/schema"

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
  const rateCheck = await checkRateLimit(`feedback:${ip}`, RATE_LIMITS.form)
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMITS.form.maxRequests),
    "X-RateLimit-Remaining": String(rateCheck.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateCheck.resetAt / 1000)),
  }
  if (!rateCheck.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateCheck.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
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

  const decoded = Schema.decodeUnknownEither(FeedbackSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  const { name, email, message } = decoded.right

  try {
    await Effect.runPromise(
      insertFeedback({ name: name ?? undefined, email, message })
    )

    Effect.runPromise(
      sendFeedbackNotification({
        name: name ?? null,
        email,
        message,
      }).pipe(
        Effect.catchAll((e) => Effect.logWarning(`Email send failed: ${e.message}`))
      )
    ).catch(() => {})

    Effect.runPromise(trackEvent({ type: "feedback_submitted" })).catch(() => {})

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders })
  } catch (error) {
    console.error("Feedback submission error:", error)
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again." },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
