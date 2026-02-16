import { authkitMiddleware } from "@workos-inc/authkit-nextjs"
// Validate required env on every request (fail fast if missing)
import "@/lib/env"

/**
 * WorkOS AuthKit middleware: handles session management and token refresh.
 * Configured to eagerly refresh sessions to ensure persistence across requests.
 */
export default authkitMiddleware({
  debug: process.env.NODE_ENV !== "production",
  eagerAuth: true, // Eagerly refresh sessions to ensure persistence
})

// Apply middleware to all routes so withAuth() works everywhere
// Individual pages/components handle their own auth requirements
export const config = {
  matcher: [
    // Match all request paths to ensure middleware runs everywhere
    "/:path*",
  ],
}
