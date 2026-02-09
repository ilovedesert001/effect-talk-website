import Link from "next/link"
import { TabsBar } from "@/components/TabsBar"
import { ComingSoon } from "@/components/ComingSoon"
import { WaitlistForm } from "@/components/WaitlistForm"
import { Button } from "@/components/ui/button"
import { buildMetadata } from "@/lib/seo"
import { ArrowRight } from "lucide-react"

export const metadata = buildMetadata({
  title: "EffectPatterns Playground",
  description: "Interactive playground for experimenting with Effect.ts patterns. Coming soon — join the waitlist.",
})

export default function PlaygroundPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 md:px-6 py-10">
        <ComingSoon
          title="EffectPatterns Playground"
          description="An interactive playground where you can experiment with Effect.ts patterns in the browser. Write, run, and share code snippets — no setup required."
        />
        <div className="mt-8 p-6 rounded-lg border bg-muted/50">
          <h3 className="text-lg font-semibold mb-2">Try the Interactive Tour</h3>
          <p className="text-sm text-muted-foreground mb-4">
            While you wait for the playground, check out our interactive tour where you can learn Effect.ts patterns
            step-by-step with hands-on exercises.
          </p>
          <Link href="/tour">
            <Button>
              Explore the Tour
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="mt-8">
          <WaitlistForm source="playground" />
        </div>
      </div>
    </>
  )
}
