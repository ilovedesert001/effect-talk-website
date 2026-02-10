#!/usr/bin/env bun

/**
 * Promote staging tables to live.
 *
 * This performs a zero-downtime, atomic swap of content tables.
 *
 * Usage:
 *   bun run scripts/promote.ts patterns    # swap patterns + rules
 *   bun run scripts/promote.ts tour        # swap tour_lessons + tour_steps
 *   bun run scripts/promote.ts all         # swap everything
 *
 * Options:
 *   --keep-retired   Keep the retired tables instead of dropping them
 *   --dry-run        Validate staging tables without swapping
 */

import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"
import { contentDeployments } from "../src/db/schema"
import { SWAP_GROUPS, validateStaging, swapTables, recreateStagingTables, type SwapGroupName } from "./lib/table-swap"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(rootDir, "..", ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local")
  process.exit(1)
}

const db = drizzle(databaseUrl)

// ---------------------------------------------------------------------------
// Parse arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const isDryRun = args.includes("--dry-run")
const keepRetired = args.includes("--keep-retired")
const target = args.find((a) => !a.startsWith("--"))

if (!target || !["patterns", "rules", "tour", "all"].includes(target)) {
  console.error("Usage: bun run scripts/promote.ts <patterns|rules|tour|all> [--dry-run] [--keep-retired]")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Determine which groups to promote
// ---------------------------------------------------------------------------

function getGroups(): SwapGroupName[] {
  if (target === "all") return ["patterns", "rules", "tour"]
  return [target as SwapGroupName]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const groups = getGroups()

  for (const groupName of groups) {
    const group = SWAP_GROUPS[groupName]
    console.log(`\n--- Promoting: ${group.name} ---`)

    // Validate staging tables
    console.log("Validating staging tables...")
    const counts = await validateStaging(db, group)
    for (const [table, count] of counts) {
      console.log(`  ${table}: ${count} rows`)
    }

    if (isDryRun) {
      console.log("Dry run — skipping swap.")
      continue
    }

    // Perform the atomic swap
    console.log("Swapping tables...")
    await swapTables(db, group, { keepRetired })

    // Record the deployment
    const totalRows = Array.from(counts.values()).reduce((a, b) => a + b, 0)
    await db.insert(contentDeployments).values({
      tableGroup: group.name,
      status: "live",
      rowCount: totalRows,
      metadata: {
        swappedAt: new Date().toISOString(),
        keepRetired,
        tables: group.tables,
      },
      promotedAt: sql`now()`,
    })

    // Recreate empty staging tables for the next deployment
    console.log("Recreating empty staging tables...")
    await recreateStagingTables(db, group)

    console.log(`✓ ${group.name} promoted successfully.`)
  }

  // Mark previous live deployments as retired
  for (const groupName of groups) {
    await db.execute(sql`
      UPDATE ${contentDeployments}
      SET status = 'retired', retired_at = now()
      WHERE table_group = ${groupName}
        AND status = 'live'
        AND promoted_at < (
          SELECT MAX(promoted_at) FROM ${contentDeployments}
          WHERE table_group = ${groupName} AND status = 'live'
        )
    `)
  }

  console.log("\nDone!")
  process.exit(0)
}

main().catch((err) => {
  console.error("Promote failed:", err)
  process.exit(1)
})
