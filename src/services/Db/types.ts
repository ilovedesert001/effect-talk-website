/**
 * Database service types.
 */

import type { WaitlistSource } from "@/types/strings"

export interface WaitlistSignup {
  readonly id: string
  readonly email: string
  readonly role_or_company: string | null
  readonly source: WaitlistSource
  readonly created_at: string
}

export interface ConsultingInquiry {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly role: string | null
  readonly company: string | null
  readonly description: string
  readonly created_at: string
}

export interface Feedback {
  readonly id: string
  readonly name: string | null
  readonly email: string
  readonly message: string
  readonly created_at: string
}

export interface DbUser {
  readonly id: string
  readonly workos_id: string
  readonly email: string
  readonly name: string | null
  readonly avatar_url: string | null
  readonly preferences: Record<string, unknown>
  readonly created_at: string
  readonly updated_at: string
}

export interface DbPattern {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly content: string
  readonly category: string | null
  readonly difficulty: string | null
  readonly tags: readonly string[] | null
  readonly new: boolean
  readonly created_at: string
  readonly updated_at: string
}

export interface DbRule {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly content: string
  readonly category: string | null
  readonly severity: string | null
  readonly tags: readonly string[] | null
  readonly created_at: string
  readonly updated_at: string
}

export interface DbApiKey {
  readonly id: string
  readonly user_id: string
  readonly name: string
  readonly key_prefix: string
  readonly key_hash: string
  readonly created_at: string
  readonly revoked_at: string | null
}
