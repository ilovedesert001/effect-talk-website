"use client"

import { useEffect, useRef } from "react"
import { usePostHog } from "posthog-js/react"

/**
 * Calls posthog.identify when userId is available so session replay and events
 * are associated with the authenticated user. Renders nothing.
 */
export function PostHogIdentify({ userId }: { userId: string | null }) {
  const posthog = usePostHog()
  const identified = useRef<string | null>(null)

  useEffect(() => {
    if (!posthog || !userId || userId === identified.current) return
    posthog.identify(userId)
    identified.current = userId
  }, [posthog, userId])

  return null
}
