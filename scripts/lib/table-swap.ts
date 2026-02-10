/**
 * Atomic blue-green table swap utilities.
 *
 * Performs a zero-downtime swap of staging → live tables using
 * PostgreSQL's transactional DDL (ALTER TABLE RENAME).
 *
 * The swap is atomic: either all renames succeed or none do.
 *
 * Live content tables are protected by a `reject_content_writes` trigger
 * that blocks INSERT/UPDATE/DELETE. The swap transaction disables the
 * trigger on the outgoing live table and enables it on the incoming one.
 *
 * For tour tables, the FK constraint from `tour_progress → tour_steps`
 * is dropped before the swap and re-created after, pointing at the new
 * live table.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A group of tables that are swapped together atomically. */
interface SwapGroup {
  /** Human-readable name for logging ("patterns", "rules", "tour") */
  readonly name: string
  /**
   * Table names to swap, in order. Each entry is swapped:
   *   live → retired, staging → live
   */
  readonly tables: string[]
  /**
   * Write-lock trigger names per table. These are disabled on the outgoing
   * live table and enabled on the incoming (previously staging) table.
   */
  readonly lockTriggers: ReadonlyArray<{
    readonly table: string
    readonly triggerName: string
  }>
  /**
   * FK constraints that must be dropped before swap and recreated after.
   * Only needed when a non-swappable table (e.g. tour_progress) references
   * a swappable table (e.g. tour_steps).
   */
  readonly foreignKeys?: ReadonlyArray<{
    readonly constraintName: string
    readonly sourceTable: string
    readonly sourceColumn: string
    readonly targetTable: string
    readonly targetColumn: string
  }>
}

// ---------------------------------------------------------------------------
// Pre-defined swap groups
// ---------------------------------------------------------------------------

export const SWAP_GROUPS = {
  patterns: {
    name: "patterns",
    tables: ["patterns"],
    lockTriggers: [{ table: "patterns", triggerName: "lock_patterns" }],
  },
  rules: {
    name: "rules",
    tables: ["rules"],
    lockTriggers: [{ table: "rules", triggerName: "lock_rules" }],
  },
  tour: {
    name: "tour",
    tables: ["tour_lessons", "tour_steps"],
    lockTriggers: [
      { table: "tour_lessons", triggerName: "lock_tour_lessons" },
      { table: "tour_steps", triggerName: "lock_tour_steps" },
    ],
    foreignKeys: [
      {
        constraintName: "tour_progress_step_id_tour_steps_id_fk",
        sourceTable: "tour_progress",
        sourceColumn: "step_id",
        targetTable: "tour_steps",
        targetColumn: "id",
      },
      {
        constraintName: "tour_steps_lesson_id_tour_lessons_id_fk",
        sourceTable: "tour_steps",
        sourceColumn: "lesson_id",
        targetTable: "tour_lessons",
        targetColumn: "id",
      },
    ],
  },
} as const satisfies Record<string, SwapGroup>

export type SwapGroupName = keyof typeof SWAP_GROUPS

// ---------------------------------------------------------------------------
// Swap implementation
// ---------------------------------------------------------------------------

/**
 * Validate that all staging tables exist and contain data.
 * Returns row counts per table.
 */
export async function validateStaging(
  db: NodePgDatabase,
  group: SwapGroup,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  for (const table of group.tables) {
    const stagingTable = `${table}_staging`

    // Check table exists
    const exists = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '${stagingTable}'
      ) AS table_exists
    `))

    const tableExists = (exists.rows[0] as Record<string, unknown>)?.table_exists
    if (!tableExists) {
      throw new Error(`Staging table "${stagingTable}" does not exist. Run the seed script first.`)
    }

    // Count rows
    const countResult = await db.execute(sql.raw(`SELECT count(*) AS cnt FROM "${stagingTable}"`))
    const count = Number((countResult.rows[0] as Record<string, unknown>)?.cnt ?? 0)

    if (count === 0) {
      throw new Error(`Staging table "${stagingTable}" is empty. Aborting swap.`)
    }

    counts.set(stagingTable, count)
  }

  return counts
}

/** Trigger function body used to lock content tables. Must match migration. */
const REJECT_CONTENT_WRITES_FN = `
CREATE OR REPLACE FUNCTION reject_content_writes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table "%" is locked. Write to "%_staging" instead.', TG_TABLE_NAME, TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
`.trim()

/**
 * SQL to conditionally disable a trigger only if it exists.
 * Avoids "trigger does not exist" when migration was never run.
 */
function disableTriggerIfExists(table: string, triggerName: string): string {
  return `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = '${table}' AND t.tgname = '${triggerName}' AND NOT t.tgisinternal
  ) THEN
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', '${table}', '${triggerName}');
  END IF;
END $$;
`.trim()
}

/**
 * Perform an atomic blue-green swap of staging → live tables.
 *
 * Steps (all within a single transaction):
 *  0. Ensure reject_content_writes() function exists
 *  1. Disable write-lock triggers that exist on current live tables (no-op if missing)
 *  2. Drop FK constraints that reference swappable tables
 *  3. For each table: live → retired, staging → live
 *  4. Re-create FK constraints pointing at the new live tables
 *  5. Create write-lock triggers on the new live tables
 *  6. Drop retired tables
 */
export async function swapTables(
  db: NodePgDatabase,
  group: SwapGroup,
  options?: { keepRetired?: boolean },
): Promise<void> {
  const statements: string[] = []

  // 0. Ensure trigger function exists (idempotent; works even if migration was never run)
  statements.push(REJECT_CONTENT_WRITES_FN)

  // 1. Disable triggers only if they exist (safe when migration was never run)
  for (const lt of group.lockTriggers) {
    statements.push(disableTriggerIfExists(lt.table, lt.triggerName))
  }

  // 2. Drop FK constraints
  if (group.foreignKeys) {
    for (const fk of group.foreignKeys) {
      statements.push(
        `ALTER TABLE "${fk.sourceTable}" DROP CONSTRAINT IF EXISTS "${fk.constraintName}"`,
      )
    }
  }

  // 3. Rename: live → retired, staging → live
  for (const table of group.tables) {
    statements.push(`ALTER TABLE IF EXISTS "${table}" RENAME TO "${table}_retired"`)
    statements.push(`ALTER TABLE "${table}_staging" RENAME TO "${table}"`)
  }

  // 4. Re-create FK constraints
  if (group.foreignKeys) {
    for (const fk of group.foreignKeys) {
      statements.push(
        `ALTER TABLE "${fk.sourceTable}" ADD CONSTRAINT "${fk.constraintName}" ` +
        `FOREIGN KEY ("${fk.sourceColumn}") REFERENCES "${fk.targetTable}" ("${fk.targetColumn}") ON DELETE CASCADE`,
      )
    }
  }

  // 5. Enable write-lock triggers on the NEW live tables
  for (const lt of group.lockTriggers) {
    statements.push(
      `CREATE TRIGGER "${lt.triggerName}" BEFORE INSERT OR UPDATE OR DELETE ON "${lt.table}" ` +
      `FOR EACH ROW EXECUTE FUNCTION reject_content_writes()`,
    )
  }

  // 6. Drop retired tables (unless --keep-retired)
  if (!options?.keepRetired) {
    // Drop in reverse order to respect FK dependencies
    for (const table of [...group.tables].reverse()) {
      statements.push(`DROP TABLE IF EXISTS "${table}_retired" CASCADE`)
    }
  }

  // Execute everything in a single transaction
  const txSql = `BEGIN;\n${statements.join(";\n")};\nCOMMIT;`
  await db.execute(sql.raw(txSql))
}

/**
 * Re-create empty staging tables for the next deployment.
 * Uses CREATE TABLE ... (LIKE ... INCLUDING ALL) to clone the live schema.
 */
export async function recreateStagingTables(
  db: NodePgDatabase,
  group: SwapGroup,
): Promise<void> {
  for (const table of group.tables) {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}_staging" CASCADE`))
    await db.execute(sql.raw(
      `CREATE TABLE "${table}_staging" (LIKE "${table}" INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`,
    ))
  }
}
