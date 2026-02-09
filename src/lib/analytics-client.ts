/**
 * Client-side analytics helper.
 * Calls the /api/events route instead of importing database code.
 */

export async function trackEventClient(event: {
  type: string
  [key: string]: unknown
}): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    })
  } catch {
    // Ignore errors - analytics should never break the app
  }
}
