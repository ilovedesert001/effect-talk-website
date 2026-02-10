"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { TourCodeRunner } from "@/components/tour/TourCodeRunner"
import { TourStepNavigation } from "@/components/tour/TourStepNavigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TourStep as TourStepType } from "@/services/TourProgress/types"

interface TourStepProps {
  readonly step: TourStepType
  readonly lessonSlug: string
  readonly steps: readonly TourStepType[]
  readonly currentStepIndex: number
}

export function TourStep({ step, lessonSlug, steps, currentStepIndex }: TourStepProps) {
  const hasSolution = Boolean(step.solution_code)

  // Radix Tabs use useId() which causes hydration mismatch in Next.js 15.5+ / React 19.2.
  // Defer Tabs render until after mount so server and first client render match.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
      {/* Left: Explanation */}
      <div className="p-5 md:p-8 md:border-r">
        <h2 className="text-xl font-bold tracking-tight mb-4">{step.title}</h2>

        <div className="text-[0.65rem] leading-relaxed space-y-2">
          {step.instruction.split("\n\n").map((paragraph) => {
            const trimmed = paragraph.trim()
            if (!trimmed) return null
            return (
              <p key={trimmed.slice(0, 40)}>
                {trimmed.split("\n").join(" ")}
              </p>
            )
          })}
        </div>

        {/* Hints */}
        {step.hints && step.hints.length > 0 && (
          <div className="mt-4">
            <ul className="text-[0.65rem] text-muted-foreground list-disc pl-5 space-y-0.5">
              {step.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Pattern */}
        {step.pattern_id && (
          <Link
            href={`/patterns/${step.pattern_id}?from=${encodeURIComponent(lessonSlug)}&step=${step.order_index}`}
            className="mt-4 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            View related pattern
          </Link>
        )}

        {/* Navigation */}
        <div className="mt-5 pt-4 border-t">
          <TourStepNavigation
            currentStepIndex={currentStepIndex}
            steps={steps}
            lessonSlug={lessonSlug}
          />
        </div>
      </div>

      {/* Right: Code Runner */}
      <div
        className="flex flex-col items-stretch bg-muted/30 px-1 py-1 md:px-2 md:py-2"
        style={{ minHeight: "600px" }}
      >
        {step.concept_code && (
          <div className="w-full flex-1 flex flex-col min-h-[500px]" style={{ minHeight: "600px" }}>
            {hasSolution ? (
              mounted ? (
                <Tabs defaultValue="anti-pattern" className="flex flex-col flex-1 min-h-0">
                  <TabsList variant="line" className="h-8 shrink-0 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0">
                    <TabsTrigger value="anti-pattern" className="text-[0.65rem] px-3 py-1.5 after:hidden data-[state=active]:font-semibold">
                      Anti-pattern
                    </TabsTrigger>
                    <TabsTrigger value="solution" className="text-[0.65rem] px-3 py-1.5 after:hidden data-[state=active]:font-semibold">
                      Solution
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="anti-pattern" className="flex-1 min-h-0 mt-0">
                    <div className="h-full min-h-[500px]">
                      <TourCodeRunner code={step.concept_code} readOnly={true} />
                    </div>
                  </TabsContent>
                  <TabsContent value="solution" className="flex-1 min-h-0 mt-0">
                    <div className="h-full min-h-[500px] flex flex-col">
                      {step.solution_code && (
                        <TourCodeRunner code={step.solution_code} readOnly={true} />
                      )}
                      {step.feedback_on_complete && (
                        <div className="px-3 py-2 border-t bg-muted/20">
                          <p className="text-[0.65rem] text-muted-foreground italic">
                            {step.feedback_on_complete}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="h-8 shrink-0 w-full border-b bg-transparent" />
                  <div className="flex-1 min-h-0 mt-0">
                    <div className="h-full min-h-[500px]">
                      <TourCodeRunner code={step.concept_code} readOnly={true} />
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full flex-1" style={{ minHeight: "500px", height: "100%" }}>
                <TourCodeRunner code={step.concept_code} readOnly={true} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
