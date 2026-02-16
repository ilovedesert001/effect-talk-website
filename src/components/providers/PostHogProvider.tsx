"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (typeof window !== "undefined" && key && host) {
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!key || !host) {
    return <>{children}</>
  }
  return <PHProvider client={posthog}>{children}</PHProvider>
}
