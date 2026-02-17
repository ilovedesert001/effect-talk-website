/**
 * Database service API.
 * Uses Drizzle ORM for type-safe queries, wrapped in Effect for typed error handling.
 */

import { Effect } from "effect"
import { eq, desc, and, isNull, sql } from "drizzle-orm"
import { db } from "@/db/client"
import {
  users,
  waitlistSignups,
  consultingInquiries,
  feedback,
  apiKeys,
  analyticsEvents,
  patterns,
  rules,
  NEW_PATTERN_RELEASE_CUTOFF,
} from "@/db/schema"
import type { WaitlistSource, AnalyticsEventType } from "@/types/strings"
import type { DbError } from "@/services/Db/errors"
import type {
  WaitlistSignup,
  ConsultingInquiry,
  Feedback,
  DbUser,
  DbApiKey,
  DbPattern,
  DbRule,
} from "@/services/Db/types"
import { toDbError } from "@/services/Db/helpers"

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export function insertWaitlistSignup(
  email: string,
  source: WaitlistSource,
  roleOrCompany?: string
): Effect.Effect<WaitlistSignup, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(waitlistSignups)
        .values({
          email,
          source,
          roleOrCompany: roleOrCompany ?? null,
        })
        .returning()
      if (!row) throw new Error("Insert returned no row")
      // Map Drizzle row to our type - Drizzle returns camelCase, we need snake_case
      return {
        id: row.id,
        email: row.email,
        role_or_company: row.roleOrCompany,
        source: row.source as WaitlistSource,
        created_at: row.createdAt.toISOString(),
      } satisfies WaitlistSignup
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Consulting inquiries
// ---------------------------------------------------------------------------

export function insertConsultingInquiry(data: {
  name: string
  email: string
  role?: string
  company?: string
  description: string
}): Effect.Effect<ConsultingInquiry, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(consultingInquiries)
        .values({
          name: data.name,
          email: data.email,
          role: data.role ?? null,
          company: data.company ?? null,
          description: data.description,
        })
        .returning()
      if (!row) throw new Error("Insert returned no row")
      // Map Drizzle row to our type
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        company: row.company,
        description: row.description,
        created_at: row.createdAt.toISOString(),
      } satisfies ConsultingInquiry
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export function insertFeedback(data: {
  name?: string
  email: string
  message: string
}): Effect.Effect<Feedback, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(feedback)
        .values({
          name: data.name ?? null,
          email: data.email,
          message: data.message,
        })
        .returning()
      if (!row) throw new Error("Insert returned no row")
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        created_at: row.createdAt.toISOString(),
      } satisfies Feedback
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function upsertUser(data: {
  workosId: string
  email: string
  name?: string
  avatarUrl?: string
}): Effect.Effect<DbUser, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(users)
        .values({
          workosId: data.workosId,
          email: data.email,
          name: data.name ?? null,
          avatarUrl: data.avatarUrl ?? null,
          preferences: {},
        })
        .onConflictDoUpdate({
          target: users.workosId,
          set: {
            email: sql`excluded.email`,
            name: sql`excluded.name`,
            avatarUrl: sql`excluded.avatar_url`,
            updatedAt: sql`now()`,
          },
        })
        .returning()
      if (!row) throw new Error("Upsert returned no row")
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

export function getUserByWorkosId(workosId: string): Effect.Effect<DbUser | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.workosId, workosId))
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

export function getUserById(userId: string): Effect.Effect<DbUser | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(users).where(eq(users.id, userId))
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

export function updateUserPreferences(
  userId: string,
  preferences: Record<string, unknown>
): Effect.Effect<DbUser | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .update(users)
        .set({
          preferences,
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId))
        .returning()
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

export function updateUserProfile(
  userId: string,
  data: { name?: string; email?: string }
): Effect.Effect<DbUser | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .update(users)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId))
        .returning()
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export function insertApiKey(data: {
  userId: string
  name: string
  keyPrefix: string
  keyHash: string
}): Effect.Effect<DbApiKey, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(apiKeys)
        .values({
          userId: data.userId,
          name: data.name,
          keyPrefix: data.keyPrefix,
          keyHash: data.keyHash,
        })
        .returning()
      if (!row) throw new Error("Insert returned no row")
      // Map Drizzle row to our type
      return {
        id: row.id,
        user_id: row.userId,
        name: row.name,
        key_prefix: row.keyPrefix,
        key_hash: row.keyHash,
        created_at: row.createdAt.toISOString(),
        revoked_at: row.revokedAt?.toISOString() ?? null,
      } satisfies DbApiKey
    },
    catch: toDbError,
  })
}

export function listApiKeys(userId: string): Effect.Effect<readonly DbApiKey[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId))
        .orderBy(desc(apiKeys.createdAt))
      // Map Drizzle rows to our type
      return rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        name: row.name,
        key_prefix: row.keyPrefix,
        key_hash: row.keyHash,
        created_at: row.createdAt.toISOString(),
        revoked_at: row.revokedAt?.toISOString() ?? null,
      })) satisfies readonly DbApiKey[]
    },
    catch: toDbError,
  })
}

export function revokeApiKey(keyId: string, userId: string): Effect.Effect<DbApiKey | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .update(apiKeys)
        .set({ revokedAt: sql`now()` })
        .where(
          and(
            eq(apiKeys.id, keyId),
            eq(apiKeys.userId, userId),
            isNull(apiKeys.revokedAt)
          )
        )
        .returning()
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        user_id: row.userId,
        name: row.name,
        key_prefix: row.keyPrefix,
        key_hash: row.keyHash,
        created_at: row.createdAt.toISOString(),
        revoked_at: row.revokedAt?.toISOString() ?? null,
      } satisfies DbApiKey
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

function parseTagsJsonb(tags: unknown): readonly string[] | null {
  if (tags == null) return null
  if (Array.isArray(tags)) {
    const arr = tags.filter((x): x is string => typeof x === "string")
    return arr.length > 0 ? arr : null
  }
  return null
}

function mapPattern(row: typeof patterns.$inferSelect): DbPattern {
  const isNewFromRelease =
    row.releaseVersion != null && row.releaseVersion >= NEW_PATTERN_RELEASE_CUTOFF
  return {
    id: row.id,
    title: row.title,
    description: row.summary,
    content: row.content ?? "",
    category: row.category,
    difficulty: row.difficulty,
    tags: parseTagsJsonb(row.tags),
    new: isNewFromRelease,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export function getAllPatterns(): Effect.Effect<readonly DbPattern[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(patterns).orderBy(patterns.title)
      return rows.map(mapPattern)
    },
    catch: toDbError,
  })
}

export function getPatternById(patternId: string): Effect.Effect<DbPattern | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(patterns).where(eq(patterns.id, patternId))
      const row = rows[0]
      if (!row) return null
      return mapPattern(row)
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function mapRule(row: typeof rules.$inferSelect): DbRule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    category: row.category,
    severity: row.severity,
    tags: row.tags as readonly string[] | null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export function getAllRules(): Effect.Effect<readonly DbRule[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(rules).orderBy(rules.title)
      return rows.map(mapRule)
    },
    catch: toDbError,
  })
}

export function getRuleById(ruleId: string): Effect.Effect<DbRule | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(rules).where(eq(rules.id, ruleId))
      const row = rows[0]
      if (!row) return null
      return mapRule(row)
    },
    catch: toDbError,
  })
}

export function searchPatternsAndRules(query: string): Effect.Effect<{
  readonly patterns: readonly DbPattern[]
  readonly rules: readonly DbRule[]
}, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const q = `%${query.toLowerCase()}%`

      const patternRows = await db.select().from(patterns).where(
        sql`lower(${patterns.title}) like ${q} or lower(${patterns.summary}) like ${q}`
      )
      const ruleRows = await db.select().from(rules).where(
        sql`lower(${rules.title}) like ${q} or lower(${rules.description}) like ${q}`
      )

      return {
        patterns: patternRows.map(mapPattern),
        rules: ruleRows.map(mapRule),
      }
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Analytics events
// ---------------------------------------------------------------------------

export function insertAnalyticsEvent(
  eventType: AnalyticsEventType,
  payload: Record<string, unknown> = {}
): Effect.Effect<void, DbError> {
  return Effect.tryPromise({
    try: async () => {
      await db.insert(analyticsEvents).values({ eventType, payload })
    },
    catch: toDbError,
  })
}
