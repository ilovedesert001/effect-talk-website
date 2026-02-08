import { Effect } from "effect"
import { PatternsBrowser } from "@/components/PatternsBrowser"
import { fetchPatterns } from "@/services/BackendApi"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Effect.ts Patterns",
  description: "Browse 200+ production-ready Effect.ts patterns — searchable, categorized, and battle-tested.",
})

/**
 * Revalidate patterns index every 5 minutes.
 */
export const revalidate = 300

export default async function PatternsPage() {
  const patterns = await Effect.runPromise(
    fetchPatterns().pipe(
      Effect.catchAll(() => Effect.succeed([] as const))
    )
  )

  return (
    <div className="container px-4 md:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Patterns</h1>
        <p className="text-muted-foreground mt-1">
          {patterns.length} production-ready Effect.ts patterns
        </p>
      </div>
      <PatternsBrowser patterns={patterns} />
    </div>
  )
}
