"use client"

import { Sandpack } from "@codesandbox/sandpack-react"

const testCode = `import { Effect } from "effect"

const program = Effect.gen(function* () {
  yield* Effect.log("Hello from Effect!")
  const value = yield* Effect.succeed(42)
  yield* Effect.log(\`The answer is: \${value}\`)
  return value
})

Effect.runSync(program)
`

export function TestSandpackClient() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Sandpack + Effect.js Test</h1>
      <p className="mb-4 text-muted-foreground">
        Testing if Effect.js imports and runs correctly in Sandpack.
      </p>
      <Sandpack
        template="vanilla-ts"
        customSetup={{
          dependencies: {
            effect: "latest"
          },
          entry: "/index.ts"
        }}
        files={{
          "/index.ts": testCode
        }}
        options={{
          showConsole: true,
          showTabs: false,
          editorHeight: 300,
          editorWidthPercentage: 50,
        }}
      />
    </div>
  )
}
