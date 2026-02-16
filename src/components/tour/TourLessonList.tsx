"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { useAllTourProgress } from "@/hooks/useAllTourProgress"
import type { TourLessonWithSteps } from "@/services/TourProgress/types"

const GROUP_ORDER = [
  "Fundamentals",
  "Composition",
  "Concurrency",
  "Data & I/O",
  "Validation",
] as const

function groupLessons(items: TourLessonWithSteps[]): Map<string | null, TourLessonWithSteps[]> {
  const map = new Map<string | null, TourLessonWithSteps[]>()
  for (const lesson of items) {
    const key = lesson.group
    const list = map.get(key) ?? []
    list.push(lesson)
    map.set(key, list)
  }
  return map
}

interface TourLessonListProps {
  readonly lessons: readonly TourLessonWithSteps[]
  readonly isLoggedIn: boolean
}

export function TourLessonList({ lessons, isLoggedIn }: TourLessonListProps) {
  const completedStepIds = useAllTourProgress(isLoggedIn)
  const byGroup = groupLessons([...lessons])

  function isLessonComplete(lesson: TourLessonWithSteps): boolean {
    if (lesson.steps.length === 0) return false
    return lesson.steps.every((step) => completedStepIds.has(step.id))
  }

  // Build a flat, display-ordered list with sequential numbering
  const numberedGroups: { groupName: string; items: { lesson: TourLessonWithSteps; displayIndex: number }[] }[] = []
  let counter = 1
  for (const groupName of GROUP_ORDER) {
    const items = byGroup.get(groupName)
    if (!items || items.length === 0) continue
    const numbered = items.map((lesson) => ({ lesson, displayIndex: counter++ }))
    numberedGroups.push({ groupName, items: numbered })
  }
  const uncategorized = byGroup.get(null) ?? []
  if (uncategorized.length > 0) {
    const numbered = uncategorized.map((lesson) => ({ lesson, displayIndex: counter++ }))
    numberedGroups.push({ groupName: "More", items: numbered })
  }

  return (
    <div className="space-y-10">
      {numberedGroups.map(({ groupName, items }) => (
        <section key={groupName}>
          <h2 className="text-lg font-semibold tracking-tight mb-4 text-muted-foreground">
            {groupName}
          </h2>
          <ol className="space-y-4">
            {items.map(({ lesson, displayIndex }) => {
              const done = isLessonComplete(lesson)
              const stepCount = lesson.steps.length

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/tour/${lesson.slug}`}
                    className="group block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {displayIndex}. {lesson.title}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lesson.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 mt-1">
                        {done && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500 font-medium">
                            <Check className="h-3.5 w-3.5" />
                            Done
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {stepCount} {stepCount === 1 ? "step" : "steps"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
