/**
 * Analytics service types.
 */

import type { WaitlistSource, TabType, AnalyticsEventType } from "@/types/strings"

export interface WaitlistSubmittedEvent {
  readonly type: Extract<AnalyticsEventType, "waitlist_submitted">
  readonly source: WaitlistSource
}

export interface ConsultingSubmittedEvent {
  readonly type: Extract<AnalyticsEventType, "consulting_submitted">
}

export interface FeedbackSubmittedEvent {
  readonly type: Extract<AnalyticsEventType, "feedback_submitted">
}

export interface TabClickedEvent {
  readonly type: Extract<AnalyticsEventType, "tab_clicked">
  readonly tab: TabType
}

export interface SearchPerformedEvent {
  readonly type: Extract<AnalyticsEventType, "search_performed">
  readonly queryLength: number
  readonly patternCount: number
  readonly ruleCount: number
  readonly pageCount: number
}

export interface TourStartedEvent {
  readonly type: Extract<AnalyticsEventType, "tour_started">
}

export interface LessonStartedEvent {
  readonly type: Extract<AnalyticsEventType, "lesson_started">
  readonly lessonSlug: string
}

export interface StepCompletedEvent {
  readonly type: Extract<AnalyticsEventType, "step_completed">
  readonly lessonSlug: string
  readonly stepId: string
}

export interface LessonCompletedEvent {
  readonly type: Extract<AnalyticsEventType, "lesson_completed">
  readonly lessonSlug: string
}

export type AnalyticsEvent =
  | WaitlistSubmittedEvent
  | ConsultingSubmittedEvent
  | FeedbackSubmittedEvent
  | TabClickedEvent
  | SearchPerformedEvent
  | TourStartedEvent
  | LessonStartedEvent
  | StepCompletedEvent
  | LessonCompletedEvent
