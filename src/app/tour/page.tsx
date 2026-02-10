import { Effect } from "effect"
import Link from "next/link"
import { getAllLessons, getLessonWithSteps } from "@/services/TourProgress"
import { TourStartedTracker } from "@/components/tour/TourStartedTracker"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Effect.ts Tour",
  description: "Learn Effect.ts step by step through interactive lessons.",
})

export const revalidate = 300

const GROUP_ORDER = [
  "Fundamentals",
  "Composition",
  "Concurrency",
  "Data & I/O",
  "Validation",
] as const

function groupLessons<T extends { lesson: { group: string | null } }>(
  items: T[]
): Map<string | null, T[]> {
  const map = new Map<string | null, T[]>()
  for (const item of items) {
    const key = item.lesson.group
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return map
}

export default async function TourPage() {
  const lessons = await Effect.runPromise(
    getAllLessons().pipe(Effect.catchAll(() => Effect.succeed([] as const)))
  )

  // Fetch step counts for each lesson
  const lessonsWithCounts = await Promise.all(
    lessons.map(async (lesson) => {
      const full = await Effect.runPromise(
        getLessonWithSteps(lesson.slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
      )
      return { lesson, stepCount: full?.steps.length ?? 0 }
    })
  )

  const byGroup = groupLessons(lessonsWithCounts)

  return (
    <>
      <TourStartedTracker />
      <div className="container px-4 md:px-6 py-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Effect.ts Tour</h1>
        <p className="text-muted-foreground mb-8">
          Learn Effect.ts step by step. Each lesson covers a core concept with
          code examples you can try in the browser.
        </p>

        {lessons.length === 0 ? (
          <p className="text-muted-foreground">No lessons available yet. Check back soon!</p>
        ) : (
          <div className="space-y-10">
            {GROUP_ORDER.map((groupName) => {
              const items = byGroup.get(groupName)
              if (!items || items.length === 0) return null

              return (
                <section key={groupName}>
                  <h2 className="text-lg font-semibold tracking-tight mb-4 text-muted-foreground">
                    {groupName}
                  </h2>
                  <ol className="space-y-4">
                    {items.map(({ lesson, stepCount }) => (
                      <li key={lesson.id}>
                        <Link
                          href={`/tour/${lesson.slug}`}
                          className="group block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="font-medium group-hover:text-primary transition-colors">
                                {lesson.order_index}. {lesson.title}
                              </span>
                              <p className="text-sm text-muted-foreground mt-1">
                                {lesson.description}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                              {stepCount} {stepCount === 1 ? "step" : "steps"}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )
            })}
            {/* Uncategorized lessons */}
            {(() => {
              const uncategorized = byGroup.get(null) ?? []
              if (uncategorized.length === 0) return null

              return (
                <section>
                  <h2 className="text-lg font-semibold tracking-tight mb-4 text-muted-foreground">
                    More
                  </h2>
                  <ol className="space-y-4">
                    {uncategorized.map(({ lesson, stepCount }) => (
                      <li key={lesson.id}>
                        <Link
                          href={`/tour/${lesson.slug}`}
                          className="group block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="font-medium group-hover:text-primary transition-colors">
                                {lesson.order_index}. {lesson.title}
                              </span>
                              <p className="text-sm text-muted-foreground mt-1">
                                {lesson.description}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                              {stepCount} {stepCount === 1 ? "step" : "steps"}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )
            })()}
          </div>
        )}
      </div>
    </>
  )
}
