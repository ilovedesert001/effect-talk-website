"use client"

import { useEffect, useRef } from "react"
import { trackEventClient } from "@/lib/analytics-client"

/**
 * Client component that tracks when a user first visits the tour index page.
 * Uses a ref to ensure it only tracks once per page load.
 */
export function TourStartedTracker() {
  const hasTracked = useRef(false)

  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true
      trackEventClient({ type: "tour_started" }).catch(() => {
        // Ignore errors
      })
    }
  }, [])

  return null
}
