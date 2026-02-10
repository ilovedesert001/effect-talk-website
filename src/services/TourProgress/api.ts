/**
 * Tour Progress service API.
 * Uses Drizzle ORM for type-safe queries, wrapped in Effect for typed error handling.
 */

import { Effect } from "effect"
import { eq, and, asc } from "drizzle-orm"
import { db } from "@/db/client"
import { tourLessons, tourSteps, tourProgress } from "@/db/schema"
import type { DbError } from "@/services/Db/errors"
import { toDbError } from "@/services/Db/helpers"
import type {
  TourLesson,
  TourStep,
  TourProgress as TourProgressType,
  TourProgressStatus,
  TourLessonWithSteps,
  TourStepWithProgress,
} from "@/services/TourProgress/types"

// ---------------------------------------------------------------------------
// Tour Lessons
// ---------------------------------------------------------------------------

function mapLesson(row: typeof tourLessons.$inferSelect): TourLesson {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    order_index: row.orderIndex,
    group: row.group ?? null,
    difficulty: row.difficulty,
    estimated_minutes: row.estimatedMinutes,
    created_at: row.createdAt.toISOString(),
  }
}

export function getAllLessons(): Effect.Effect<readonly TourLesson[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourLessons).orderBy(asc(tourLessons.orderIndex))
      return rows.map(mapLesson)
    },
    catch: toDbError,
  })
}

export function getLessonBySlug(slug: string): Effect.Effect<TourLesson | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourLessons).where(eq(tourLessons.slug, slug))
      const row = rows[0]
      if (!row) return null
      return mapLesson(row)
    },
    catch: toDbError,
  })
}

export function getLessonWithSteps(slug: string): Effect.Effect<TourLessonWithSteps | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const lessonRows = await db.select().from(tourLessons).where(eq(tourLessons.slug, slug))
      const lessonRow = lessonRows[0]
      if (!lessonRow) return null

      const stepRows = await db
        .select()
        .from(tourSteps)
        .where(eq(tourSteps.lessonId, lessonRow.id))
        .orderBy(asc(tourSteps.orderIndex))

      return {
        ...mapLesson(lessonRow),
        steps: stepRows.map(mapStep),
      }
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Tour Steps
// ---------------------------------------------------------------------------

function mapStep(row: typeof tourSteps.$inferSelect): TourStep {
  return {
    id: row.id,
    lesson_id: row.lessonId,
    order_index: row.orderIndex,
    title: row.title,
    instruction: row.instruction,
    concept_code: row.conceptCode,
    concept_code_language: row.conceptCodeLanguage,
    solution_code: row.solutionCode,
    playground_url: row.playgroundUrl,
    hints: row.hints as readonly string[] | null,
    feedback_on_complete: row.feedbackOnComplete,
    pattern_id: row.patternId,
    created_at: row.createdAt.toISOString(),
  }
}

export function getStepById(stepId: string): Effect.Effect<TourStep | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourSteps).where(eq(tourSteps.id, stepId))
      const row = rows[0]
      if (!row) return null
      return mapStep(row)
    },
    catch: toDbError,
  })
}

export function getStepWithProgress(
  stepId: string,
  userId: string
): Effect.Effect<TourStepWithProgress | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const stepRows = await db.select().from(tourSteps).where(eq(tourSteps.id, stepId))
      const stepRow = stepRows[0]
      if (!stepRow) return null

      const progressRows = await db
        .select()
        .from(tourProgress)
        .where(and(eq(tourProgress.stepId, stepId), eq(tourProgress.userId, userId)))

      const progressRow = progressRows[0] || null

      return {
        ...mapStep(stepRow),
        progress: progressRow ? mapProgress(progressRow) : null,
      }
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Tour Progress
// ---------------------------------------------------------------------------

function mapProgress(row: typeof tourProgress.$inferSelect): TourProgressType {
  return {
    id: row.id,
    user_id: row.userId,
    step_id: row.stepId,
    status: row.status as TourProgressStatus,
    feedback: row.feedback,
    completed_at: row.completedAt?.toISOString() || null,
    created_at: row.createdAt.toISOString(),
  }
}

export function getUserProgress(userId: string): Effect.Effect<readonly TourProgressType[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourProgress).where(eq(tourProgress.userId, userId))
      return rows.map(mapProgress)
    },
    catch: toDbError,
  })
}

export function getStepProgress(
  stepId: string,
  userId: string
): Effect.Effect<TourProgressType | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select()
        .from(tourProgress)
        .where(and(eq(tourProgress.stepId, stepId), eq(tourProgress.userId, userId)))
      const row = rows[0]
      if (!row) return null
      return mapProgress(row)
    },
    catch: toDbError,
  })
}

export function upsertStepProgress(
  userId: string,
  stepId: string,
  status: TourProgressStatus,
  feedback?: string
): Effect.Effect<TourProgressType, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const existing = await db
        .select()
        .from(tourProgress)
        .where(and(eq(tourProgress.userId, userId), eq(tourProgress.stepId, stepId)))
        .limit(1)

      const now = new Date()
      const completedAt = status === "completed" ? now : null

      if (existing.length > 0) {
        const [row] = await db
          .update(tourProgress)
          .set({
            status,
            feedback: feedback ?? null,
            completedAt,
          })
          .where(eq(tourProgress.id, existing[0].id))
          .returning()
        if (!row) throw new Error("Update returned no row")
        return mapProgress(row)
      }
        const [row] = await db
          .insert(tourProgress)
          .values({
            userId,
            stepId,
            status,
            feedback: feedback ?? null,
            completedAt,
          })
          .returning()
        if (!row) throw new Error("Insert returned no row")
        return mapProgress(row)
    },
    catch: toDbError,
  })
}

export function bulkUpsertProgress(
  userId: string,
  progress: ReadonlyArray<{ stepId: string; status: TourProgressStatus }>
): Effect.Effect<readonly TourProgressType[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const now = new Date()
      const results: TourProgressType[] = []

      for (const item of progress) {
        const existing = await db
          .select()
          .from(tourProgress)
          .where(and(eq(tourProgress.userId, userId), eq(tourProgress.stepId, item.stepId)))
          .limit(1)

        const completedAt = item.status === "completed" ? now : null

        if (existing.length > 0) {
          const [row] = await db
            .update(tourProgress)
            .set({
              status: item.status,
              completedAt,
            })
            .where(eq(tourProgress.id, existing[0].id))
            .returning()
          if (row) results.push(mapProgress(row))
        } else {
          const [row] = await db
            .insert(tourProgress)
            .values({
              userId,
              stepId: item.stepId,
              status: item.status,
              completedAt,
            })
            .returning()
          if (row) results.push(mapProgress(row))
        }
      }

      return results
    },
    catch: toDbError,
  })
}
