"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackProvider,
} from "@codesandbox/sandpack-react"

interface TourCodeRunnerProps {
  readonly code: string
  readonly readOnly?: boolean
}

/**
 * Embedded code runner using Sandpack with Effect.js pre-configured.
 * Replaces static CodeHighlight for runnable tour steps.
 * 
 * Note: Sandpack generates random IDs that cause hydration mismatches,
 * so we only render it after the component has mounted on the client.
 */
export function TourCodeRunner({ code, readOnly = false }: TourCodeRunnerProps) {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait for component to mount on client to avoid hydration mismatch
  // Sandpack generates random IDs that differ between SSR and client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine current theme (system theme fallback)
  const currentTheme = mounted
    ? theme === "system"
      ? systemTheme ?? "light"
      : theme ?? "light"
    : "light"

  // Don't render Sandpack during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30">
        <div className="text-sm text-muted-foreground">Loading code editor...</div>
      </div>
    )
  }

  return (
    <div
      className="h-full w-[380px] min-h-[500px] mx-auto flex flex-col rounded-md border border-border bg-background shadow-sm tour-code-runner"
    >
      <div className="px-3 py-1.5 text-[0.65rem] font-medium border-b bg-muted/50">
        Code
      </div>
      <SandpackProvider
        template="vanilla-ts"
        customSetup={{
          dependencies: {
            effect: "latest",
          },
          entry: "/index.ts",
        }}
        files={{
          "/index.ts": {
            code,
            readOnly,
            active: true,
          },
        }}
        // Force light theme for readability against the lesson's dark-muted panel.
        // We can switch this back to dynamic theme once layout is stable.
        theme="light"
        options={{
          autorun: true,
          recompileMode: "immediate",
          recompileDelay: 300,
        }}
      >
        <div className="flex flex-col h-full min-h-[500px]">
          <div className="min-h-0 h-full flex-1">
            <SandpackCodeEditor
              showTabs={false}
              showLineNumbers
              showInlineErrors
              wrapContent
              readOnly={readOnly}
              showReadOnly={false}
            />
          </div>
          <div className="px-3 py-1.5 text-[0.65rem] font-medium border-y bg-muted/50">
            Console
          </div>
          <div className="h-[140px] max-h-[140px] overflow-auto">
            <SandpackConsole resetOnPreviewRestart />
          </div>
        </div>
      </SandpackProvider>
    </div>
  )
}
