/**
 * Extract the first code block from pattern HTML content for inline preview.
 */

export interface CodePreview {
  readonly code: string
  readonly language: string | null
}

/**
 * Extracts the first code block from HTML content.
 * Looks for `<pre><code>` or `<pre><code class="language-xxx">` patterns.
 *
 * @param html - The HTML content string
 * @param maxLines - Maximum number of lines to return (default: 6)
 * @returns Code preview with code text and detected language, or null if no code block found
 */
export function extractCodePreview(html: string, maxLines = 6): CodePreview | null {
  if (!html) return null

  // Use a simple regex to find the first <pre><code> block
  // This handles both <pre><code> and <pre><code class="language-xxx">
  // Use [\s\S] instead of . with s flag for ES2017 compatibility
  const codeBlockMatch = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i)

  if (!codeBlockMatch) return null

  const codeHtml = codeBlockMatch[1]

  // Extract language from class attribute if present
  const languageMatch = codeBlockMatch[0].match(/class=["'][^"']*language-(\w+)/i)
  const language = languageMatch ? languageMatch[1] : null

  // Decode HTML entities and extract text content
  // Simple approach: remove HTML tags and decode common entities
  const code = codeHtml
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()

  if (!code) return null

  // Split into lines and take first maxLines
  const lines = code.split("\n")
  const previewLines = lines.slice(0, maxLines)
  const previewCode = previewLines.join("\n")

  // If there are more lines, indicate truncation (optional - we'll handle styling in the component)
  return {
    code: previewCode,
    language,
  }
}
