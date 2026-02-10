"use client"

import Link from "next/link"
import type { TourStep } from "@/services/TourProgress/types"

interface TourStepNavigationProps {
  readonly currentStepIndex: number
  readonly steps: readonly TourStep[]
  readonly lessonSlug: string
}

export function TourStepNavigation({
  currentStepIndex,
  steps,
  lessonSlug,
}: TourStepNavigationProps) {
  const hasPrevious = currentStepIndex > 0
  const hasNext = currentStepIndex < steps.length - 1

  const previousStep = hasPrevious ? steps[currentStepIndex - 1] : null
  const nextStep = hasNext ? steps[currentStepIndex + 1] : null

  return (
    <nav className="flex items-center justify-center gap-4 text-[0.65rem]">
      {hasPrevious && previousStep ? (
        <Link
          href={`/tour/${lessonSlug}?step=${previousStep.order_index}`}
          className="font-medium hover:underline"
        >
          Back
        </Link>
      ) : (
        <Link
          href="/tour"
          className="font-medium hover:underline"
        >
          Back
        </Link>
      )}
      <span className="text-muted-foreground">—</span>
      <Link
        href="/tour"
        className="font-medium hover:underline"
      >
        Lessons
      </Link>
      <span className="text-muted-foreground">—</span>
      {hasNext && nextStep ? (
        <Link
          href={`/tour/${lessonSlug}?step=${nextStep.order_index}`}
          className="font-medium hover:underline"
        >
          Next
        </Link>
      ) : (
        <Link
          href="/tour"
          className="font-medium text-muted-foreground"
        >
          Finish
        </Link>
      )}
    </nav>
  )
}
