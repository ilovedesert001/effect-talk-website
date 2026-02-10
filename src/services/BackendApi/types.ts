/**
 * Backend API service types.
 */

export interface Pattern {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly content: string
  readonly category?: string
  readonly tags?: readonly string[]
  readonly difficulty?: string
  readonly new?: boolean
}

export interface Rule {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly content: string
  readonly category?: string
  readonly tags?: readonly string[]
  readonly severity?: string
}

export interface SearchResult {
  readonly patterns: readonly Pattern[]
  readonly rules: readonly Rule[]
}
