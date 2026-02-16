/**
 * PostHog service helpers.
 */

import type { AnalyticsEvent } from "@/services/Analytics/types"

export interface PostHogEventPayload {
  readonly eventName: string
  readonly properties: Record<string, unknown>
}

/**
 * Map our AnalyticsEvent union to PostHog event name and properties.
 */
export function analyticsEventToPostHog(event: AnalyticsEvent): PostHogEventPayload {
  const { type, ...rest } = event
  return {
    eventName: type,
    properties: rest as Record<string, unknown>,
  }
}
