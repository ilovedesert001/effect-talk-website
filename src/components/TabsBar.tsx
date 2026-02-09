"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"

interface TabItem {
  readonly label: string
  readonly href: string
  readonly isLocked: boolean
}

const tabs: readonly TabItem[] = [
  { label: "EffectPatterns CLI", href: "/cli", isLocked: false },
  { label: "EffectPatterns MCP Server", href: "/mcp", isLocked: false },
  { label: "Effect Tour", href: "/tour", isLocked: false },
  { label: "EffectPatterns Playground", href: "/playground", isLocked: true },
  { label: "EffectTalk Code Review", href: "/code-review", isLocked: true },
]

export function TabsBar() {
  const pathname = usePathname()

  return (
    <div className="border-b">
      <div className="container px-4 md:px-6">
        <nav className="flex gap-0 overflow-x-auto" role="tablist">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href === "/tour" && pathname?.startsWith("/tour"))
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
                  tab.isLocked && "opacity-70"
                )}
              >
                {tab.label}
                {tab.isLocked && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                {tab.isLocked && (
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
