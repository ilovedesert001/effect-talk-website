"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PatternsSearch } from "@/components/PatternsSearch"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FacetCount {
  readonly value: string
  readonly count: number
}

interface PatternsSidebarProps {
  readonly categories: readonly FacetCount[]
  readonly activeCategory: string | null
  readonly onCategoryChange: (category: string | null) => void
  readonly onClearAll: () => void
  readonly className?: string
}

export function PatternsSidebar({
  categories,
  activeCategory,
  onCategoryChange,
  onClearAll,
  className,
}: PatternsSidebarProps) {
  const hasActiveFilters = activeCategory !== null

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

        {/* Search */}
        <PatternsSearch />

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
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
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
                  <span className="truncate text-blue-900 dark:text-blue-300">{cat.value}</span>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {cat.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </aside>
  )
}
