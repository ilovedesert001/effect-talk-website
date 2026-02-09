"use client"

import { useState } from "react"
import { TourCodeRunner } from "@/components/tour/TourCodeRunner"
import { TourStepNavigation } from "@/components/tour/TourStepNavigation"
import type { TourStep as TourStepType } from "@/services/TourProgress/types"

interface TourStepProps {
  readonly step: TourStepType
  readonly lessonSlug: string
  readonly steps: readonly TourStepType[]
  readonly currentStepIndex: number
}

export function TourStep({ step, lessonSlug, steps, currentStepIndex }: TourStepProps) {
  const [showSolution, setShowSolution] = useState(false)

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
        className="flex flex-col items-center bg-muted/30 px-3 py-3 md:px-4 md:py-4"
        style={{ minHeight: "600px" }}
      >
        {step.concept_code && (
          <div className="w-full flex-1" style={{ minHeight: "500px", height: "100%" }}>
            <TourCodeRunner code={step.concept_code} readOnly={true} />
          </div>
        )}

        {step.solution_code && (
          <div className="border-t">
            <button
              type="button"
              onClick={() => setShowSolution(!showSolution)}
              className="w-full px-5 py-2.5 text-[0.65rem] font-medium text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
            >
              <span>{showSolution ? "Hide Solution" : "Show Solution"}</span>
              <span className="text-muted-foreground text-xs">
                {showSolution ? "▲" : "▼"}
              </span>
            </button>
            {showSolution && (
              <div className="w-full border-t border-dashed" style={{ minHeight: "400px" }}>
                <TourCodeRunner code={step.solution_code} readOnly={true} />
                {step.feedback_on_complete && (
                  <div className="px-5 pb-5 md:px-8 md:pb-8">
                    <p className="mt-4 text-sm text-muted-foreground italic">
                      {step.feedback_on_complete}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
