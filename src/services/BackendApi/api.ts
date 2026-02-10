/**
 * BackendApi service -- provides patterns, rules, and search.
 *
 * Data is stored in PostgreSQL and queried via the Db service.
 * This module maps DbPattern/DbRule to the public Pattern/Rule types
 * consumed by pages and components.
 */

import { Effect } from "effect"
import { BackendApiError } from "@/services/BackendApi/errors"
import type { Pattern, Rule, SearchResult } from "@/services/BackendApi/types"
import {
  getAllPatterns,
  getPatternById,
  getAllRules,
  getRuleById,
  searchPatternsAndRules,
} from "@/services/Db/api"
import type { DbPattern, DbRule } from "@/services/Db/types"

// ---------------------------------------------------------------------------
// Mappers (Db types -> public API types)
// ---------------------------------------------------------------------------

function toPattern(db: DbPattern): Pattern {
  return {
    id: db.id,
    title: db.title,
    description: db.description,
    content: db.content,
    category: db.category ?? undefined,
    difficulty: db.difficulty ?? undefined,
    tags: db.tags ?? undefined,
    new: db.new,
  }
}

function toRule(db: DbRule): Rule {
  return {
    id: db.id,
    title: db.title,
    description: db.description,
    content: db.content,
    category: db.category ?? undefined,
    severity: db.severity ?? undefined,
    tags: db.tags ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Public API (Effect wrappers)
// ---------------------------------------------------------------------------

export function fetchPatterns(): Effect.Effect<readonly Pattern[], BackendApiError> {
  return getAllPatterns().pipe(
    Effect.map((rows) => rows.map(toPattern)),
    Effect.mapError((e) => new BackendApiError({ message: e.message })),
  )
}

export function fetchPattern(id: string): Effect.Effect<Pattern | null, BackendApiError> {
  return getPatternById(id).pipe(
    Effect.map((row) => (row ? toPattern(row) : null)),
    Effect.mapError((e) => new BackendApiError({ message: e.message })),
  )
}

export function fetchRules(): Effect.Effect<readonly Rule[], BackendApiError> {
  return getAllRules().pipe(
    Effect.map((rows) => rows.map(toRule)),
    Effect.mapError((e) => new BackendApiError({ message: e.message })),
  )
}

export function fetchRule(id: string): Effect.Effect<Rule | null, BackendApiError> {
  return getRuleById(id).pipe(
    Effect.map((row) => (row ? toRule(row) : null)),
    Effect.mapError((e) => new BackendApiError({ message: e.message })),
  )
}

export function searchBackend(q: string): Effect.Effect<SearchResult, BackendApiError> {
  return searchPatternsAndRules(q).pipe(
    Effect.map((result) => ({
      patterns: result.patterns.map(toPattern),
      rules: result.rules.map(toRule),
    })),
    Effect.mapError((e) => new BackendApiError({ message: e.message })),
  )
}

/**
 * Fetch all pattern IDs (for generateStaticParams in ISR).
 */
export function fetchPatternIds(): Effect.Effect<readonly string[], BackendApiError> {
  return fetchPatterns().pipe(Effect.map((ps) => ps.map((p) => p.id)))
}

/**
 * Fetch all rule IDs (for generateStaticParams in ISR).
 */
export function fetchRuleIds(): Effect.Effect<readonly string[], BackendApiError> {
  return fetchRules().pipe(Effect.map((rs) => rs.map((r) => r.id)))
}
