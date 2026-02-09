import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowRight, BookOpen, Terminal, Cpu, MessageSquare, GraduationCap } from "lucide-react"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  description:
    "Production-ready Effect.ts patterns, tools, and consulting for TypeScript teams. Browse 200+ patterns and rules.",
})

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="container px-4 md:px-6 py-16 md:py-24 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
          Master Effect.ts with
          <span className="text-primary"> production-ready patterns</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Browse 200+ curated patterns and rules. Use the CLI. Connect your AI
          assistant. Get expert consulting.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button size="lg" asChild>
            <Link href="/patterns">
              Browse Patterns
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/tour">
              Start Tour
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container px-4 md:px-6 pb-16 md:pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/patterns">
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardHeader>
                <BookOpen className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Patterns Library</CardTitle>
                <CardDescription>
                  200+ Effect.ts patterns — searchable, categorized, and production-tested.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/cli">
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardHeader>
                <Terminal className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>CLI Tool</CardTitle>
                <CardDescription>
                  Install EffectPatterns locally. Search, browse, and apply patterns from your terminal.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/mcp">
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardHeader>
                <Cpu className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>MCP Server</CardTitle>
                <CardDescription>
                  Connect Cursor, Claude, or any MCP-compatible AI to the full patterns library.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/consulting">
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardHeader>
                <MessageSquare className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Consulting</CardTitle>
                <CardDescription>
                  Effect assessments, migration strategy, and developer training for your team.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  )
}
