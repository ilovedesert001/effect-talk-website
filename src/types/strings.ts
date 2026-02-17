/**
 * String literal types used throughout the application.
 */

// ---------------------------------------------------------------------------
// Waitlist Source Types
// ---------------------------------------------------------------------------

export type WaitlistSource = "playground" | "code_review"

// ---------------------------------------------------------------------------
// Tab Types
// ---------------------------------------------------------------------------

export type TabType = "cli" | "mcp" | "tour" | "playground" | "code-review"

// ---------------------------------------------------------------------------
// Analytics Event Types
// ---------------------------------------------------------------------------

export type AnalyticsEventType =
  | "waitlist_submitted"
  | "consulting_submitted"
  | "feedback_submitted"
  | "tab_clicked"
  | "search_performed"
  | "tour_started"
  | "lesson_started"
  | "step_completed"
  | "lesson_completed"

// ---------------------------------------------------------------------------
// HTTP Method Types
// ---------------------------------------------------------------------------

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

// ---------------------------------------------------------------------------
// Content Type Types
// ---------------------------------------------------------------------------

export type ContentType = "application/json" | "application/x-www-form-urlencoded" | "text/html"

// ---------------------------------------------------------------------------
// Cookie SameSite Types
// ---------------------------------------------------------------------------

export type CookieSameSite = "strict" | "lax" | "none"

// ---------------------------------------------------------------------------
// OAuth Grant Types
// ---------------------------------------------------------------------------

export type OAuthGrantType = "authorization_code" | "refresh_token" | "client_credentials"

// ---------------------------------------------------------------------------
// OAuth Response Types
// ---------------------------------------------------------------------------

export type OAuthResponseType = "code" | "token"

// ---------------------------------------------------------------------------
// Environment Types
// ---------------------------------------------------------------------------

export type AppEnvironment = "local" | "staging" | "production" | "test"
