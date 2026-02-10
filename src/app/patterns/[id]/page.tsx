import { Effect } from "effect"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PatternContent } from "@/components/PatternContent"
import { fetchPattern, fetchPatternIds } from "@/services/BackendApi"
import { buildMetadata } from "@/lib/seo"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

/**
 * ISR: revalidate pattern detail pages every 5 minutes.
 */
export const revalidate = 300

/**
 * Pre-generate static params from the backend API.
 * Falls back gracefully if the backend is unreachable during build.
 */
export async function generateStaticParams() {
  const ids = await Effect.runPromise(
    fetchPatternIds().pipe(
      Effect.catchAll(() => Effect.succeed([] as readonly string[]))
    )
  )
  return ids.map((id) => ({ id }))
}

interface PatternPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; step?: string }>
}

export async function generateMetadata({ params }: PatternPageProps): Promise<Metadata> {
  const { id } = await params
  const pattern = await Effect.runPromise(
    fetchPattern(id).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
  )

  if (!pattern) {
    return buildMetadata({ title: "Pattern Not Found" })
  }

  return buildMetadata({
    title: pattern.title,
    description: pattern.description,
  })
}

export default async function PatternDetailPage({ params, searchParams }: PatternPageProps) {
  const { id } = await params
  const { from: lessonSlug, step: stepParam } = await searchParams
  const pattern = await Effect.runPromise(
    fetchPattern(id).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
  )

  if (!pattern) {
    notFound()
  }

  const backHref =
    lessonSlug && stepParam
      ? `/tour/${lessonSlug}?step=${stepParam}`
      : lessonSlug
        ? `/tour/${lessonSlug}`
        : "/tour"

  return (
    <div className="container px-4 md:px-6 py-10 max-w-3xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Tour
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {pattern.category && (
            <Badge variant="secondary">{pattern.category}</Badge>
          )}
          {pattern.difficulty && (
            <Badge variant="outline">{pattern.difficulty}</Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{pattern.title}</h1>
        <p className="text-muted-foreground mt-2">{pattern.description}</p>
      </div>

      {/* Pattern content with syntax-highlighted code blocks */}
      <PatternContent html={pattern.content} />
    </div>
  )
}
