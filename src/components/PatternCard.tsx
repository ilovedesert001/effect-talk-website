"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { getCachedPatternSections } from "@/lib/extractPatternSections"
import { difficultyDisplayLabel } from "@/lib/difficulty"
import { measureSync } from "@/lib/pattern-browser-perf"
import { CodeHighlight } from "@/components/CodeHighlight"
import type { Pattern } from "@/services/BackendApi"

interface PatternCardProps {
  readonly pattern: Pattern
}

function PatternCardInner({ pattern }: PatternCardProps) {
  const sections = useMemo(
    () =>
      measureSync("cardExtractSectionsMs", () => getCachedPatternSections(pattern.id, pattern.content)),
    [pattern.id, pattern.content],
  )

  const goalText = sections.goal?.text ?? null
  const patternCode = sections.pattern?.codeBlocks[0] ?? null
  const antiPatternCode = sections.antiPattern?.codeBlocks[0] ?? null

  // Fallback: if we have neither pattern nor anti-pattern code,
  // show the first code block from any section
  const fallbackCode = !patternCode && !antiPatternCode
    ? sections.allSections.flatMap((s) => s.codeBlocks)[0] ?? null
    : null

  const hasCodePreviews = patternCode || antiPatternCode || fallbackCode

  return (
    <Link href={`/patterns/${pattern.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className="hover:bg-muted/50 hover:shadow-md transition-all duration-200 group h-full gap-4 py-4">
        {/* Header: category labels on top, then title + description */}
        <CardHeader className="pb-1 pt-1">
          {(pattern.new || pattern.difficulty || pattern.category) && (
            <div className="flex flex-wrap gap-1 mb-1">
              {pattern.new && (
                <Badge variant="outline" className="text-xs bg-success/10 border-success/50 text-success">
                  New
                </Badge>
              )}
              {pattern.difficulty && (
                <Badge variant="outline" className="text-xs bg-tag-level/10 border-tag-level/50 text-tag-level">
                  {difficultyDisplayLabel(pattern.difficulty)}
                </Badge>
              )}
              {pattern.category && (
                <Badge variant="outline" className="text-xs bg-tag-category/10 border-tag-category/50 text-tag-category">
                  {pattern.category}
                </Badge>
              )}
            </div>
          )}
          <CardTitle className="text-sm group-hover:text-primary transition-colors">
            {pattern.title}
          </CardTitle>
          <CardDescription className="mt-0.5 line-clamp-1 text-xs">
            {pattern.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          {/* Goal / background text */}
          {goalText && (
            <div className="mt-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Goal
              </p>
              <p className="text-xs text-foreground/80 line-clamp-2 leading-snug">
                {goalText}
              </p>
            </div>
          )}

          {/* Code previews: Pattern and Anti-Pattern side by side */}
          {hasCodePreviews && (
            <div className="grid grid-cols-1 gap-2">
              {/* Pattern (the good way) */}
              {patternCode && (
                <CodePreviewBlock
                  label="Pattern"
                  variant="good"
                  code={patternCode.code}
                  language={patternCode.language}
                />
              )}

              {/* Anti-Pattern (the bad way) */}
              {antiPatternCode && (
                <CodePreviewBlock
                  label="Anti-Pattern"
                  variant="bad"
                  code={antiPatternCode.code}
                  language={antiPatternCode.language}
                />
              )}

              {/* Fallback: first code block when no explicit sections match */}
              {fallbackCode && (
                <CodePreviewBlock
                  label="Example"
                  variant="good"
                  code={fallbackCode.code}
                  language={fallbackCode.language}
                />
              )}
            </div>
          )}
        </CardContent>

        {/* Tags footer */}
        {pattern.tags && pattern.tags.length > 0 && (
          <CardFooter className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {pattern.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </Link>
  )
}

export const PatternCard = memo(PatternCardInner)

// ---------------------------------------------------------------------------
// Code preview block sub-component (lazy: only render highlight when in view)
// ---------------------------------------------------------------------------

interface CodePreviewBlockProps {
  readonly label: string
  readonly variant: "good" | "bad"
  readonly code: string
  readonly language: string | null
}

function CodePreviewBlock({ label, variant, code, language }: CodePreviewBlockProps) {
  const borderColor = variant === "good"
    ? "border-l-success/60"
    : "border-l-destructive/60"

  const labelColor = variant === "good"
    ? "text-success"
    : "text-destructive"

  const dotColor = variant === "good"
    ? "bg-success"
    : "bg-destructive"

  return (
    <div className={`relative rounded-md border border-l-[3px] ${borderColor} bg-muted/50 overflow-hidden flex flex-col min-h-0`}>
      {/* Label */}
      <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 shrink-0">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
      </div>

      {/* Code block: defer highlight until in view to reduce initial JS cost */}
      <div className="px-2.5 pb-2.5 overflow-x-auto">
        <LazyCodeHighlight code={code} language={language} className="text-[10px] leading-snug" />
      </div>
    </div>
  )
}

interface LazyCodeHighlightProps {
  readonly code: string
  readonly language: string | null
  readonly className?: string
}

function LazyCodeHighlight({ code, language, className }: LazyCodeHighlightProps) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true)
      },
      { rootMargin: "100px", threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{ minHeight: "2.5rem" }}>
      {isVisible ? (
        <CodeHighlight code={code} language={language} className={className} />
      ) : (
        <pre className="text-xs font-mono text-muted-foreground">…</pre>
      )}
    </div>
  )
}
