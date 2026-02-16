import { authkitMiddleware } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"

const workosMiddleware = authkitMiddleware({
  debug: process.env.NODE_ENV !== "production",
  eagerAuth: true,
})

/**
 * WorkOS AuthKit middleware. On missing/invalid WORKOS_* env the SDK may throw;
 * catch and pass through so we never 500 (MIDDLEWARE_INVOCATION_FAILED).
 */
export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  try {
    return await workosMiddleware(request, event)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/:path*"],
}
