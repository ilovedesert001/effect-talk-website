"use client"

import { useMemo } from "react"
import { highlight } from "sugar-high"
import { cn } from "@/lib/utils"

interface CodeHighlightProps {
  readonly code: string
  readonly language: string | null
  readonly className?: string
}

/**
 * Client-side syntax-highlighted code block using sugar-high.
 * Sugar-high is < 1KB and outputs HTML with CSS class names for token types:
 *   .sh__line, .sh__token--keyword, .sh__token--string, etc.
 *
 * Styling is handled by CSS custom properties defined in globals.css.
 */
export function CodeHighlight({ code, className }: CodeHighlightProps) {
  const highlightedHtml = useMemo(() => highlight(code), [code])

  return (
    <pre className={cn("text-xs font-mono leading-relaxed overflow-x-auto sh-code", className)}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sugar-high returns pre-escaped HTML tokens */}
      <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
    </pre>
  )
}
