"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PatternsSearch } from "@/components/PatternsSearch"
import { PatternsSidebar } from "@/components/PatternsSidebar"
import { PatternCard } from "@/components/PatternCard"
import type { Pattern } from "@/services/BackendApi"
import { cn } from "@/lib/utils"

interface PatternsBrowserProps {
  readonly patterns: readonly Pattern[]
}

interface FacetCount {
  readonly value: string
  readonly count: number
}

/**
 * Client-side filtering and browsing for patterns.
 * All patterns are passed from server, then filtered client-side for instant UX.
 * Filter state is synced with URL search params for deep linking.
 */
export function PatternsBrowser({ patterns }: PatternsBrowserProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read filter state from URL params
  const query = searchParams.get("q")?.toLowerCase().trim() ?? ""
  const activeCategory = searchParams.get("category") ?? null
  const activeDifficulty = searchParams.get("difficulty")?.toLowerCase() ?? null
  const activeTags = searchParams.getAll("tag")
  const activeNewOnly = searchParams.get("new") === "1"

  // Compute available facets from ALL patterns (not filtered subset)
  const { categories, difficulties, tags, newCount } = useMemo(() => {
    const categoryMap = new Map<string, number>()
    const difficultyMap = new Map<string, number>()
    const tagMap = new Map<string, number>()
    let newPatternCount = 0

    for (const pattern of patterns) {
      if (pattern.new) newPatternCount++
      if (pattern.category) {
        categoryMap.set(pattern.category, (categoryMap.get(pattern.category) ?? 0) + 1)
      }
      if (pattern.difficulty) {
        const diffLower = pattern.difficulty.toLowerCase()
        difficultyMap.set(diffLower, (difficultyMap.get(diffLower) ?? 0) + 1)
      }
      if (pattern.tags) {
        for (const tag of pattern.tags) {
          tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
        }
      }
    }

    const toFacetArray = (map: Map<string, number>): FacetCount[] =>
      Array.from(map.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)

    return {
      categories: toFacetArray(categoryMap),
      difficulties: toFacetArray(difficultyMap),
      tags: toFacetArray(tagMap),
      newCount: newPatternCount,
    }
  }, [patterns])

  // Filter patterns client-side
  const filteredPatterns = useMemo(() => {
    return patterns.filter((pattern) => {
      // Text search (query)
      if (query) {
        const searchable = `${pattern.title} ${pattern.description} ${pattern.tags?.join(" ") ?? ""}`.toLowerCase()
        if (!searchable.includes(query)) {
          return false
        }
      }

      // Category filter
      if (activeCategory && pattern.category !== activeCategory) {
        return false
      }

      // Difficulty filter
      if (activeDifficulty && pattern.difficulty?.toLowerCase() !== activeDifficulty) {
        return false
      }

      // Tag filters (AND logic - pattern must have ALL selected tags)
      if (activeTags.length > 0) {
        const patternTags = pattern.tags ?? []
        const hasAllTags = activeTags.every((tag) => patternTags.includes(tag))
        if (!hasAllTags) {
          return false
        }
      }

      // New-only filter
      if (activeNewOnly && !pattern.new) {
        return false
      }

      return true
    })
  }, [patterns, query, activeCategory, activeDifficulty, activeTags, activeNewOnly])

  // Update URL params when filters change
  const updateSearchParams = (updates: {
    category?: string | null
    difficulty?: string | null
    tag?: string | null | string[]
    new?: boolean | null
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.category !== undefined) {
      if (updates.category) {
        params.set("category", updates.category)
      } else {
        params.delete("category")
      }
    }

    if (updates.difficulty !== undefined) {
      if (updates.difficulty) {
        params.set("difficulty", updates.difficulty)
      } else {
        params.delete("difficulty")
      }
    }

    if (updates.tag !== undefined) {
      params.delete("tag")
      if (Array.isArray(updates.tag) && updates.tag.length > 0) {
        for (const tag of updates.tag) {
          params.append("tag", tag)
        }
      } else if (typeof updates.tag === "string") {
        params.append("tag", updates.tag)
      }
    }

    if (updates.new !== undefined) {
      if (updates.new) {
        params.set("new", "1")
      } else {
        params.delete("new")
      }
    }

    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleCategoryChange = (category: string | null) => {
    updateSearchParams({ category })
  }

  const handleDifficultyChange = (difficulty: string | null) => {
    updateSearchParams({ difficulty })
  }

  const handleTagToggle = (tag: string) => {
    const currentTags = activeTags
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]
    updateSearchParams({ tag: newTags.length > 0 ? newTags : null })
  }

  const handleNewFilterChange = (newOnly: boolean) => {
    updateSearchParams({ new: newOnly || null })
  }

  const hasActiveFilters =
    activeCategory !== null ||
    activeDifficulty !== null ||
    activeTags.length > 0 ||
    activeNewOnly

  const handleClearAll = () => {
    router.replace("/patterns", { scroll: false })
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar - hidden on mobile, shown on md+ */}
      {patterns.length > 0 && (
        <div className="hidden md:block">
          <PatternsSidebar
            categories={categories}
            difficulties={difficulties}
            tags={tags}
            newCount={newCount}
            activeCategory={activeCategory}
            activeDifficulty={activeDifficulty}
            activeTags={activeTags}
            activeNewOnly={activeNewOnly}
            onCategoryChange={handleCategoryChange}
            onDifficultyChange={handleDifficultyChange}
            onTagToggle={handleTagToggle}
            onNewFilterChange={handleNewFilterChange}
            onClearAll={handleClearAll}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {/* Search bar - only show if there are patterns */}
        {patterns.length > 0 && (
          <div className="mb-6">
            <PatternsSearch />
          </div>
        )}

        {/* Result count */}
        {patterns.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredPatterns.length === patterns.length ? (
                <>Showing all {patterns.length} patterns</>
              ) : (
                <>
                  Showing {filteredPatterns.length} of {patterns.length} patterns
                </>
              )}
            </p>
          </div>
        )}

        {/* Pattern cards grid */}
        {patterns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No patterns available.</p>
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No patterns found matching your filters.</p>
            {(query || activeCategory || activeDifficulty || activeTags.length > 0 || activeNewOnly) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredPatterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
