/**
 * Drizzle ORM schema definitions.
 *
 * This is the single source of truth for the database schema.
 * Use `drizzle-kit generate` to create migrations from changes here.
 */

import { pgTable, uuid, text, jsonb, timestamp, index, integer, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Users (upserted from WorkOS GitHub OAuth)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  workosId: text("workos_id").unique().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  preferences: jsonb("preferences").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Waitlist signups (global; no login required)
// ---------------------------------------------------------------------------

export const waitlistSignups = pgTable("waitlist_signups", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  roleOrCompany: text("role_or_company"),
  source: text("source", { enum: ["playground", "code_review"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_waitlist_email").on(table.email),
])

// ---------------------------------------------------------------------------
// Consulting inquiries
// ---------------------------------------------------------------------------

export const consultingInquiries = pgTable("consulting_inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  company: text("company"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// API keys (user-scoped)
// ---------------------------------------------------------------------------

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("idx_api_keys_user").on(table.userId),
])

// ---------------------------------------------------------------------------
// Patterns (Effect.ts patterns catalog)
// ---------------------------------------------------------------------------

export const patterns = pgTable("patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  difficulty: text("difficulty"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_patterns_category").on(table.category),
  index("idx_patterns_difficulty").on(table.difficulty),
])

// ---------------------------------------------------------------------------
// Rules (Effect.ts rules catalog)
// ---------------------------------------------------------------------------

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  severity: text("severity"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_rules_category").on(table.category),
  index("idx_rules_severity").on(table.severity),
])

// ---------------------------------------------------------------------------
// Analytics events
// ---------------------------------------------------------------------------

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_events_type").on(table.eventType),
])

// ---------------------------------------------------------------------------
// Tour Lessons
// ---------------------------------------------------------------------------

export const tourLessons = pgTable("tour_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull(),
  difficulty: text("difficulty").notNull(),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_tour_lessons_order").on(table.orderIndex),
])

// ---------------------------------------------------------------------------
// Tour Steps
// ---------------------------------------------------------------------------

export const tourSteps = pgTable("tour_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => tourLessons.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  instruction: text("instruction").notNull(),
  conceptCode: text("concept_code"),
  conceptCodeLanguage: text("concept_code_language").default("typescript"),
  solutionCode: text("solution_code"),
  playgroundUrl: text("playground_url"),
  hints: text("hints").array(),
  feedbackOnComplete: text("feedback_on_complete"),
  patternId: uuid("pattern_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tour_steps_lesson").on(table.lessonId),
])

// ---------------------------------------------------------------------------
// Tour Progress (user-scoped)
// ---------------------------------------------------------------------------

export const tourProgress = pgTable("tour_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stepId: uuid("step_id").notNull().references(() => tourSteps.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("not_started"),
  feedback: text("feedback"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tour_progress_user").on(table.userId),
  index("idx_tour_progress_step").on(table.stepId),
])

// ---------------------------------------------------------------------------
// Tour Relations (for Drizzle relational queries)
// ---------------------------------------------------------------------------

export const tourLessonsRelations = relations(tourLessons, ({ many }) => ({
  steps: many(tourSteps),
}))

export const tourStepsRelations = relations(tourSteps, ({ one, many }) => ({
  lesson: one(tourLessons, {
    fields: [tourSteps.lessonId],
    references: [tourLessons.id],
  }),
  progress: many(tourProgress),
}))

export const tourProgressRelations = relations(tourProgress, ({ one }) => ({
  user: one(users, {
    fields: [tourProgress.userId],
    references: [users.id],
  }),
  step: one(tourSteps, {
    fields: [tourProgress.stepId],
    references: [tourSteps.id],
  }),
}))
