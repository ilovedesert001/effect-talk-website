/**
 * Extract structured sections (Goal, Pattern, Anti-Pattern) from pattern HTML content.
 *
 * Pattern HTML typically contains h2 headings that delimit sections:
 *   <h2>Goal</h2>, <h2>Pattern</h2>, <h2>Anti-Pattern</h2>, etc.
 *
 * This utility parses the HTML into labelled sections with text and code blocks.
 */

export interface CodeBlock {
  readonly code: string
  readonly language: string | null
}

export interface PatternSection {
  /** The heading text (e.g. "Goal", "Pattern", "Anti-Pattern") */
  readonly heading: string
  /** Plain text content (paragraphs, list items) joined together */
  readonly text: string
  /** Code blocks found in this section */
  readonly codeBlocks: readonly CodeBlock[]
}

export interface PatternSections {
  readonly goal: PatternSection | null
  readonly pattern: PatternSection | null
  readonly antiPattern: PatternSection | null
  readonly allSections: readonly PatternSection[]
}

// ---------------------------------------------------------------------------
// Heading matching — uses exact match first, then prefix matching
// ---------------------------------------------------------------------------

const GOAL_EXACT = new Set([
  "guideline", "rationale", "key insight", "key concepts",
  "goal", "background", "problem", "motivation", "context", "overview",
])

const GOAL_PREFIXES = [
  "guideline", "rationale", "key insight",
]

const PATTERN_EXACT = new Set([
  "good example", "good example (the effect way)",
  "the effect solution", "pattern", "solution", "implementation",
])

const PATTERN_PREFIXES = [
  "good example",
]

const ANTI_PATTERN_EXACT = new Set([
  "anti-pattern", "anti-pattern (the promise way)",
  "anti-pattern: mental model mismatch",
  "the problem with promises", "common mistakes",
  "antipattern", "anti pattern",
])

const ANTI_PATTERN_PREFIXES = [
  "anti-pattern", "common mistake",
]

function matchesHeadingSet(heading: string, exact: Set<string>, prefixes: string[]): boolean {
  const lower = heading.toLowerCase()
  if (exact.has(lower)) return true
  return prefixes.some((prefix) => lower.startsWith(prefix))
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

function extractTextContent(html: string): string {
  // Remove code blocks first so we don't include code in the text summary
  const withoutCode = html.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, "")
  return stripHtmlTags(withoutCode)
    .replace(/\s+/g, " ")
    .replace(/\s*---\s*/g, " ") // Remove MDX horizontal rule remnants
    .trim()
}

function extractCodeBlocks(html: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const codeBlockRegex = /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi

  let match: RegExpExecArray | null = codeBlockRegex.exec(html)
  while (match !== null) {
    const codeHtml = match[1]
    const languageMatch = match[0].match(/class=["'][^"']*language-(\w+)/i)
    const language = languageMatch ? languageMatch[1] : null

    const code = stripHtmlTags(codeHtml).trim()
    if (code) {
      blocks.push({ code, language })
    }
    match = codeBlockRegex.exec(html)
  }

  return blocks
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Split HTML content by `<h2>` headings into labelled sections,
 * then identify Goal / Pattern / Anti-Pattern sections.
 */
export function extractPatternSections(html: string): PatternSections {
  if (!html) {
    return { goal: null, pattern: null, antiPattern: null, allSections: [] }
  }

  // Split by <h2> headings while capturing the heading text
  // This produces alternating [content-before-first-h2, heading1, content1, heading2, content2, ...]
  const parts = html.split(/<h2[^>]*>([\s\S]*?)<\/h2>/i)

  const sections: PatternSection[] = []

  // parts[0] is content before first h2 (if any) — skip it or treat as intro
  for (let i = 1; i < parts.length; i += 2) {
    const heading = stripHtmlTags(parts[i]).trim()
    const body = parts[i + 1] ?? ""

    sections.push({
      heading,
      text: extractTextContent(body),
      codeBlocks: extractCodeBlocks(body),
    })
  }

  // Match sections to roles using exact + prefix matching
  const findSection = (exact: Set<string>, prefixes: string[]): PatternSection | null =>
    sections.find((s) => matchesHeadingSet(s.heading, exact, prefixes)) ?? null

  return {
    goal: findSection(GOAL_EXACT, GOAL_PREFIXES),
    pattern: findSection(PATTERN_EXACT, PATTERN_PREFIXES),
    antiPattern: findSection(ANTI_PATTERN_EXACT, ANTI_PATTERN_PREFIXES),
    allSections: sections,
  }
}

const SECTIONS_CACHE_MAX = 500
const sectionsCache = new Map<string, PatternSections>()

/**
 * Return extracted sections for a pattern, using a cache keyed by id to avoid re-parsing HTML.
 */
export function getCachedPatternSections(id: string, content: string): PatternSections {
  const cached = sectionsCache.get(id)
  if (cached !== undefined) return cached
  if (sectionsCache.size >= SECTIONS_CACHE_MAX) sectionsCache.clear()
  const sections = extractPatternSections(content)
  sectionsCache.set(id, sections)
  return sections
}

/**
 * Truncate code to a maximum number of lines.
 */
export function truncateCode(code: string, maxLines: number): string {
  const lines = code.split("\n")
  if (lines.length <= maxLines) return code
  return lines.slice(0, maxLines).join("\n")
}
