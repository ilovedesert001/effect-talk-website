/**
 * PostHog analytics service types.
 */

import { Data } from "effect"

export class PostHogError extends Data.TaggedError("PostHogError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export interface PostHogConfig {
  readonly apiKey: string
  readonly host: string
}
