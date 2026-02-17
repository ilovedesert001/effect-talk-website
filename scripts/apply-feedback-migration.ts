#!/usr/bin/env bun

/**
 * Apply only the feedback table migration.
 * Use this when the DB was created with db:push or manually and db:migrate
 * would re-run older migrations and fail.
 *
 * Usage: bun run scripts/apply-feedback-migration.ts
 */

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

const migrationPath = path.join(projectRoot, "drizzle", "0004_feedback.sql")
const migrationSql = fs.readFileSync(migrationPath, "utf-8").trim()

async function main(): Promise<void> {
  await db.execute(sql.raw(migrationSql))
  console.log("Feedback table created (or already exists).")
}

main().catch((err) => {
  console.error("Apply failed:", err)
  process.exit(1)
})
