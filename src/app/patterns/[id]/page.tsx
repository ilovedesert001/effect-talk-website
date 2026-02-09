import { Effect } from "effect"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchPattern, fetchPatternIds } from "@/services/BackendApi"
import { buildMetadata } from "@/lib/seo"
import { ArrowRight } from "lucide-react"
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

export default async function PatternDetailPage({ params }: PatternPageProps) {
  const { id } = await params
  const pattern = await Effect.runPromise(
    fetchPattern(id).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
  )

  if (!pattern) {
    notFound()
  }

  return (
    <div className="container px-4 md:px-6 py-10 max-w-3xl">
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

      {pattern.tags && pattern.tags.length > 0 && (
        <div className="flex gap-1.5 mb-6">
          {pattern.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Pattern content rendered as HTML */}
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Pattern content is stored as HTML from MDX conversion in seed script */}
        <div dangerouslySetInnerHTML={{ __html: pattern.content }} />
      </article>

      {/* Practice in Tour CTA */}
      <div className="mt-8 p-6 rounded-lg border bg-muted/50">
        <h3 className="text-lg font-semibold mb-2">Practice This Pattern</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Want to practice this pattern hands-on? Check out our interactive tour where you can learn Effect.ts
          step-by-step with real code examples.
        </p>
        <Link href="/tour">
          <Button variant="outline">
            Explore the Tour
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
