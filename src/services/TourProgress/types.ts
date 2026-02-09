/**
 * Tour Progress service types.
 */

export type TourProgressStatus = "not_started" | "completed" | "skipped"

export interface TourLesson {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly description: string
  readonly order_index: number
  readonly difficulty: string
  readonly estimated_minutes: number | null
  readonly created_at: string
}

export interface TourStep {
  readonly id: string
  readonly lesson_id: string
  readonly order_index: number
  readonly title: string
  readonly instruction: string
  readonly concept_code: string | null
  readonly concept_code_language: string | null
  readonly solution_code: string | null
  readonly playground_url: string | null
  readonly hints: readonly string[] | null
  readonly feedback_on_complete: string | null
  readonly pattern_id: string | null
  readonly created_at: string
}

export interface TourProgress {
  readonly id: string
  readonly user_id: string
  readonly step_id: string
  readonly status: TourProgressStatus
  readonly feedback: string | null
  readonly completed_at: string | null
  readonly created_at: string
}

export interface TourLessonWithSteps extends TourLesson {
  readonly steps: readonly TourStep[]
}

export interface TourStepWithProgress extends TourStep {
  readonly progress: TourProgress | null
}
