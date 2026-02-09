import { Effect } from "effect"
import { notFound } from "next/navigation"
import { getLessonWithSteps } from "@/services/TourProgress"
import { TourLessonView } from "@/components/tour/TourLessonView"
import { buildMetadata } from "@/lib/seo"
import type { Metadata } from "next"

/**
 * ISR: revalidate lesson pages every 5 minutes.
 */
export const revalidate = 300

interface LessonPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { slug } = await params
  const lesson = await Effect.runPromise(
    getLessonWithSteps(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  )

  if (!lesson) {
    return buildMetadata({ title: "Lesson Not Found" })
  }

  return buildMetadata({
    title: lesson.title,
    description: lesson.description,
  })
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params

  const lesson = await Effect.runPromise(
    getLessonWithSteps(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  )

  if (!lesson) {
    notFound()
  }

  return <TourLessonView lesson={lesson} />
}
