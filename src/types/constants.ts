/**
 * Global constants for magic numbers and string literals.
 */

// ---------------------------------------------------------------------------
// Time Constants (in seconds)
// ---------------------------------------------------------------------------

export const SECONDS_PER_MINUTE = 60
export const MINUTES_PER_HOUR = 60
export const HOURS_PER_DAY = 24
export const DAYS_PER_MONTH = 30

export const SESSION_MAX_AGE_SECONDS = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY * DAYS_PER_MONTH // 30 days
export const CACHE_REVALIDATE_SECONDS = 300 // 5 minutes

// ---------------------------------------------------------------------------
// API Key Constants
// ---------------------------------------------------------------------------

export const API_KEY_PREFIX = "ek_" as const
export const API_KEY_PREFIX_LENGTH = 10 // "ek_" + 7 hex chars
export const API_KEY_RANDOM_BYTES = 20 // Produces 40 hex chars
export const API_KEY_HEX_LENGTH = 40 // Random hex characters in token
export const API_KEY_TOKEN_LENGTH = 43 // "ek_" + 40 hex chars
export const SHA256_HASH_LENGTH = 64 // SHA-256 produces 64 hex chars

// ---------------------------------------------------------------------------
// HTTP Constants
// ---------------------------------------------------------------------------

export const HTTP_METHOD_POST = "POST" as const
export const HTTP_METHOD_GET = "GET" as const

export const CONTENT_TYPE_JSON = "application/json" as const

export const AUTH_SCHEME_BEARER = "Bearer" as const

export const OAUTH_GRANT_TYPE_AUTHORIZATION_CODE = "authorization_code" as const
export const OAUTH_RESPONSE_TYPE_CODE = "code" as const

// ---------------------------------------------------------------------------
// Cookie Constants
// ---------------------------------------------------------------------------

export const COOKIE_SAME_SITE_LAX = "lax" as const
export const COOKIE_PATH_ROOT = "/" as const

// ---------------------------------------------------------------------------
// WorkOS Constants
// ---------------------------------------------------------------------------

export const WORKOS_API_BASE_URL = "https://api.workos.com" as const
export const WORKOS_AUTHORIZE_ENDPOINT = `${WORKOS_API_BASE_URL}/user_management/authorize` as const
export const WORKOS_AUTHENTICATE_ENDPOINT = `${WORKOS_API_BASE_URL}/user_management/authenticate` as const

export const WORKOS_PLACEHOLDER_CHECK = "xxx" as const

// ---------------------------------------------------------------------------
// Email Constants
// ---------------------------------------------------------------------------

export const EMAIL_FROM_ADDRESS = "EffectTalk <noreply@effecttalk.com>" as const
export const FEEDBACK_RECIPIENT_EMAIL = "paul@effecttalk.com" as const
export const EMAIL_PATTERNS_LINK = "https://effecttalk.com/patterns" as const
export const BUSINESS_DAYS_RESPONSE_TIME = 2

// ---------------------------------------------------------------------------
// External Links
// ---------------------------------------------------------------------------

export const EFFECT_PATTERNS_GITHUB_URL =
  "https://github.com/PaulJPhilp/EffectPatterns" as const

// ---------------------------------------------------------------------------
// Product Names
// ---------------------------------------------------------------------------

export const PRODUCT_NAME_PLAYGROUND = "EffectPatterns Playground" as const
export const PRODUCT_NAME_CODE_REVIEW = "EffectTalk Code Review" as const

// ---------------------------------------------------------------------------
// Default Values
// ---------------------------------------------------------------------------

export const DEFAULT_API_KEY_PEPPER = "default-pepper-change-me" as const
export const DEFAULT_BACKEND_API_BASE_URL = "http://localhost:4000" as const
export const DEFAULT_APP_ENV = "local" as const

// ---------------------------------------------------------------------------
// JSON Formatting
// ---------------------------------------------------------------------------

export const JSON_INDENT_SPACES = 2
