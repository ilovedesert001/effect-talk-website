"use client"

import { useEffect, useState } from "react"
import { getLocalStorageProgress, syncProgressToDB } from "@/lib/tourProgressSync"

interface TourProgressApiItem {
  readonly step_id: string
  readonly status: "not_started" | "completed" | "skipped"
}

/**
 * Loads all completed step IDs for the tour list page.
 * Used to show "Done" badges on lessons where every step is completed.
 */
export function useAllTourProgress(isLoggedIn: boolean): ReadonlySet<string> {
  const [completedStepIds, setCompletedStepIds] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let isCancelled = false

    async function loadProgress(): Promise<void> {
      if (!isLoggedIn) {
        const local = getLocalStorageProgress()
        const completed = new Set<string>()
        for (const [stepId, status] of Object.entries(local)) {
          if (status === "completed") {
            completed.add(stepId)
          }
        }
        if (!isCancelled) {
          setCompletedStepIds(completed)
        }
        return
      }

      await syncProgressToDB()

      const response = await fetch("/api/tour/progress", { method: "GET" })
      if (!response.ok) {
        if (!isCancelled) {
          setCompletedStepIds(new Set())
        }
        return
      }

      const payload = await response.json() as {
        readonly progress?: readonly TourProgressApiItem[]
      }

      const completed = new Set<string>()
      for (const item of payload.progress ?? []) {
        if (item.status === "completed") {
          completed.add(item.step_id)
        }
      }

      if (!isCancelled) {
        setCompletedStepIds(completed)
      }
    }

    loadProgress().catch(() => {
      if (!isCancelled) {
        setCompletedStepIds(new Set())
      }
    })

    return () => {
      isCancelled = true
    }
  }, [isLoggedIn])

  return completedStepIds
}
