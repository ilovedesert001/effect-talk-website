/**
 * PostHog analytics Effect.Service.
 * Server-side capture and identify via posthog-node; NoOp for tests or when env is unset.
 */

import { Effect, Layer } from "effect"
import { PostHogError } from "@/services/PostHog/types"

const SERVER_DISTINCT_ID = "server"

export interface PostHogAnalyticsService {
  readonly capture: (
    event: string,
    properties?: Record<string, unknown>,
    distinctId?: string
  ) => Effect.Effect<void, PostHogError>
  readonly identify: (
    distinctId: string,
    traits?: Record<string, unknown>
  ) => Effect.Effect<void, PostHogError>
  readonly flush: () => Effect.Effect<void, PostHogError>
}

const noOpImpl: PostHogAnalyticsService = {
  capture: () => Effect.void,
  identify: () => Effect.void,
  flush: () => Effect.void,
}

export class PostHogAnalytics extends Effect.Service<PostHogAnalyticsService>()(
  "PostHogAnalytics",
  {
    effect: Effect.gen(function* () {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
      if (!key || !host) {
        return noOpImpl
      }
      const { PostHog } = yield* Effect.tryPromise({
        try: () => import("posthog-node"),
        catch: (e) => new PostHogError({ message: String(e), cause: e }),
      })
      const client = new PostHog(key, {
        host,
        flushAt: 1,
        flushInterval: 0,
      })
      return {
        capture: (event: string, properties?: Record<string, unknown>, distinctId?: string) =>
          Effect.tryPromise({
            try: () =>
              Promise.resolve(
                client.capture({
                  distinctId: distinctId ?? SERVER_DISTINCT_ID,
                  event,
                  properties: properties ?? {},
                })
              ),
            catch: (e) => new PostHogError({ message: String(e), cause: e }),
          }).pipe(Effect.catchAll(() => Effect.void)),

        identify: (distinctId: string, traits?: Record<string, unknown>) =>
          Effect.tryPromise({
            try: () =>
              Promise.resolve(
                client.identify({
                  distinctId,
                  properties: traits ?? {},
                })
              ),
            catch: (e) => new PostHogError({ message: String(e), cause: e }),
          }).pipe(Effect.catchAll(() => Effect.void)),

        flush: () =>
          Effect.tryPromise({
            try: () => client.flush(),
            catch: (e) => new PostHogError({ message: String(e), cause: e }),
          }).pipe(Effect.catchAll(() => Effect.void)),
      } satisfies PostHogAnalyticsService
    }),
  }
) {}

/** No-op implementation for tests. */
export const PostHogAnalyticsNoOp = Layer.succeed(PostHogAnalytics, noOpImpl)
