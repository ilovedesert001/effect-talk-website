/**
 * Lightweight performance instrumentation for the pattern browser.
 * Active only in development; no-op in production.
 * Captures: filter/sort pipeline time, card render time, and optional paint marks.
 *
 * Effect Atom decision gate: Consider an effect-atom pilot only if, after Phases 1–4
 * (baseline, compute optimizations, render containment, virtualization), getPerfSnapshot()
 * still shows meaningful latency in state recomputation or URL sync. If so, pilot on one
 * slice (e.g. search query + derived filtered IDs) while keeping URL as the canonical
 * source of truth.
 */

const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development"

export interface PatternBrowserPerfSnapshot {
  readonly searchFilterMs: number
  readonly facetCountMs: number
  readonly filterApplyMs: number
  readonly sortMs: number
  readonly cardExtractSectionsMs: number
  readonly lastPaintFromInputMs: number | null
}

const snapshot: {
  searchFilterMs: number
  facetCountMs: number
  filterApplyMs: number
  sortMs: number
  cardExtractSectionsMs: number
  lastPaintFromInputMs: number | null
  inputTimestamp: number | null
} = {
  searchFilterMs: 0,
  facetCountMs: 0,
  filterApplyMs: 0,
  sortMs: 0,
  cardExtractSectionsMs: 0,
  lastPaintFromInputMs: null,
  inputTimestamp: null,
}

/**
 * Run a synchronous computation and record its duration under a label.
 * No-op in production; in dev updates internal snapshot and optionally logs.
 */
export function measureSync<T>(label: keyof PatternBrowserPerfSnapshot, fn: () => T): T {
  if (!isDev) return fn()
  const start = performance.now()
  try {
    return fn()
  } finally {
    const ms = performance.now() - start
    const key = label as keyof typeof snapshot
    if (key in snapshot && typeof snapshot[key] === "number") {
      (snapshot as Record<string, number>)[key] = ms
    }
  }
}

/** Record that user input (search or filter) just occurred; used to measure keystroke-to-paint. */
export function markInput(): void {
  if (!isDev) return
  snapshot.inputTimestamp = performance.now()
}

/** Call after paint (e.g. in requestAnimationFrame) to record last input-to-paint latency. */
export function recordPaintFromInput(): void {
  if (!isDev || snapshot.inputTimestamp === null) return
  snapshot.lastPaintFromInputMs = performance.now() - snapshot.inputTimestamp
  snapshot.inputTimestamp = null
}

/** Get current snapshot for baseline or comparison. */
export function getPerfSnapshot(): Readonly<PatternBrowserPerfSnapshot> {
  return {
    searchFilterMs: snapshot.searchFilterMs,
    facetCountMs: snapshot.facetCountMs,
    filterApplyMs: snapshot.filterApplyMs,
    sortMs: snapshot.sortMs,
    cardExtractSectionsMs: snapshot.cardExtractSectionsMs,
    lastPaintFromInputMs: snapshot.lastPaintFromInputMs,
  }
}

/** Log current snapshot to console (dev only). */
export function logPerfSnapshot(): void {
  if (!isDev) return
  const s = getPerfSnapshot()
  console.debug("[pattern-browser-perf]", s)
}
