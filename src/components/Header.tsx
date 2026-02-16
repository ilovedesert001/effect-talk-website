import Link from "next/link"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AvatarMenu } from "@/components/AvatarMenu"
import { PostHogIdentify } from "@/components/PostHogIdentify"
import { ThemeToggle } from "@/components/ThemeToggle"
import { TourProgressSyncer } from "@/components/tour/TourProgressSyncer"
import { getCurrentUser } from "@/services/Auth"
import { EFFECT_PATTERNS_GITHUB_URL } from "@/types/constants"

export async function Header() {
  const user = await getCurrentUser()
  const isLoggedIn = Boolean(user)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <PostHogIdentify userId={user?.id ?? null} />
      <TourProgressSyncer isLoggedIn={isLoggedIn} />
      <div className="container flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm font-mono">
            Effect
          </span>
          <span>Talk</span>
        </Link>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a
              href={EFFECT_PATTERNS_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              <span>Effect Patterns</span>
            </a>
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/blog">Blog</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/consulting">Consulting</Link>
          </Button>
          <AvatarMenu user={user} />
        </div>
      </div>
    </header>
  )
}
