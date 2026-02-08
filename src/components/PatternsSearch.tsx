"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PatternsSearchProps {
  readonly className?: string
}

export function PatternsSearch({ className }: PatternsSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryParam = searchParams.get("q") ?? ""
  const [localQuery, setLocalQuery] = useState(queryParam)

  // Sync local state with URL param on mount or when URL changes externally
  useEffect(() => {
    setLocalQuery(queryParam)
  }, [queryParam])

  // Debounced URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (localQuery.trim()) {
        params.set("q", localQuery.trim())
      } else {
        params.delete("q")
      }
      router.replace(`?${params.toString()}`, { scroll: false })
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, router, searchParams])

  const handleClear = useCallback(() => {
    setLocalQuery("")
  }, [])

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search patterns..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {localQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
