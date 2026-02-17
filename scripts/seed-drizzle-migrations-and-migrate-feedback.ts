#!/usr/bin/env bun

/**
 * 1. Drops the feedback table (if it was created by db:apply-feedback or similar).
 * 2. Seeds Drizzle's __drizzle_migrations so 0000–0003 are marked applied.
 * 3. You then run `bun run db:migrate` to create feedback via the migration.
 *
 * Use this when the DB was created with db:push / manual SQL and you want
 * the feedback table to be created and tracked by Drizzle migrations.
 *
 * Usage: bun run scripts/seed-drizzle-migrations-and-migrate-feedback.ts
 * Then:  bun run db:migrate
 */

import crypto from "node:crypto"
import { config } from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(rootDir, "..")
config({ path: path.join(projectRoot, ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local")
  process.exit(1)
}

const db = drizzle(databaseUrl)
const migrationsFolder = path.join(projectRoot, "drizzle")
const journalPath = path.join(migrationsFolder, "meta", "_journal.json")

async function main(): Promise<void> {
  // 1. Drop feedback table if it exists
  await db.execute(sql.raw(`DROP TABLE IF EXISTS "feedback"`))
  console.log("Dropped feedback table (if it existed).")

  // 2. Ensure drizzle schema and __drizzle_migrations exist
  await db.execute(sql.raw("CREATE SCHEMA IF NOT EXISTS drizzle"))
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `))

  // 3. How many migrations are already recorded?
  const existing = await db.execute(sql.raw(`
    SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at ASC
  `))
  const rows = existing.rows as Array<{ id: number; created_at: string }>
  const needToSeed = rows.length < 4

  if (!needToSeed) {
    console.log("Migration history already has 4+ entries. Run: bun run db:migrate")
    return
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"))
  const entries = journal.entries.slice(0, 4)

  for (const entry of entries) {
    const tag = entry.tag as string
    const when = entry.when as number
    const filePath = path.join(migrationsFolder, `${tag}.sql`)
    const content = fs.readFileSync(filePath, "utf-8")
    const hash = crypto.createHash("sha256").update(content).digest("hex")

    await db.execute(sql.raw(`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('${hash.replace(/'/g, "''")}', ${when})
    `))
    console.log(`Recorded migration: ${tag}`)
  }

  console.log("\nDone. Run: bun run db:migrate")
}

main().catch((err) => {
  console.error("Script failed:", err)
  process.exit(1)
})
