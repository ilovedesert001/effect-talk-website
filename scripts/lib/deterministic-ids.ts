/**
 * Deterministic UUID generation for blue-green table swaps.
 *
 * Tour lessons and steps need stable IDs so that `tour_progress.step_id`
 * references survive table swaps. We use UUID v5 (SHA-1 based, RFC 4122)
 * to derive the same UUID from the same inputs every time.
 *
 * No external dependencies — uses Node's built-in crypto module.
 */

import { createHash } from "node:crypto"

// ---------------------------------------------------------------------------
// Project namespace — a fixed UUID unique to this project.
// Generated once, never changes. All deterministic IDs are scoped under it.
// ---------------------------------------------------------------------------

const PROJECT_NAMESPACE = "a3e4f8d2-7c1b-4e9a-b5d6-8f2e3a1c4b7d"

// ---------------------------------------------------------------------------
// UUID v5 implementation (RFC 4122 §4.3)
// ---------------------------------------------------------------------------

function uuidV5(name: string, namespace: string): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ""), "hex")
  const nameBytes = Buffer.from(name, "utf8")

  const hash = createHash("sha1")
    .update(namespaceBytes)
    .update(nameBytes)
    .digest()

  // Set version = 5 (bits 4-7 of byte 6)
  hash[6] = (hash[6] & 0x0f) | 0x50
  // Set variant = 10xx (bits 6-7 of byte 8)
  hash[8] = (hash[8] & 0x3f) | 0x80

  const hex = hash.subarray(0, 16).toString("hex")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-")
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic UUID for a tour lesson from its slug.
 *
 * Same slug always produces the same UUID.
 */
export function lessonId(slug: string): string {
  return uuidV5(`tour-lesson:${slug}`, PROJECT_NAMESPACE)
}

/**
 * Generate a deterministic UUID for a tour step from its lesson slug
 * and step order index.
 *
 * Same (slug, orderIndex) always produces the same UUID.
 */
export function stepId(lessonSlug: string, orderIndex: number): string {
  return uuidV5(`tour-step:${lessonSlug}:${orderIndex}`, PROJECT_NAMESPACE)
}

/**
 * Generate a deterministic UUID for a pattern from its slug (Effect-Patterns id).
 *
 * Same slug always produces the same UUID, so tour_steps.pattern_id and other
 * references survive blue-green pattern table swaps.
 */
export function patternId(slug: string): string {
  return uuidV5(`pattern:${slug}`, PROJECT_NAMESPACE)
}
