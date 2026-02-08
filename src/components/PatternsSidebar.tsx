"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FacetCount {
  readonly value: string
  readonly count: number
}

interface PatternsSidebarProps {
  readonly categories: readonly FacetCount[]
  readonly difficulties: readonly FacetCount[]
  readonly tags: readonly FacetCount[]
  readonly activeCategory: string | null
  readonly activeDifficulty: string | null
  readonly activeTags: readonly string[]
  readonly onCategoryChange: (category: string | null) => void
  readonly onDifficultyChange: (difficulty: string | null) => void
  readonly onTagToggle: (tag: string) => void
  readonly onClearAll: () => void
  readonly className?: string
}

const MAX_VISIBLE_TAGS = 10

export function PatternsSidebar({
  categories,
  difficulties,
  tags,
  activeCategory,
  activeDifficulty,
  activeTags,
  onCategoryChange,
  onDifficultyChange,
  onTagToggle,
  onClearAll,
  className,
}: PatternsSidebarProps) {
  const [showAllTags, setShowAllTags] = useState(false)
  const hasActiveFilters = activeCategory !== null || activeDifficulty !== null || activeTags.length > 0

  const visibleTags = showAllTags ? tags : tags.slice(0, MAX_VISIBLE_TAGS)
  const hasMoreTags = tags.length > MAX_VISIBLE_TAGS

  return (
    <aside className={cn("w-full md:w-60 shrink-0", className)}>
      <div className="sticky top-20 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Category
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onCategoryChange(null)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between",
                  activeCategory === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <span>All</span>
                <Badge variant="secondary" className="text-xs">
                  {categories.reduce((sum, cat) => sum + cat.count, 0)}
                </Badge>
              </button>
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => onCategoryChange(cat.value === activeCategory ? null : cat.value)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between",
                    activeCategory === cat.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span className="truncate">{cat.value}</span>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                    {cat.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Difficulty */}
        {difficulties.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Difficulty
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onDifficultyChange(null)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between",
                  activeDifficulty === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <span>All</span>
                <Badge variant="secondary" className="text-xs">
                  {difficulties.reduce((sum, diff) => sum + diff.count, 0)}
                </Badge>
              </button>
              {difficulties.map((diff) => (
                <button
                  type="button"
                  key={diff.value}
                  onClick={() => onDifficultyChange(diff.value === activeDifficulty ? null : diff.value)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between",
                    activeDifficulty === diff.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span className="capitalize">{diff.value}</span>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                    {diff.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Tags
            </h3>
            <div className="space-y-1">
              {visibleTags.map((tag) => {
                const isActive = activeTags.includes(tag.value)
                return (
                  <button
                    type="button"
                    key={tag.value}
                    onClick={() => onTagToggle(tag.value)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="truncate">{tag.value}</span>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      {tag.count}
                    </Badge>
                  </button>
                )
              })}
              {hasMoreTags && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="w-full justify-start text-xs h-7"
                >
                  {showAllTags ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show {tags.length - MAX_VISIBLE_TAGS} more
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
