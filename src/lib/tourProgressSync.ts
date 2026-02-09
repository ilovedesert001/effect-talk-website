/**
 * Utility functions for syncing tour progress between localStorage (guest) and DB (sovereign).
 */

const PROGRESS_STORAGE_KEY = "tour_progress"

export interface LocalStorageProgress {
  readonly [stepId: string]: "completed" | "skipped"
}

/**
 * Get progress from localStorage (for guests).
 */
export function getLocalStorageProgress(): LocalStorageProgress {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as LocalStorageProgress
  } catch {
    return {}
  }
}

/**
 * Clear progress from localStorage (after syncing to DB).
 */
export function clearLocalStorageProgress(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

/**
 * Sync localStorage progress to DB (called when guest signs in).
 */
export async function syncProgressToDB(): Promise<void> {
  const localProgress = getLocalStorageProgress()
  if (Object.keys(localProgress).length === 0) return

  try {
    const response = await fetch("/api/tour/progress/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress: Object.entries(localProgress).map(([stepId, status]) => ({
          stepId,
          status,
        })),
      }),
    })

    if (response.ok) {
      clearLocalStorageProgress()
    }
  } catch (error) {
    console.error("Failed to sync progress:", error)
  }
}
