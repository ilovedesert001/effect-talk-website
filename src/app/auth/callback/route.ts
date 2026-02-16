import { handleAuth } from "@workos-inc/authkit-nextjs"
import { Effect } from "effect"
import { upsertUser } from "@/services/Db/api"
import { setSessionCookie } from "@/services/Auth"

const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000"

/**
 * WorkOS AuthKit callback: SDK exchanges the code and sets its session.
 * We upsert the user into our DB and set our session cookie so getCurrentUser() and API routes keep working.
 */
export const GET = handleAuth({
  returnPathname: "/settings",
  baseURL: appBaseUrl,
  onSuccess: async ({ user }) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined
    try {
      const dbUser = await Effect.runPromise(
        upsertUser({
          workosId: user.id,
          email: user.email,
          name: name || undefined,
          avatarUrl: user.profilePictureUrl ?? undefined,
        })
      )
      await setSessionCookie(dbUser.id)
      console.log("[Auth callback] User upserted and session cookie set for:", user.email, "DB ID:", dbUser.id)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error("[Auth callback] upsert/session failed:", err.message, err.name)
      if (err.cause) console.error("[Auth callback] cause:", err.cause)
      throw error
    }
  },
})
