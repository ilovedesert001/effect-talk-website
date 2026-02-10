#!/usr/bin/env bun

/**
 * Check that the local database schema and content tables match expectations.
 *
 * Usage: bun run scripts/check-db.ts
 *
 * Exits 0 if everything looks correct, 1 with a message otherwise.
 */

import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(rootDir, "..", ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local")
  process.exit(1)
}

const db = drizzle(databaseUrl)

const REQUIRED_TABLES = [
  "users",
  "waitlist_signups",
  "consulting_inquiries",
  "api_keys",
  "patterns",
  "patterns_staging",
  "rules",
  "rules_staging",
  "tour_lessons",
  "tour_lessons_staging",
  "tour_steps",
  "tour_steps_staging",
  "tour_progress",
  "content_deployments",
  "analytics_events",
] as const

async function main(): Promise<void> {
  let hasError = false

  // 1. Check tables exist
  const existing = await db.execute(sql.raw(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `))
  const existingSet = new Set(
    (existing.rows as Array<{ table_name: string }>).map((r) => r.table_name),
  )

  for (const table of REQUIRED_TABLES) {
    if (!existingSet.has(table)) {
      console.error(`Missing table: ${table}`)
      hasError = true
    }
  }

  // 2. Check patterns has "new" column
  const patternColumns = await db.execute(sql.raw(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patterns'
  `))
  const patternColSet = new Set(
    (patternColumns.rows as Array<{ column_name: string }>).map((r) => r.column_name),
  )
  if (!patternColSet.has("new")) {
    console.error("patterns table missing column: new (run db:push or db:migrate)")
    hasError = true
  }

  // 3. Row counts for content tables
  const contentTables = ["patterns", "patterns_staging", "rules", "rules_staging", "tour_lessons", "tour_lessons_staging", "tour_steps", "tour_steps_staging"]
  const counts: Record<string, number> = {}
  for (const table of contentTables) {
    if (!existingSet.has(table)) continue
    try {
      const r = await db.execute(sql.raw(`SELECT count(*) AS c FROM "${table}"`))
      counts[table] = Number((r.rows[0] as { c: string })?.c ?? 0)
    } catch {
      counts[table] = -1
    }
  }

  // 4. Lock triggers (optional; inform only)
  const triggers = await db.execute(sql.raw(`
    SELECT c.relname AS table_name, t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.tgname LIKE 'lock_%' AND NOT t.tgisinternal
  `))
  const triggerList = (triggers.rows as Array<{ table_name: string; trigger_name: string }>).map(
    (r) => `${r.table_name}.${r.trigger_name}`,
  )

  // Report
  console.log("--- Database check ---\n")
  if (hasError) {
    console.log("Result: FAILED (see errors above)\n")
    process.exit(1)
  }

  console.log("Tables: all required tables present")
  console.log("patterns.new: column present")
  console.log("\nContent row counts:")
  for (const table of contentTables) {
    const c = counts[table] ?? 0
    const label = c === -1 ? "error" : String(c)
    console.log(`  ${table}: ${label}`)
  }
  if (triggerList.length > 0) {
    console.log("\nLock triggers:", triggerList.join(", "))
  } else {
    console.log("\nLock triggers: none (run db:migrate to add, or they are created on first promote)")
  }
  console.log("\nResult: OK")
  process.exit(0)
}

main().catch((err) => {
  console.error("Check failed:", err)
  process.exit(1)
})
