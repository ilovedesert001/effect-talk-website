import { Effect } from "effect"
import { getAllLessons, getLessonWithSteps } from "@/services/TourProgress"
import { getCurrentUser } from "@/services/Auth"
import { TourLessonList } from "@/components/tour/TourLessonList"
import { TourStartedTracker } from "@/components/tour/TourStartedTracker"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Effect.ts Tour",
  description: "Learn Effect.ts step by step through interactive lessons.",
})

export const revalidate = 300

export default async function TourPage() {
  const lessons = await Effect.runPromise(
    getAllLessons().pipe(Effect.catchAll(() => Effect.succeed([] as const)))
  )

  const lessonsWithSteps = await Promise.all(
    lessons.map((lesson) =>
      Effect.runPromise(
        getLessonWithSteps(lesson.slug).pipe(
          Effect.catchAll(() => Effect.succeed(null))
        )
      )
    )
  ).then((results) =>
    results.filter((r): r is NonNullable<typeof r> => r !== null)
  )

  const currentUser = await getCurrentUser()

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
          <TourLessonList
            lessons={lessonsWithSteps}
            isLoggedIn={Boolean(currentUser)}
          />
        )}
      </div>
    </>
  )
}
