#!/usr/bin/env bun

/**
 * Seed script: loads tour lessons and steps into STAGING tables.
 *
 * Uses deterministic UUIDs so that tour_progress.step_id references
 * survive blue-green table swaps.
 *
 * Usage: bun run scripts/seed-tour.ts
 *
 * After seeding, run `bun run db:promote tour` to swap staging → live.
 */

import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { tourLessonsStaging, tourStepsStaging, patterns, contentDeployments } from "../src/db/schema"
import { lessonId, stepId } from "./lib/deterministic-ids"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(rootDir, "..", ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local")
  process.exit(1)
}

const db = drizzle(databaseUrl)

// ---------------------------------------------------------------------------
// Lesson 1: Effects Are Lazy Blueprints
// ---------------------------------------------------------------------------

const lesson1Steps = [
  {
    orderIndex: 1,
    title: "Your first Effect",
    patternTitle: "Hello World: Your First Effect",
    instruction: `Effects are descriptions of programs, not the programs themselves. They don't execute until you explicitly run them.

In the anti-pattern, we might think Effects execute immediately. In the Effect way, we understand they're lazy blueprints.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Thinking Effects execute immediately
const myEffect = Effect.succeed(42)
console.log(myEffect) // This logs the Effect object, not 42!

// We might expect this to work, but Effects are lazy
const result = myEffect // ❌ This is still an Effect, not a value!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

// Effect way: Understanding laziness
const myEffect = Effect.succeed(42)

// Effects don't execute until you explicitly run them
const result = Effect.runSync(myEffect)
console.log(result) // 42 - Now we get the actual value!`,
    hints: [
      "Use `Effect.succeed(value)` to create an Effect that immediately succeeds with a value",
      "Use `Effect.runSync(effect)` to execute a synchronous Effect",
      "Remember to import `Effect` from the 'effect' package",
    ],
    feedbackOnComplete:
      "Perfect! You've created your first Effect. Notice how `Effect.succeed(42)` doesn't do anything until you call `Effect.runSync`. This laziness is fundamental to Effect - it separates the description of what you want to do from actually doing it.",
  },
  {
    orderIndex: 2,
    title: "Effect.sync: when does the code run?",
    patternTitle: "Wrap Synchronous Computations with sync and try",
    instruction: `Use \`Effect.sync\` to wrap synchronous code (including side effects) in an Effect. The code inside \`Effect.sync\` does not run when you call it—it runs only when you execute the Effect.

Watch the log order: you'll see "1" and "3" first; "2" appears only after you run the Effect.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Expecting immediate execution
console.log("1. Before creating Effect")

const effect = Effect.sync(() => {
  console.log("2. Inside Effect") // ❌ This never runs!
  return "done"
})

console.log("3. After creating Effect")

// If we expected immediate execution, we'd see all three logs
// But we only see 1 and 3 - the Effect is just a description!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

// Effect way: Understanding that Effects are descriptions
console.log("1. Before creating Effect")

const effect = Effect.sync(() => {
  console.log("2. Inside Effect")
  return "done"
})

console.log("3. After creating Effect (but before running)")

// Only logs 1 and 3 appear! The Effect hasn't run yet.
// To see log 2, you'd need to run: Effect.runSync(effect)`,
    hints: [
      "Use `Effect.sync(() => { ... })` to wrap synchronous code in an Effect",
      "The code inside `Effect.sync` doesn't execute until you run the Effect",
      "Try running the Effect with `Effect.runSync(effect)` to see all three logs",
    ],
    feedbackOnComplete:
      "Effect.sync defers execution: the callback runs only when you run the Effect. This lets you wrap imperative code and still get lazy, composable behavior.",
  },
  {
    orderIndex: 3,
    title: "Chain effects with .pipe and Effect.map",
    patternTitle: "Transform Values with Effect.map",
    instruction: `Effects can be transformed and chained together using \`.pipe()\` and methods like \`Effect.map\`.

Transform an Effect that succeeds with the number 5 into an Effect that succeeds with the string "The result is 10" (multiply by 2, then format as a string).`,
    conceptCode: `import { Effect } from "effect"

const numberEffect = Effect.succeed(5)

// TODO: Transform this Effect to multiply by 2, then format as "The result is 10"
const stringEffect = numberEffect // ...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const numberEffect = Effect.succeed(5)

const stringEffect = numberEffect.pipe(
  Effect.map((n) => n * 2),
  Effect.map((n) => \`The result is \${n}\`)
)

const result = Effect.runSync(stringEffect)
console.log(result) // "The result is 10"`,
    hints: [
      "Use `.pipe()` to chain transformations",
      "Use `Effect.map(fn)` to transform the success value",
      "You can chain multiple `Effect.map` calls",
    ],
    feedbackOnComplete:
      "Great! You've learned the fundamental pattern of Effect composition. `.pipe()` and `Effect.map` let you build up complex programs by composing simple transformations. This is much more powerful than it might seem at first.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 2: Understanding Effect Channels (A, E, R)
// ---------------------------------------------------------------------------

const lesson2Steps = [
  {
    orderIndex: 1,
    title: "The Three Channels: Success, Error, and Requirements",
    patternTitle: "Understand the Three Effect Channels (A, E, R)",
    instruction: `Every Effect has three type channels: \`Effect<A, E, R>\`
- **A**: Success type (what you get on success)
- **E**: Error type (what can go wrong)
- **R**: Requirements (services/dependencies needed)

The type signature documents the complete contract. In the anti-pattern, errors are untyped strings. In the Effect way, errors are typed.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Untyped errors
const getUser = (id: number) => {
  if (id === 1) {
    return Effect.succeed({ name: "Alice" })
  }
  return Effect.fail("User not found") // ❌ Error type is 'string' - not descriptive!
}

// What can go wrong? TypeScript doesn't know!
const user = getUser(2) // Effect<{ name: string }, string, never>`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Data } from "effect"

// Effect way: Typed errors with Data.tagged (plain objects, works in Sandpack)
interface UserNotFoundError {
  readonly _tag: "UserNotFoundError"
  readonly userId: number
}
const UserNotFoundError = Data.tagged<UserNotFoundError>("UserNotFoundError")

interface User {
  readonly name: string
}

// Now the error type is explicit and descriptive
const getUser = (id: number): Effect.Effect<User, UserNotFoundError> => {
  if (id === 1) {
    return Effect.succeed({ name: "Alice" })
  }
  return Effect.fail(UserNotFoundError({ userId: id }))
}

// TypeScript knows exactly what can go wrong
const user = getUser(2) // Effect<User, UserNotFoundError, never>`,
    playgroundUrl: null,
    hints: [
      "Use `Data.tagged` or `Data.TaggedError` to create typed errors",
      "The error type `E` in `Effect<A, E, R>` documents what can go wrong",
      "Tagged errors provide better error handling and type safety",
    ],
    feedbackOnComplete:
      "Excellent! You've learned that Effect's type system documents not just what succeeds, but what can fail. Tagged errors make error handling explicit and type-safe, unlike throwing exceptions where errors are `unknown`.",
  },
  {
    orderIndex: 2,
    title: "Defining typed errors with Data.TaggedError",
    patternTitle: "Define Type-Safe Errors with Data.TaggedError",
    instruction: `Use \`Data.TaggedError\` to define your own typed error types. Tagged errors carry a \`_tag\` for pattern matching and can hold structured data (e.g. \`userId\`, \`message\`).

Unlike plain strings or \`Error\`, tagged errors are explicit in the type system and work with \`catchTag\`.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Generic errors - hard to handle precisely
const parseConfig = (input: string) => {
  if (!input) return Effect.fail(new Error("Invalid"))
  return Effect.succeed(JSON.parse(input))
}
// What exactly went wrong? TypeScript says Error - no structure!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Data } from "effect"

// Define a tagged error with structured fields
class ConfigParseError extends Data.TaggedError("ConfigParseError")<{
  readonly input: string
  readonly message: string
}> {}

const parseConfig = (input: string) =>
  input
    ? Effect.succeed(JSON.parse(input))
    : Effect.fail(new ConfigParseError({ input, message: "Empty input" }))

// Effect<string, ConfigParseError, never>
// The error type is explicit and carries usable data`,
    hints: [
      "Use `class X extends Data.TaggedError(\"TagName\")<{ fields }> {}`",
      "The \`_tag\` enables \`catchTag(\"TagName\", ...)\`",
      "Add fields (e.g. \`message\`, \`code\`) for context",
    ],
    feedbackOnComplete:
      "Perfect! Tagged errors give you domain-specific, structured failure types. The type system knows exactly what can go wrong, and handlers receive typed data to make decisions.",
  },
  {
    orderIndex: 3,
    title: "Handling Errors with catchTag",
    patternTitle: "Handle Errors with catchTag, catchTags, and catchAll",
    instruction: `When an Effect can fail, you need to handle the error. Use \`Effect.catchTag\` to handle specific error types.

In the anti-pattern, we ignore the error type and just run the Effect. In the Effect way, we explicitly handle the error.`,
    conceptCode: `import { Effect, Data } from "effect"

interface UserNotFoundError {
  readonly _tag: "UserNotFoundError"
  readonly userId: number
}
const UserNotFoundError = Data.tagged<UserNotFoundError>("UserNotFoundError")

interface User {
  readonly name: string
}

const getUser = (id: number): Effect.Effect<User, UserNotFoundError> => {
  if (id === 1) {
    return Effect.succeed({ name: "Alice" })
  }
  return Effect.fail(UserNotFoundError({ userId: id }))
}

// Anti-pattern: Ignoring the error type
// This will throw if the user doesn't exist!
const user = getUser(999)
const result = Effect.runSync(user) // 💥 Crashes!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Data } from "effect"

interface UserNotFoundError {
  readonly _tag: "UserNotFoundError"
  readonly userId: number
}
const UserNotFoundError = Data.tagged<UserNotFoundError>("UserNotFoundError")

interface User {
  readonly name: string
}

const getUser = (id: number): Effect.Effect<User, UserNotFoundError> => {
  if (id === 1) {
    return Effect.succeed({ name: "Alice" })
  }
  return Effect.fail(UserNotFoundError({ userId: id }))
}

// Effect way: Handle the error explicitly
const user = getUser(999).pipe(
  Effect.catchTag("UserNotFoundError", (error) =>
    Effect.succeed({ name: "Guest" })
  )
)

const result = Effect.runSync(user)
console.log(result) // { name: "Guest" }`,
    playgroundUrl: null,
    hints: [
      "Use `Effect.catchTag(tag, handler)` to handle specific error types",
      "The handler receives the error and returns a new Effect",
      "After catching, the error type is removed from the Effect signature",
    ],
    feedbackOnComplete:
      "Perfect! You've learned how to handle errors explicitly. `catchTag` lets you handle specific error types while keeping the type system happy. This is much better than try/catch where errors are `unknown`.",
  },
  {
    orderIndex: 4,
    title: "The Requirements Channel: Dependency Injection",
    patternTitle: "Understand Layers for Dependency Injection",
    instruction: `The third channel \`R\` represents requirements - services your Effect needs to run.

Instead of importing services directly, Effects declare what they need. This makes code testable and composable.

Create an Effect that needs a Database service.`,
    conceptCode: `// Anti-pattern: Direct dependency - hard to test, can't swap implementations
const db = {
  query: (sql: string) => \`Result for: \${sql}\`,
}

const getUser = (id: number) => db.query(\`SELECT * FROM users WHERE id = \${id}\`)

// How do we test this? How do we swap implementations?
console.log(getUser(1))`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

// Define the service interface
interface Database {
  readonly query: (sql: string) => Effect.Effect<unknown>
}

// Define the service
export class Database extends Effect.Service<Database>()(
  "Database",
  {
    sync: () => ({
      query: (sql: string) => Effect.succeed(\`Result for: \${sql}\`)
    })
  }
) {}

// Effect declares its requirement: Effect<unknown, never, Database>
const getUser = (id: number) =>
  Effect.gen(function* () {
    const db = yield* Database
    return yield* db.query(\`SELECT * FROM users WHERE id = \${id}\`)
  })

// Type signature: Effect<unknown, never, Database>
// The R channel shows we need Database`,
    playgroundUrl: null,
    hints: [
      "Use `Effect.Service` to define services",
      "Access services with `yield* ServiceName` in `Effect.gen`",
      "The `R` channel documents all required services",
    ],
    feedbackOnComplete:
      "Brilliant! You've learned about dependency injection in Effect. By declaring requirements in the `R` channel, your code becomes testable (you can provide test implementations) and composable (services are provided at the edge of your program).",
  },
]

// ---------------------------------------------------------------------------
// Lesson 3: Async Effects and Effect.gen
// ---------------------------------------------------------------------------

const lesson3Steps = [
  {
    orderIndex: 1,
    title: "Effect.runPromise for async Effects",
    patternTitle: "Solve Promise Problems with Effect",
    instruction: `Use \`Effect.runPromise\` to execute Effects that contain async operations. It returns a Promise, so you can \`await\` it or use \`.then()\`.

In the anti-pattern, we might use \`Effect.runSync\` on an async Effect and get stuck. In the Effect way, we use the right runner for the job.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: runSync on an Effect with async work
const asyncEffect = Effect.succeed(42).pipe(Effect.delay("100 millis"))

// Effect.runSync(asyncEffect) // ❌ Fails - delay is async!
// We need Effect.runPromise for Effects with async work
console.log("Use Effect.runPromise for async Effects")`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

// Effect way: Use runPromise for async Effects
const asyncEffect = Effect.succeed(42).pipe(
  Effect.delay("100 millis")
)

Effect.runPromise(asyncEffect).then((n) => {
  console.log("Result:", n) // Result: 42
})`,
    hints: [
      "Use `Effect.runPromise(effect)` when the Effect contains async work",
      "`runPromise` returns a Promise - use .then() or await",
      "Use `Effect.runSync` only for fully synchronous Effects",
    ],
    feedbackOnComplete:
      "Great! You've learned when to use `runPromise`. For any Effect that does async work (fetch, delay, etc.), use `runPromise` instead of `runSync`.",
  },
  {
    orderIndex: 2,
    title: "Effect.gen for sequential code",
    patternTitle: "Write Sequential Code with Effect.gen",
    instruction: `\`Effect.gen\` lets you write sequential Effect code like async/await. Use \`yield*\` to unwrap Effects and get their values.

In the anti-pattern, we nest callbacks. In the Effect way, we write flat, readable code.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Nested callbacks / callbacks hell
const fetchAndProcess = Effect.succeed(1).pipe(
  Effect.flatMap((a) =>
    Effect.succeed(2).pipe(
      Effect.flatMap((b) => Effect.succeed(a + b))
    )
  )
)
// Hard to read! Effect.gen is cleaner.`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

// Effect way: Effect.gen for sequential, readable code
const program = Effect.gen(function* () {
  const a = yield* Effect.succeed(1)
  const b = yield* Effect.succeed(2)
  const sum = a + b
  yield* Effect.log(\`Sum: \${sum}\`)
  return sum
})

Effect.runPromise(program).then(console.log) // 3`,
    hints: [
      "Use `Effect.gen(function* () { ... })` for sequential code",
      "Use `yield*` to unwrap an Effect and get its value",
      "Return the final value from the generator",
    ],
    feedbackOnComplete:
      "Excellent! `Effect.gen` is like async/await for Effects. It keeps your code flat and readable while still being fully type-safe and composable.",
  },
  {
    orderIndex: 3,
    title: "Effect.tryPromise for async operations",
    patternTitle: "Wrap Asynchronous Computations with tryPromise",
    instruction: `Wrap Promise-returning code with \`Effect.tryPromise\` to convert rejections into the error channel. This keeps your errors typed and composable.

In the anti-pattern, we use raw Promises and lose type safety. In the Effect way, we wrap async operations for consistency.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Raw Promise, untyped errors
const fetchUser = (id: number) =>
  fetch(\`/api/users/\${id}\`).then((r) => r.json())
// What if it fails? Errors are unknown!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Data } from "effect"

interface FetchError {
  readonly _tag: "FetchError"
  readonly message: string
}
const FetchError = Data.tagged<FetchError>("FetchError")

// Effect way: Wrap async code with tryPromise
const fetchUser = (id: number) =>
  Effect.tryPromise({
    try: () =>
      Promise.resolve({ id, name: "Alice" }), // Simulated fetch
    catch: (e) => FetchError({ message: String(e) }),
  })

const program = fetchUser(1).pipe(
  Effect.map((user) => {
    console.log("User:", user)
    return user
  })
)

Effect.runPromise(program)`,
    hints: [
      "Use `Effect.tryPromise({ try, catch })` to wrap Promise-returning code",
      "The `catch` handler converts rejections to typed errors",
      "The result is an Effect - compose it with pipe, map, etc.",
    ],
    feedbackOnComplete:
      "Perfect! `tryPromise` brings async operations into the Effect world. You get typed errors, composability, and the same patterns you use everywhere else.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 4: Layers and Composing Services
// ---------------------------------------------------------------------------

const lesson4Steps = [
  {
    orderIndex: 1,
    title: "Layer.merge to compose services",
    patternTitle: "Compose Resource Lifecycles with `Layer.merge`",
    instruction: `Layers describe how to build services. Use \`Layer.merge\` to combine multiple layers into one that provides all their services.

Instead of manually wiring dependencies, compose layers and provide them at the edge.`,
    conceptCode: `import { Effect, Layer } from "effect"

// We have two services - how do we provide both?
class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({ log: (msg: string) => Effect.sync(() => console.log(msg)) }),
}) {}

class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({ query: (sql: string) => Effect.succeed("data") }),
}) {}

// We need to merge their layers...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer } from "effect"

class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({ log: (msg: string) => Effect.sync(() => console.log(msg)) }),
}) {}

class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({ query: (sql: string) => Effect.succeed("data") }),
}) {}

// Merge layers: one layer providing both services
const AppLayer = Layer.merge(Logger.Default, Database.Default)

const program = Effect.gen(function* () {
  const logger = yield* Logger
  const db = yield* Database
  yield* logger.log("Fetching...")
  const data = yield* db.query("SELECT 1")
  yield* logger.log("Got: " + data)
})

Effect.runPromise(Effect.provide(program, AppLayer))`,
    hints: [
      "Use `Layer.merge(layerA, layerB)` to combine layers",
      "The merged layer provides all services from both",
      "Use `Effect.provide(program, layer)` to run with the layer",
    ],
    feedbackOnComplete:
      "Great! `Layer.merge` lets you compose services declaratively. Provide the merged layer at the edge, and your program gets everything it needs.",
  },
  {
    orderIndex: 2,
    title: "Effect.provide to provide dependencies",
    patternTitle: "Provide Configuration to Your App via a Layer",
    instruction: `\`Effect.provide\` supplies the requirements (R) your Effect needs. Use it at the edge of your program to inject real implementations.

The program stays pure and testable; you swap implementations by providing different layers.`,
    conceptCode: `import { Effect, Layer } from "effect"

class Config extends Effect.Service<Config>()("Config", {
  sync: () => ({ host: "localhost", port: 3000 }),
}) {}

const program = Effect.gen(function* () {
  const config = yield* Config
  return \`http://\${config.host}:\${config.port}\`
})

// program has type Effect<string, never, Config>
// We must provide Config to run it!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer } from "effect"

class Config extends Effect.Service<Config>()("Config", {
  sync: () => ({ host: "localhost", port: 3000 }),
}) {}

const program = Effect.gen(function* () {
  const config = yield* Config
  return \`http://\${config.host}:\${config.port}\`
})

// Provide the default Config layer
const runnable = Effect.provide(program, Config.Default)
const url = await Effect.runPromise(runnable)
console.log(url) // "http://localhost:3000"`,
    hints: [
      "Use `Effect.provide(effect, layer)` to supply requirements",
      "After provide, the R channel is removed - the Effect is runnable",
      "Use different layers for production vs tests",
    ],
    feedbackOnComplete:
      "Perfect! `provide` is where you wire in real implementations. Your core logic stays dependency-free; you inject what it needs at the boundary.",
  },
  {
    orderIndex: 3,
    title: "Layer.scoped for managed resources",
    patternTitle: "Create a Service Layer from a Managed Resource",
    instruction: `Use \`Layer.scoped\` when a service needs acquire/release logic (e.g. database connections). The resource is released when the scope ends.

This ensures cleanup runs even if the program fails.`,
    conceptCode: `import { Effect, Layer } from "effect"

// A service that needs to be opened and closed
const acquireConnection = Effect.sync(() => {
  console.log("Connection acquired")
  return { query: (sql: string) => Effect.succeed("result") }
})
const releaseConnection = () => Effect.sync(() => console.log("Connection released"))

// Layer.scoped manages this lifecycle...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer } from "effect"

class Database extends Effect.Service<Database>()("Database", {
  scoped: Effect.gen(function* () {
    const id = Math.floor(Math.random() * 1000)
    yield* Effect.sync(() => console.log(\`[DB \${id}] Acquired\`))
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => console.log(\`[DB \${id}] Released\`))
    )
    return {
      query: (sql: string) => Effect.succeed(\`Result: \${sql}\`),
    }
  }),
}) {}

const program = Effect.gen(function* () {
  const db = yield* Database
  return yield* db.query("SELECT 1")
})

Effect.runPromise(
  Effect.scoped(Effect.provide(program, Database.Default))
).then(console.log)`,
    hints: [
      "Use `scoped` in service definition for resources that need cleanup",
      "Use `Effect.addFinalizer` for release logic",
      "Wrap the program in `Effect.scoped` when using scoped layers",
    ],
    feedbackOnComplete:
      "Excellent! `Layer.scoped` gives you automatic resource management. Acquire and release are guaranteed to run correctly, even on errors.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 5: Resource Management (Manual acquire/release)
// ---------------------------------------------------------------------------

const lesson5ResourceManagementSteps = [
  {
    orderIndex: 1,
    title: "Effect.acquireRelease for manual resources",
    patternTitle: "Safely Bracket Resource Usage with `acquireRelease`",
    instruction: `Use \`Effect.acquireRelease\` when you need explicit acquire → use → release logic. Unlike \`Layer.scoped\`, this is for one-off resources—files, connections, locks—where you control the lifecycle directly.

The acquire effect runs first; the release runs when the scope ends, even if the use phase fails.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Manual try/finally - easy to forget release
const useFile = () => {
  const file = openFile("data.txt")
  try {
    return file.read()
  } finally {
    file.close() // What if openFile throws? What if we forget?
  }
}

// Effect way: acquireRelease guarantees cleanup...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const acquireFile = Effect.sync(() => {
  console.log("File opened")
  return {
    read: () => Effect.succeed("file contents"),
    write: (data: string) => Effect.sync(() => console.log("Wrote:", data)),
  }
})

const releaseFile = () => Effect.sync(() => console.log("File closed"))

const scopedFile = Effect.acquireRelease(acquireFile, releaseFile)

const program = Effect.gen(function* () {
  const file = yield* Effect.scoped(scopedFile)
  const data = yield* file.read()
  yield* file.write(data)
  return data
})

Effect.runPromise(program)`,
    hints: [
      "Use `Effect.acquireRelease(acquire, release)` - release takes the acquired value",
      "The result is an Effect that must be used inside `Effect.scoped`",
      "Release runs whether the use phase succeeds or fails",
    ],
    feedbackOnComplete:
      "Perfect! `acquireRelease` gives you guaranteed cleanup. The release runs even on errors—no leaked resources.",
  },
  {
    orderIndex: 2,
    title: "Effect.scoped for bracket-style cleanup",
    patternTitle: "Manually Manage Lifecycles with `Scope`",
    instruction: `\`Effect.scoped\` creates a scope for resources. Any resource acquired with \`acquireRelease\` (or \`Layer.scoped\`) is released when the scope ends.

You must wrap the program in \`Effect.scoped\` when it uses scoped resources.`,
    conceptCode: `import { Effect } from "effect"

const acquire = Effect.sync(() => {
  console.log("Connection acquired")
  return { query: (sql: string) => Effect.succeed("result") }
})
const release = () => Effect.sync(() => console.log("Connection released"))

const scopedConn = Effect.acquireRelease(acquire, release)

const program = Effect.gen(function* () {
  const conn = yield* scopedConn
  return yield* conn.query("SELECT 1")
})

// ❌ Effect.runPromise(program) - Type error! Missing Scope
// We need Effect.scoped...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const acquire = Effect.sync(() => {
  console.log("Connection acquired")
  return { query: (sql: string) => Effect.succeed("result") }
})
const release = () => Effect.sync(() => console.log("Connection released"))

const scopedConn = Effect.acquireRelease(acquire, release)

const program = Effect.gen(function* () {
  const conn = yield* scopedConn
  return yield* conn.query("SELECT 1")
})

// Scoped resources require Effect.scoped
Effect.runPromise(Effect.scoped(program)).then(console.log)`,
    hints: [
      "Use `Effect.scoped(program)` when the program uses scoped resources",
      "The scope ensures all acquired resources are released",
      "Order of release is LIFO (last acquired, first released)",
    ],
    feedbackOnComplete:
      "Great! `Effect.scoped` is the boundary where resource cleanup happens. Everything acquired inside runs release when the scope ends.",
  },
  {
    orderIndex: 3,
    title: "Release runs even on failure",
    patternTitle: "Guarantee Cleanup Even on Failure",
    instruction: `One of the key guarantees of \`acquireRelease\`: the release effect runs even when the use phase fails. No matter what happens—success, failure, or interruption—cleanup runs.

Compare with raw try/finally: Effect's bracket is more reliable.`,
    conceptCode: `import { Effect } from "effect"

// We want: acquire, use (might fail), release ALWAYS runs
const acquire = Effect.sync(() => {
  console.log("Acquired")
  return {}
})
const release = () => Effect.sync(() => console.log("Released"))

const scoped = Effect.acquireRelease(acquire, release)

const program = Effect.gen(function* () {
  const resource = yield* Effect.scoped(scoped)
  yield* Effect.fail(new Error("Oops!")) // Fails here
  return "never reached"
})

// Run it - does "Released" still get logged?`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const acquire = Effect.sync(() => {
  console.log("Acquired")
  return {}
})
const release = () => Effect.sync(() => console.log("Released"))

const scoped = Effect.acquireRelease(acquire, release)

const program = Effect.gen(function* () {
  const resource = yield* Effect.scoped(scoped)
  yield* Effect.fail(new Error("Oops!"))
  return "never reached"
})

Effect.runPromise(Effect.scoped(program)).catch(() => {
  console.log("Program failed, but release still ran!")
})
// Output: Acquired, Released, Program failed...`,
    hints: [
      "Release runs even when the inner Effect fails",
      "Release runs on interruption too",
      "This is the bracket pattern—guaranteed cleanup",
    ],
    feedbackOnComplete:
      "Excellent! This is the power of bracket: release always runs. Your resources stay clean even when things go wrong.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 6: Retries and Resilience
// ---------------------------------------------------------------------------

const lesson6Steps = [
  {
    orderIndex: 1,
    title: "Effect.retry for retrying failures",
    patternTitle: "Retry a Failed Operation with Effect.retry",
    instruction: `Use \`Effect.retry\` to retry a failed Effect. Combine it with \`Schedule\` to control how many times and with what backoff.

In the anti-pattern, we give up on first failure. In the Effect way, we retry with a policy.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: No retries - fails immediately
let attempts = 0
const flakyOp = Effect.gen(function* () {
  attempts++
  if (attempts < 3) yield* Effect.fail(new Error("Not ready!"))
  return "success"
})

// Effect.runPromise(flakyOp) // 💥 Fails on first attempt!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Schedule } from "effect"

let attempts = 0
const flakyOp = Effect.try({
  try: () => {
    attempts++
    if (attempts < 3) throw new Error("Not ready!")
    return "success"
  },
  catch: (e) => e as Error,
})

const retryPolicy = Schedule.exponential("10 millis").pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(5))
)

const program = flakyOp.pipe(
  Effect.retry(retryPolicy),
  Effect.tap((r) => Effect.sync(() => console.log("Result:", r)))
)

Effect.runPromise(program)`,
    hints: [
      "Use `Effect.retry(schedule)` to retry on failure",
      "Use `Schedule.recurs(n)` to limit retries",
      "Use `Schedule.exponential` for backoff",
    ],
    feedbackOnComplete:
      "Great! Retries make your program resilient to transient failures. Combine with schedules for sophisticated retry policies.",
  },
  {
    orderIndex: 2,
    title: "Effect.timeout for time limits",
    patternTitle: "Race Effects and Handle Timeouts",
    instruction: `Use \`Effect.timeout\` to fail an Effect if it takes too long. Returns \`Option.none\` on timeout, or \`Option.some(value)\` on success.

Prevent runaway operations from blocking forever.`,
    conceptCode: `import { Effect } from "effect"

// A slow operation - what if it never finishes?
const slowOp = Effect.gen(function* () {
  yield* Effect.sleep("5 seconds")
  return "done"
})

// We need a timeout to avoid waiting forever...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Duration } from "effect"

const slowOp = Effect.gen(function* () {
  yield* Effect.sleep("500 millis")
  return "done"
})

const program = slowOp.pipe(
  Effect.timeout(Duration.millis(200)),
  Effect.flatMap((option) =>
    option._tag === "Some"
      ? Effect.sync(() => console.log("Success:", option.value))
      : Effect.sync(() => console.log("Timed out!"))
  )
)

Effect.runPromise(program)`,
    hints: [
      "Use `Effect.timeout(duration)` to add a time limit",
      "Returns `Option<A>` - `Some` on success, `None` on timeout",
      "Use `Duration.millis(n)` or `Duration.seconds(n)`",
    ],
    feedbackOnComplete:
      "Perfect! Timeouts prevent hanging operations. Combine with retries for robust external calls.",
  },
  {
    orderIndex: 3,
    title: "Schedule for composable retry policies",
    patternTitle: "Control Repetition with Schedule",
    instruction: `\`Schedule\` defines when and how to retry. Compose schedules with \`pipe\`, \`compose\`, and \`jittered\` for flexible policies.

Schedules are reusable and composable - the same patterns work for retries, repetition, and more.`,
    conceptCode: `import { Effect, Schedule } from "effect"

// We want: exponential backoff, with jitter, max 5 retries
// Schedule lets us compose these concerns...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Schedule } from "effect"

const exponentialBackoff = Schedule.exponential("100 millis")
const withJitter = Schedule.jittered(exponentialBackoff)
const limited = Schedule.compose(withJitter, Schedule.recurs(5))

const flakyOp = Effect.try({
  try: () => {
    if (Math.random() > 0.5) throw new Error("flaky")
    return "ok"
  },
  catch: (e) => e as Error,
})

const program = flakyOp.pipe(
  Effect.retry(limited),
  Effect.tap((r) => Effect.sync(() => console.log("Got:", r)))
)

Effect.runPromise(program)`,
    hints: [
      "Use `Schedule.exponential(base)` for exponential backoff",
      "Use `Schedule.jittered(schedule)` to add randomness",
      "Use `Schedule.compose(a, b)` to combine schedules",
    ],
    feedbackOnComplete:
      "Excellent! Schedules are a powerful abstraction. The same composition patterns work for retries, rate limiting, and repeated execution.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 7: Fibers and Concurrency
// ---------------------------------------------------------------------------

const lesson7Steps = [
  {
    orderIndex: 1,
    title: "Effect.fork for background work",
    patternTitle: "Run Background Tasks with Effect.fork",
    instruction: `Use \`Effect.fork\` to run an Effect in the background. It returns a \`Fiber\` that you can \`join\` to get the result, or \`interrupt\` to cancel.

In the anti-pattern, we block on everything. In the Effect way, we fork and continue.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Blocking - we wait for each task
const task = Effect.sleep("200 millis").pipe(
  Effect.flatMap(() => Effect.sync(() => console.log("Done")))
)

// Effect.runPromise(task) // Blocks until done!
console.log("Main thread blocked...")`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const backgroundTask = Effect.sleep("200 millis").pipe(
  Effect.flatMap(() => Effect.sync(() => console.log("Background done")))
)

const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(backgroundTask)
  console.log("Main thread continues!")
  yield* Effect.sleep("50 millis")
  const result = yield* fiber.join
  return result
})

Effect.runPromise(program)`,
    hints: [
      "Use `Effect.fork(effect)` to run in background",
      "Returns a `Fiber` - use `fiber.join` to wait for result",
      "Use `Fiber.interrupt` to cancel",
    ],
    feedbackOnComplete:
      "Great! Fibers let you run work concurrently without blocking. Join when you need the result, or interrupt if you don't.",
  },
  {
    orderIndex: 2,
    title: "Fiber.join to wait for results",
    patternTitle: "Understand Fibers as Lightweight Threads",
    instruction: `A \`Fiber\` represents a running Effect. Use \`yield* fiber.join\` to wait for it to complete and get its result.

The main fiber can do other work while the forked fiber runs.`,
    conceptCode: `import { Effect } from "effect"

// We have two tasks - run them in parallel?
const taskA = Effect.succeed("A").pipe(Effect.delay("100 millis"))
const taskB = Effect.succeed("B").pipe(Effect.delay("100 millis"))

// Sequential: takes 200ms
// How do we run both at once?`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const taskA = Effect.succeed("A").pipe(Effect.delay("100 millis"))
const taskB = Effect.succeed("B").pipe(Effect.delay("100 millis"))

const program = Effect.gen(function* () {
  const fiberA = yield* Effect.fork(taskA)
  const fiberB = yield* Effect.fork(taskB)
  const [a, b] = yield* Effect.all([fiberA.join, fiberB.join])
  console.log(a, b) // "A" "B" - both completed in ~100ms
  return [a, b]
})

Effect.runPromise(program)`,
    hints: [
      "Fork both tasks to run in parallel",
      "Use `Effect.all([fiberA.join, fiberB.join])` to wait for both",
      "Results come back in the same order",
    ],
    feedbackOnComplete:
      "Perfect! Fork + join gives you structured concurrency. Both tasks run in parallel; you get results when both complete.",
  },
  {
    orderIndex: 3,
    title: "Fiber.interrupt to cancel",
    patternTitle: "Understanding Fibers",
    instruction: `Use \`Fiber.interrupt\` to cancel a running fiber. The forked Effect will be interrupted gracefully.

Interruption is cooperative - the fiber receives the interrupt signal.`,
    conceptCode: `import { Effect } from "effect"

// A long-running task - what if we need to cancel?
const longTask = Effect.sleep("10 seconds").pipe(
  Effect.flatMap(() => Effect.sync(() => console.log("Finished")))
)

// We might want to cancel it after 1 second...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const longTask = Effect.sleep("5 seconds").pipe(
  Effect.flatMap(() => Effect.sync(() => console.log("Finished")))
)

const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(longTask)
  yield* Effect.sleep("100 millis")
  yield* fiber.interrupt
  console.log("Cancelled!")
})

Effect.runPromise(program)`,
    hints: [
      "Use `yield* fiber.interrupt` to cancel",
      "Interruption is cooperative",
      "The interrupted Effect's finalizers still run",
    ],
    feedbackOnComplete:
      "Excellent! Interruption gives you cancel buttons for background work. Effect ensures cleanup runs even when interrupted.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 8: Parallel Processing
// ---------------------------------------------------------------------------

const lesson8Steps = [
  {
    orderIndex: 1,
    title: "Effect.all for parallel execution",
    patternTitle: "Process a Collection in Parallel with Effect.forEach",
    instruction: `\`Effect.all\` runs multiple Effects in parallel. Pass an array or tuple; it returns when all succeed (or fails on first failure).

In the anti-pattern, we run sequentially. In the Effect way, we run in parallel.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Sequential - slow!
const fetchA = Effect.succeed("A").pipe(Effect.delay("100 millis"))
const fetchB = Effect.succeed("B").pipe(Effect.delay("100 millis"))

const program = Effect.gen(function* () {
  const a = yield* fetchA  // wait 100ms
  const b = yield* fetchB  // wait 100ms
  return [a, b]  // total 200ms
})`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const fetchA = Effect.succeed("A").pipe(Effect.delay("100 millis"))
const fetchB = Effect.succeed("B").pipe(Effect.delay("100 millis"))

const program = Effect.all([fetchA, fetchB]).pipe(
  Effect.tap(([a, b]) => Effect.sync(() => console.log(a, b)))
)

Effect.runPromise(program)`,
    hints: [
      "Use `Effect.all([effect1, effect2])` to run in parallel",
      "Returns a tuple of results in the same order",
      "Fails fast if any Effect fails",
    ],
    feedbackOnComplete:
      "Great! Effect.all is the simplest way to run Effects in parallel. Same order in, same order out.",
  },
  {
    orderIndex: 2,
    title: "Effect.forEach with concurrency",
    patternTitle: "Process a Collection in Parallel with Effect.forEach",
    instruction: `Use \`Effect.forEach\` to process a collection with controlled concurrency. Set \`concurrency: N\` to limit parallel executions.

Process items in parallel without overwhelming the system.`,
    conceptCode: `import { Effect } from "effect"

// We have 10 items to process
const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Anti-pattern: Run all at once - could overwhelm
const processItem = (id: number) =>
  Effect.sleep("50 millis").pipe(
    Effect.flatMap(() => Effect.sync(() => console.log("Processed", id)))
  )
// How do we limit concurrency?`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const ids = [1, 2, 3, 4, 5]

const processItem = (id: number) =>
  Effect.sleep("50 millis").pipe(
    Effect.flatMap(() => Effect.sync(() => console.log("Processed", id))),
    Effect.as(id)
  )

const program = Effect.forEach(ids, processItem, { concurrency: 2 })

Effect.runPromise(program).then(console.log)`,
    hints: [
      "Use `Effect.forEach(collection, fn, { concurrency: N })`",
      "Concurrency limits how many run at once",
      "Returns array of results in original order",
    ],
    feedbackOnComplete:
      "Perfect! forEach with concurrency gives you parallel processing with backpressure. No more overwhelming external APIs.",
  },
  {
    orderIndex: 3,
    title: "Effect.all with record",
    patternTitle: "Run Independent Effects in Parallel with Effect.all",
    instruction: `\`Effect.all\` also works with records. Pass an object: \`Effect.all({ a: fetchA, b: fetchB })\` returns \`{ a, b }\`.

Structured parallelism: keys become property names.`,
    conceptCode: `import { Effect } from "effect"

// Multiple named fetches
const fetchUser = Effect.succeed({ name: "Alice" }).pipe(Effect.delay("50 millis"))
const fetchPosts = Effect.succeed([{ id: 1 }]).pipe(Effect.delay("50 millis"))

// Run in parallel and get named results...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect } from "effect"

const fetchUser = Effect.succeed({ name: "Alice" }).pipe(Effect.delay("50 millis"))
const fetchPosts = Effect.succeed([{ id: 1 }]).pipe(Effect.delay("50 millis"))

const program = Effect.all({
  user: fetchUser,
  posts: fetchPosts,
}).pipe(
  Effect.tap(({ user, posts }) =>
    Effect.sync(() => console.log(user.name, posts.length))
  )
)

Effect.runPromise(program)`,
    hints: [
      "Use `Effect.all({ key: effect })` for named results",
      "Returns object with same keys",
      "All run in parallel",
    ],
    feedbackOnComplete:
      "Excellent! Effect.all with records keeps your parallel code readable. Named results, parallel execution.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 9: Streams
// ---------------------------------------------------------------------------

const lesson9Steps = [
  {
    orderIndex: 1,
    title: "Stream.fromIterable and runCollect",
    patternTitle: "Create a Stream from a List",
    instruction: `\`Stream\` processes data incrementally. Use \`Stream.fromIterable\` to create from a list, and \`Stream.runCollect\` to gather results into a \`Chunk\`.

Streams are lazy - they only process as much as you consume.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Load everything into memory
const items = [1, 2, 3, 4, 5]
const doubled = items.map((n) => n * 2)
// What if we have millions? Memory explodes!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Stream, Chunk } from "effect"

const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  Stream.map((n) => n * 2),
  Stream.runCollect
)

Effect.runPromise(program).then((chunk) => {
  console.log(Chunk.toArray(chunk)) // [2, 4, 6, 8, 10]
})`,
    hints: [
      "Use `Stream.fromIterable(array)` to create a stream",
      "Use `Stream.map` to transform elements",
      "Use `Stream.runCollect` to get a Chunk of results",
    ],
    feedbackOnComplete:
      "Great! Streams process data incrementally. For small data it's similar to arrays; for large data, streams save memory.",
  },
  {
    orderIndex: 2,
    title: "Stream.filter and Stream.take",
    patternTitle: "Process Streaming Data with Stream",
    instruction: `Combine \`Stream.filter\`, \`Stream.map\`, and \`Stream.take\` to build pipelines. Each step processes one element at a time.

Compose stream operations like Array methods, but lazy.`,
    conceptCode: `import { Effect, Stream, Chunk } from "effect"

// Filter evens, double them, take first 3
const numbers = [1, 2, 3, 4, 5, 6, 7, 8]

// Build the pipeline...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Stream, Chunk } from "effect"

const program = Stream.fromIterable([1, 2, 3, 4, 5, 6, 7, 8]).pipe(
  Stream.filter((n) => n % 2 === 0),
  Stream.map((n) => n * 2),
  Stream.take(3),
  Stream.runCollect
)

Effect.runPromise(program).then((chunk) => {
  console.log(Chunk.toArray(chunk)) // [4, 8, 12]
})`,
    hints: [
      "Use `Stream.filter(predicate)` to keep matching elements",
      "Use `Stream.take(n)` to limit the stream",
      "Operations compose left to right",
    ],
    feedbackOnComplete:
      "Perfect! Stream pipelines are composable. Filter, map, take - each processes incrementally without loading everything.",
  },
  {
    orderIndex: 3,
    title: "Stream.runDrain for side effects",
    patternTitle: "Run a Pipeline for its Side Effects",
    instruction: `Use \`Stream.runDrain\` when you only care about side effects, not the values. The stream runs to completion but results are discarded.

Useful for logging, sending to a sink, or triggering actions.`,
    conceptCode: `import { Effect, Stream } from "effect"

// We want to log each item, not collect
const items = ["a", "b", "c"]

// runCollect would give us Chunk - we don't need the values...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Stream } from "effect"

const program = Stream.fromIterable(["a", "b", "c"]).pipe(
  Stream.mapEffect((item) => Effect.sync(() => console.log("Got:", item))),
  Stream.runDrain
)

Effect.runPromise(program)`,
    hints: [
      "Use `Stream.runDrain` when you don't need results",
      "Use `Stream.mapEffect` for Effect-returning operations",
      "runDrain runs the stream to completion",
    ],
    feedbackOnComplete:
      "Excellent! runDrain is for fire-and-forget streams. Process each element, discard results, move on.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 10: Chunk
// ---------------------------------------------------------------------------

const lesson10ChunkSteps = [
  {
    orderIndex: 1,
    title: "Chunk.fromIterable and basic operations",
    patternTitle: "Use Chunk for High-Performance Collections",
    instruction: `\`Chunk\` is an immutable, high-performance collection used throughout Effect (e.g. \`Stream.runCollect\` returns a Chunk). Use \`Chunk.fromIterable\` to create from arrays or iterables.

Chunk is optimized for append/prepend and slicing—better than Array for many Effect use cases.`,
    conceptCode: `import { Effect } from "effect"

// Stream.runCollect gives us a Chunk - what is it?
const items = [1, 2, 3, 4, 5]
// We need an immutable collection that works well with Effect...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Stream, Chunk } from "effect"

const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  Stream.map((n) => n * 2),
  Stream.runCollect
)

Effect.runPromise(program).then((chunk) => {
  // Chunk.fromIterable creates from array
  const fromArray = Chunk.fromIterable([10, 20, 30])
  console.log(Chunk.toArray(fromArray)) // [10, 20, 30]
  console.log(Chunk.toArray(chunk))     // [2, 4, 6, 8, 10]
})`,
    hints: [
      "Use `Chunk.fromIterable(array)` to create a Chunk",
      "Use `Chunk.toArray(chunk)` to convert back to array",
      "Stream.runCollect returns Chunk<A>",
    ],
    feedbackOnComplete:
      "Great! Chunk is Effect's preferred immutable collection. It integrates with Streams and offers efficient operations.",
  },
  {
    orderIndex: 2,
    title: "Chunk.append, prepend, and take",
    patternTitle: "Use Chunk for High-Performance Collections",
    instruction: `Chunk supports immutable operations: \`Chunk.append\`, \`Chunk.prepend\`, \`Chunk.take(n)\`, \`Chunk.drop(n)\`. Each returns a new Chunk—no mutation.

These operations are optimized for Chunk's internal structure.`,
    conceptCode: `import { Chunk } from "effect"

// We have a Chunk - add to front, add to back, take first 3
let numbers = Chunk.fromIterable([2, 3, 4])
// Append 5, prepend 1, take first 3...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Chunk } from "effect"

let numbers = Chunk.fromIterable([2, 3, 4])
numbers = Chunk.append(numbers, 5)
numbers = Chunk.prepend(numbers, 1)
const firstThree = Chunk.take(numbers, 3)
console.log(Chunk.toArray(firstThree)) // [1, 2, 3]`,
    hints: [
      "Use `Chunk.append(chunk, element)` to add at end",
      "Use `Chunk.prepend(chunk, element)` to add at start",
      "Use `Chunk.take(chunk, n)` for first n elements",
    ],
    feedbackOnComplete:
      "Perfect! Chunk's immutable API lets you build and slice collections without mutation. append/prepend are efficient.",
  },
  {
    orderIndex: 3,
    title: "Chunk vs Array in Effect pipelines",
    patternTitle: "When to Use Chunk vs Array",
    instruction: `When to use Chunk: Stream results, Effect pipelines with collections, anywhere you need immutable collections that integrate with Effect.

Arrays work too, but Chunk is the idiomatic choice in Effect.`,
    conceptCode: `import { Effect } from "effect"

// Processing a stream - we get Chunk. Convert to array?
const processItems = (items: number[]) =>
  Effect.succeed(items.map((n) => n * 2))

// Or work with Chunk directly...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Chunk } from "effect"

const chunk = Chunk.fromIterable([1, 2, 3, 4, 5])
const doubled = Chunk.map(chunk, (n) => n * 2)
const sum = Chunk.reduce(doubled, 0, (acc, n) => acc + n)

Effect.runPromise(Effect.succeed(sum)).then(console.log) // 30`,
    hints: [
      "Use `Chunk.map(chunk, fn)` for transformation",
      "Use `Chunk.reduce(chunk, init, fn)` for folding",
      "Chunk integrates with Effect and Stream",
    ],
    feedbackOnComplete:
      "Excellent! Chunk offers map, reduce, filter—similar to Array but designed for Effect. Use it when working with Stream results or Effect pipelines.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 11: Testing with Layers
// ---------------------------------------------------------------------------

const lesson11Steps = [
  {
    orderIndex: 1,
    title: "Provide test implementations",
    patternTitle: "Create a Testable HTTP Client Service",
    instruction: `The power of Layers: provide different implementations for tests. Use \`Layer.succeed\` to inject mock data without real dependencies.

Your production code stays the same; you swap the layer at the edge.`,
    conceptCode: `import { Effect, Layer } from "effect"

class Api extends Effect.Service<Api>()("Api", {
  sync: () => ({
    fetchUser: (id: number) =>
      Effect.succeed({ id, name: "Real User" }),
  }),
}) {}

// How do we test code that uses Api?
// We can't hit the real API in tests!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer } from "effect"

class Api extends Effect.Service<Api>()("Api", {
  sync: () => ({
    fetchUser: (id: number) =>
      Effect.succeed({ id, name: "Real User" }),
  }),
}) {}

const program = Effect.gen(function* () {
  const api = yield* Api
  const user = yield* api.fetchUser(1)
  return user.name
})

// Production: use real layer
const prod = Effect.provide(program, Api.Default)

// Test: use mock layer
const testLayer = Layer.succeed(Api, Api.of({
  fetchUser: () => Effect.succeed({ id: 1, name: "Test User" }),
}))
const test = Effect.provide(program, testLayer)

Effect.runPromise(test).then(console.log)`,
    hints: [
      "Use `Layer.succeed(Service, implementation)` for mocks",
      "Same program, different layers = different behavior",
      "No mocking libraries needed",
    ],
    feedbackOnComplete:
      "Brilliant! This is the power of dependency injection. Swap layers at the edge; your core logic stays pure and testable.",
  },
  {
    orderIndex: 2,
    title: "Testable services",
    patternTitle: "Model Dependencies as Services",
    instruction: `Services that declare requirements are inherently testable. You provide a \`Layer\` that satisfies the interface - no stubs, no mocks.

The type system ensures your test implementation matches the interface.`,
    conceptCode: `import { Effect, Layer } from "effect"

// A service that needs Config
class Config extends Effect.Service<Config>()("Config", {
  sync: () => ({ apiUrl: "https://api.prod.com" }),
}) {}

// For tests, we want apiUrl: "https://api.test.com"
// Layer.succeed to the rescue!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer } from "effect"

class Config extends Effect.Service<Config>()("Config", {
  sync: () => ({ apiUrl: "https://api.prod.com" }),
}) {}

const program = Effect.gen(function* () {
  const config = yield* Config
  return config.apiUrl
})

const testLayer = Layer.succeed(Config, Config.of({
  apiUrl: "https://api.test.com",
}))

Effect.runPromise(Effect.provide(program, testLayer)).then(console.log)`,
    hints: [
      "Create a layer with your test values",
      "Use `Service.of(impl)` for the implementation",
      "Provide at the edge - tests or main",
    ],
    feedbackOnComplete:
      "Perfect! Every service can have a test layer. Type-safe, no magic, just layers.",
  },
  {
    orderIndex: 3,
    title: "Composing test layers",
    patternTitle: "Organize Layers into Composable Modules",
    instruction: `When your program needs multiple services, merge test layers: \`Layer.merge(TestLayerA, TestLayerB)\`.

Each test can provide exactly the mocks it needs.`,
    conceptCode: `import { Effect, Layer } from "effect"

class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({ log: (m: string) => Effect.sync(() => console.log(m)) }),
}) {}

class Db extends Effect.Service<Db>()("Db", {
  sync: () => ({ query: () => Effect.succeed([]) }),
}) {}

// Program needs both - how do we test?`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer } from "effect"

class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({ log: (m: string) => Effect.sync(() => console.log(m)) }),
}) {}

class Db extends Effect.Service<Db>()("Db", {
  sync: () => ({ query: () => Effect.succeed([{ id: 1, name: "Test" }]) }),
}) {}

const program = Effect.gen(function* () {
  const logger = yield* Logger
  const db = yield* Db
  const rows = yield* db.query()
  yield* logger.log(\`Got \${rows.length} rows\`)
  return rows
})

const testLayer = Layer.merge(
  Logger.Default,
  Layer.succeed(Db, Db.of({ query: () => Effect.succeed([{ id: 1, name: "Test" }]) }))
)

Effect.runPromise(Effect.provide(program, testLayer)).then(console.log)`,
    hints: [
      "Use `Layer.merge` to combine test layers",
      "Mix real and mock: Logger.Default + mock Db",
      "Each layer satisfies part of the requirements",
    ],
    feedbackOnComplete:
      "Excellent! Composable test layers. Mix and match - real logger, mock DB, or vice versa. Tests stay simple.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 13: Queues and PubSub
// ---------------------------------------------------------------------------

const lesson13Steps = [
  {
    orderIndex: 1,
    title: "Queue.bounded for producer-consumer",
    patternTitle: "Decouple Fibers with Queues and PubSub",
    instruction: "\`Queue\` decouples producers from consumers with back-pressure. Use \`Queue.bounded(n)\` for a queue with capacity. \`Queue.offer\` adds items; \`Queue.take\` removes them. If the queue is full, \`offer\` suspends; if empty, \`take\` suspends.",
    conceptCode: `import { Effect } from "effect"

// Producer and consumer need to communicate without blocking
// How do we pass work from one fiber to another?`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Queue } from "effect"

const program = Effect.gen(function* () {
  const queue = yield* Queue.bounded<number>(10)
  yield* Queue.offer(queue, 42)
  const value = yield* Queue.take(queue)
  return value
})

Effect.runPromise(program).then(console.log) // 42`,
    hints: [
      "Use `Queue.bounded<A>(capacity)` to create a queue",
      "Use `Queue.offer(queue, value)` to add items",
      "Use `Queue.take(queue)` to remove and return the oldest item",
    ],
    feedbackOnComplete:
      "Great! Queues provide back-pressure: producers slow down when consumers can't keep up. Type-safe, async, and composable.",
  },
  {
    orderIndex: 2,
    title: "PubSub.bounded for broadcasting",
    patternTitle: "Decouple Fibers with Queues and PubSub",
    instruction: "\`PubSub\` broadcasts messages to all subscribers—unlike Queue, where each value goes to one consumer. Use \`PubSub.subscribe\` to get a \`Dequeue\`; use \`Queue.take\` on that to receive messages. Subscribe before publishing.",
    conceptCode: `import { Effect } from "effect"

// Queue: one consumer per message
// PubSub: all subscribers receive every message
// Events, notifications, broadcast...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, PubSub, Queue } from "effect"

const program = Effect.scoped(
  Effect.gen(function* () {
    const pubsub = yield* PubSub.bounded<string>(2)
    const dequeue1 = yield* PubSub.subscribe(pubsub)
    const dequeue2 = yield* PubSub.subscribe(pubsub)
    yield* PubSub.publish(pubsub, "Hello!")
    console.log(yield* Queue.take(dequeue1))
    console.log(yield* Queue.take(dequeue2))
  })
)

Effect.runPromise(program)`,
    hints: [
      "Use `PubSub.bounded<A>(capacity)` to create a PubSub",
      "Use `PubSub.subscribe(pubsub)` inside Effect.scoped",
      "Use `Queue.take(dequeue)` on the subscription to receive",
    ],
    feedbackOnComplete:
      "Perfect! PubSub broadcasts to all subscribers. Use it for events, notifications, or when multiple consumers need the same message.",
  },
  {
    orderIndex: 3,
    title: "Fork a consumer with Queue.take",
    patternTitle: "Concurrency Pattern 4: Distribute Work with Queue",
    instruction: "Run a consumer in a forked fiber so it runs in the background. The consumer loops on \`Queue.take\`; the producer \`offer\`s items. Decouple work without blocking the main flow.",
    conceptCode: `import { Effect } from "effect"

// Producer offers items; consumer takes in a loop
// Consumer should run in background, not block producer...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Queue } from "effect"

const consumer = (queue: Queue.Queue<number>) =>
  Effect.gen(function* () {
    const value = yield* Queue.take(queue)
    yield* Effect.sync(() => console.log("Consumed:", value))
  }).pipe(Effect.forever)

const program = Effect.gen(function* () {
  const queue = yield* Queue.bounded<number>(10)
  yield* Effect.fork(consumer(queue))
  yield* Queue.offer(queue, 1)
  yield* Queue.offer(queue, 2)
  yield* Effect.sleep("100 millis")
})

Effect.runPromise(program)`,
    hints: [
      "Fork the consumer with `Effect.fork(consumer(queue))`",
      "Consumer uses `Queue.take` in a loop",
      "Producer uses `Queue.offer` without blocking",
    ],
    feedbackOnComplete:
      "Excellent! Queue + fork gives you decoupled producer-consumer. The consumer runs in the background, processing as items arrive.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 14: Metrics
// ---------------------------------------------------------------------------

const lesson14Steps = [
  {
    orderIndex: 1,
    title: "Metric.counter for counting events",
    patternTitle: "Add Custom Metrics to Your Application",
    instruction: "Use `Metric.counter` to count events—user signups, requests, errors. Call `Metric.increment(counter)` (or `incrementBy`) to add to the count. Metrics integrate with Effect pipelines.",
    conceptCode: `import { Effect } from "effect"

// We want to track how many users we've processed
// Without metrics, we'd use mutable counters...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Metric } from "effect"

const usersProcessed = Metric.counter("users_processed_total", {
  description: "Total users processed",
})

const program = Effect.gen(function* () {
  yield* Metric.increment(usersProcessed)
  yield* Metric.increment(usersProcessed)
  yield* Metric.incrementBy(usersProcessed, 3)
  const snapshot = yield* Metric.snapshot(usersProcessed)
  return snapshot
})

Effect.runPromise(program).then(console.log)`,
    hints: [
      "Use `Metric.counter(name, { description })` to create a counter",
      "Use `Metric.increment(counter)` or `Metric.incrementBy(counter, n)`",
      "Use `Metric.snapshot(counter)` to read the current value",
    ],
    feedbackOnComplete:
      "Great! Counters let you track events without mutable state. Metrics are composable and work with Effect.",
  },
  {
    orderIndex: 2,
    title: "Metric.timer for measuring duration",
    patternTitle: "Add Custom Metrics to Your Application",
    instruction: "Use `Metric.timer` to measure how long operations take. Wrap an Effect with `Metric.trackDuration(timer)` to record the duration automatically.",
    conceptCode: `import { Effect } from "effect"

// We want to measure DB query latency
// Manually timing is error-prone...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Metric, Duration } from "effect"

const dbLatency = Metric.timer("db_query_duration", {
  description: "Database query duration",
})

const query = Effect.sleep("50 millis").pipe(
  Effect.as("result")
)

const program = query.pipe(
  Metric.trackDuration(dbLatency),
  Effect.tap((r) => Effect.sync(() => console.log("Result:", r)))
)

Effect.runPromise(program)`,
    hints: [
      "Use `Metric.timer(name, { description })` to create a timer",
      "Use `Metric.trackDuration(timer)(effect)` to measure an Effect",
      "Duration is recorded when the Effect completes",
    ],
    feedbackOnComplete:
      "Perfect! Timers measure latency automatically. Wrap any Effect with trackDuration for observability.",
  },
  {
    orderIndex: 3,
    title: "Composing metrics in pipelines",
    patternTitle: "Compose Metrics into Effect Pipelines",
    instruction: "Metrics compose with Effect. Add `Metric.increment` or `Metric.trackDuration` to your pipeline without changing core logic. Observability stays at the edges.",
    conceptCode: `import { Effect } from "effect"

// Our service does: fetch user, process, save
// We want to count successes and measure each step...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Metric } from "effect"

const successCounter = Metric.counter("operations_success_total")
const stepTimer = Metric.timer("step_duration")

const fetchUser = Effect.succeed({ id: 1, name: "Alice" }).pipe(
  Effect.delay("20 millis"),
  Metric.trackDuration(stepTimer)
)

const program = fetchUser.pipe(
  Effect.tap(() => Metric.increment(successCounter)),
  Effect.tap((user) => Effect.sync(() => console.log(user)))
)

Effect.runPromise(program)`,
    hints: [
      "Use `Metric.trackDuration(timer)(effect)` to wrap an operation",
      "Use `Effect.tap(() => Metric.increment(counter))` to count",
      "Metrics don't change the success value",
    ],
    feedbackOnComplete:
      "Excellent! Metrics integrate seamlessly. Add counters and timers to your pipelines for production observability.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 15: Cause and Defects
// ---------------------------------------------------------------------------

const lesson15Steps = [
  {
    orderIndex: 1,
    title: "Cause.isFailure vs Cause.isDie",
    patternTitle: "Handle Unexpected Errors by Inspecting the Cause",
    instruction: "Effects can fail in two ways: `Failure` (expected, typed errors) and `Die` (defects—unexpected crashes). Use `Cause.isFailure` and `Cause.isDie` to inspect what went wrong.",
    conceptCode: `import { Effect } from "effect"

// An Effect might fail with our error type, or crash with a defect
// How do we tell them apart?`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Cause } from "effect"

const program = Effect.fail("expected error").pipe(
  Effect.catchAllCause((cause) =>
    Effect.sync(() => {
      if (Cause.isFailure(cause)) {
        console.log("Expected failure:", Cause.failures(cause))
      } else if (Cause.isDie(cause)) {
        console.log("Defect (bug):", Cause.defects(cause))
      }
    })
  )
)

Effect.runPromise(program)`,
    hints: [
      "`Cause.isFailure(cause)` - expected, typed errors",
      "`Cause.isDie(cause)` - defects (bugs, unhandled exceptions)",
      "Use these to decide how to handle",
    ],
    feedbackOnComplete:
      "Great! Distinguishing failures from defects helps you handle expected errors vs log unexpected bugs.",
  },
  {
    orderIndex: 2,
    title: "Effect.catchAll for global error handling",
    patternTitle: "Handle Unexpected Errors by Inspecting the Cause",
    instruction: "Use `Effect.catchAllCause` to handle any error, including defects. The handler receives the full `Cause`. You can log, convert to a fallback, or rethrow.",
    conceptCode: `import { Effect } from "effect"

// We want a top-level handler that catches everything
// Failures and defects alike...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Cause } from "effect"

const flakyOp = Effect.try({
  try: () => {
    if (Math.random() > 0.5) throw new Error("oops")
    return "ok"
  },
  catch: (e) => e as Error,
})

const program = flakyOp.pipe(
  Effect.catchAllCause((cause) =>
    Effect.sync(() => {
      console.log("Caught:", Cause.pretty(cause))
      return "fallback"
    })
  )
)

Effect.runPromise(program).then(console.log)`,
    hints: [
      "Use `Effect.catchAllCause(handler)` to catch any error and get the Cause",
      "Handler receives the full Cause",
      "Use `Cause.pretty(cause)` for readable error output",
    ],
    feedbackOnComplete:
      "Perfect! catchAll is your safety net. Inspect the Cause, log it, and return a fallback without crashing.",
  },
  {
    orderIndex: 3,
    title: "Inspecting Cause for defects",
    patternTitle: "Extract Failures and Defects from a Cause",
    instruction: `Use \`Cause.defects\` to extract defect values, or \`Cause.failures\` for expected failures. Handle defects differently—log and alert, don't treat them as business logic.`,
    conceptCode: `import { Effect } from "effect"

// We caught an error - is it a defect we should log?
// Cause.defects and Cause.failures let us inspect...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Cause } from "effect"

const program = Effect.die("unexpected bug").pipe(
  Effect.catchAllCause((cause) =>
    Effect.gen(function* () {
      const defects = Cause.defects(cause)
      const failures = Cause.failures(cause)
      yield* Effect.sync(() => {
        console.log("Defects:", defects)
        console.log("Failures:", failures)
      })
      return "recovered"
    })
  )
)

Effect.runPromise(program)`,
    hints: [
      "Use `Cause.defects(cause)` for defect values",
      "Use `Cause.failures(cause)` for expected failures",
      "Defects = bugs; failures = typed errors",
    ],
    feedbackOnComplete:
      "Excellent! Cause inspection gives you full control. Log defects, recover from failures, and keep your system stable.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 16: Runtimes
// ---------------------------------------------------------------------------

const lesson16Steps = [
  {
    orderIndex: 1,
    title: "ManagedRuntime.make for reusable execution",
    patternTitle: "Create a Managed Runtime for Scoped Resources",
    instruction: "Use `ManagedRuntime.make(layer)` to create a runtime from a layer. The runtime bakes in your services— run effects with `runtime.runPromise(effect)` without passing layers each time. Call `runtime.dispose()` when done to clean up scoped resources.",
    conceptCode: `import { Effect } from "effect"

// We have a service layer - we want to run many effects with it
// Effect.provide(effect, layer) every time is tedious...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer, ManagedRuntime } from "effect"

class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({ log: (msg: string) => Effect.sync(() => console.log(msg)) }),
}) {}

const program = Effect.gen(function* () {
  const logger = yield* Logger
  yield* logger.log("Hello from runtime!")
})

async function main() {
  const runtime = ManagedRuntime.make(Logger.Default)
  await runtime.runPromise(program)
  await runtime.dispose()
}

main()`,
    hints: [
      "Use `ManagedRuntime.make(layer)` to create a runtime",
      "Use `runtime.runPromise(effect)` to run effects",
      "Call `runtime.dispose()` when done to clean up",
    ],
    feedbackOnComplete:
      "Perfect! ManagedRuntime lets you run many effects with the same layer. No more passing layers to every Effect.runPromise call.",
  },
  {
    orderIndex: 2,
    title: "When to use Runtime vs Effect.provide",
    patternTitle: "Choose Between ManagedRuntime and Effect.provide",
    instruction: "Use a `ManagedRuntime` when you run many effects with the same layers—HTTP servers, long-running workers, REPLs. Use `Effect.provide(program, layer)` for one-off scripts or when each program has different needs.",
    conceptCode: `import { Effect } from "effect"

// One-off script: fetch data, process, exit
// vs
// HTTP server: handle many requests, same DB connection
// When do we use which?`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer, ManagedRuntime } from "effect"

class Db extends Effect.Service<Db>()("Db", {
  sync: () => ({ query: () => Effect.succeed("data") }),
}) {}

// One-off: provide at the edge
const oneOff = Effect.gen(function* () {
  const db = yield* Db
  return yield* db.query()
})
Effect.runPromise(Effect.provide(oneOff, Db.Default))

// Many runs: create runtime once
const runtime = ManagedRuntime.make(Db.Default)
const effect = Effect.gen(function* () {
  const db = yield* Db
  return yield* db.query()
})
runtime.runPromise(effect).then(console.log)
runtime.dispose()`,
    hints: [
      "Runtime: many effects, same layers, long-running",
      "Effect.provide: single effect, one-off",
      "Runtime needs dispose() for scoped resources",
    ],
    feedbackOnComplete:
      "Great! Choose Runtime for servers and workers; use Effect.provide for scripts. Both inject layers—the difference is how often you run.",
  },
  {
    orderIndex: 3,
    title: "Runtime.runFork for long-running effects",
    patternTitle: "Execute Long-Running Apps with Effect.runFork",
    instruction: "Use `runtime.runFork(effect)` to run an effect in a background fiber. Returns a `Fiber` you can `join` or `interrupt`. Useful for servers that handle requests without blocking the main flow.",
    conceptCode: `import { Effect } from "effect"

// A long-running server - we don't want to block
// runPromise would wait forever...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Layer, ManagedRuntime } from "effect"

class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({ log: (msg: string) => Effect.sync(() => console.log(msg)) }),
}) {}

const server = Effect.log("Request received").pipe(
  Effect.delay("1 second"),
  Effect.forever
)

async function main() {
  const runtime = ManagedRuntime.make(Logger.Default)
  const fiber = runtime.runFork(server)
  await Effect.runPromise(Effect.sleep("2 seconds"))
  Effect.runPromise(fiber.interrupt)
  await runtime.dispose()
}

main()`,
    hints: [
      "Use `runtime.runFork(effect)` to run in background",
      "Returns a Fiber - use interrupt to stop",
      "Don't block; the fiber runs independently",
    ],
    feedbackOnComplete:
      "Excellent! runFork launches long-running effects without blocking. Perfect for servers, watchers, and background jobs.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 17: Refs
// ---------------------------------------------------------------------------

const lesson17Steps = [
  {
    orderIndex: 1,
    title: "Ref.make, Ref.get, Ref.update",
    patternTitle: "Manage Shared State Safely with Ref",
    instruction: "`Ref` is a mutable reference for concurrent state. Use `Ref.make(initial)` to create one. `Ref.get` reads the value; `Ref.update` atomically replaces it with a function of the current value. All operations are effectful.",
    conceptCode: `import { Effect } from "effect"

// We need shared state - mutable variables are unsafe with fibers
// Ref gives us atomic, effectful updates...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Ref } from "effect"

const program = Effect.gen(function* () {
  const ref = yield* Ref.make(0)
  yield* Ref.update(ref, (n) => n + 1)
  yield* Ref.update(ref, (n) => n + 1)
  const value = yield* Ref.get(ref)
  return value
})

Effect.runPromise(program).then(console.log) // 2`,
    hints: [
      "Use `Ref.make(initial)` to create a Ref",
      "Use `Ref.get(ref)` to read the current value",
      "Use `Ref.update(ref, fn)` - fn receives current, returns new",
    ],
    feedbackOnComplete:
      "Perfect! Ref gives you safe, atomic state updates. No race conditions—all operations are effectful and composable.",
  },
  {
    orderIndex: 2,
    title: "Ref.modify for read-and-update",
    patternTitle: "Manage Shared State Safely with Ref",
    instruction: "Use `Ref.modify(ref, fn)` when you need to read and update atomically. The function receives the current value and returns `[newValue, result]`—the Ref is set to `newValue`, and the Effect succeeds with `result`.",
    conceptCode: `import { Effect, Ref } from "effect"

// We want: read current, increment, return old value
// Ref.update doesn't return the previous value...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Ref } from "effect"

const program = Effect.gen(function* () {
  const ref = yield* Ref.make(0)
  const prev = yield* Ref.modify(ref, (n) => [n + 1, n])
  const curr = yield* Ref.get(ref)
  console.log("prev:", prev, "curr:", curr) // prev: 0, curr: 1
  return prev
})

Effect.runPromise(program)`,
    hints: [
      "Use `Ref.modify(ref, (current) => [newValue, result])`",
      "Returns the \`result\`; Ref is set to \`newValue\`",
      "Atomic: no other fiber can interrupt between read and write",
    ],
    feedbackOnComplete:
      "Great! Ref.modify is atomic read-and-update. Perfect for counters, IDs, or any state where you need both the old and new value.",
  },
  {
    orderIndex: 3,
    title: "Sharing Ref across fibers",
    patternTitle: "Manage Shared State Safely with Ref",
    instruction: "Pass a `Ref` to multiple fibers to share state. Each fiber can `Ref.get` and `Ref.update`—updates are atomic. No locks needed; Ref handles concurrent access safely.",
    conceptCode: `import { Effect } from "effect"

// Two fibers need to update a shared counter
// Without Ref: race conditions. With Ref: safe.`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Ref } from "effect"

const program = Effect.gen(function* () {
  const ref = yield* Ref.make(0)
  yield* Effect.all(
    [
      Ref.update(ref, (n) => n + 1),
      Ref.update(ref, (n) => n + 1),
      Ref.update(ref, (n) => n + 1),
    ],
    { concurrency: "unbounded" }
  )
  return yield* Ref.get(ref)
})

Effect.runPromise(program).then(console.log) // 3`,
    hints: [
      "Create Ref once, pass to Effect.all or forked fibers",
      "Ref.update is atomic—safe for concurrent access",
      "Use Ref instead of mutable variables with fibers",
    ],
    feedbackOnComplete:
      "Excellent! Ref is designed for concurrent state. Share it across fibers; updates are atomic. No locks, no races.",
  },
]

// ---------------------------------------------------------------------------
// Lesson 12: Schema and Validation
// ---------------------------------------------------------------------------

const lesson12Steps = [
  {
    orderIndex: 1,
    title: "Schema.decode for validation",
    patternTitle: "Parse and Validate Data with Schema.decode",
    instruction: `\`Schema.decode\` validates unknown data and returns a typed result. Invalid data produces a \`ParseError\` on the error channel.

In the anti-pattern, we trust input. In the Effect way, we validate.`,
    conceptCode: `import { Effect } from "effect"

// Anti-pattern: Trust user input
const parseUser = (data: unknown) => {
  const obj = data as { name: string }
  return obj.name  // ❌ Could crash! What if data is wrong?
}`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Schema } from "effect"

const UserSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number.pipe(Schema.int()),
})

const parseUser = (data: unknown) =>
  Schema.decodeUnknown(UserSchema)(data)

const program = parseUser({ name: "Alice", age: 30 }).pipe(
  Effect.tap((user) => Effect.sync(() => console.log(user)))
)

Effect.runPromise(program)`,
    hints: [
      "Use `Schema.Struct({ ... })` to define shapes",
      "Use `Schema.decodeUnknown(schema)(data)` to validate",
      "Returns Effect - success or ParseError",
    ],
    feedbackOnComplete:
      "Great! Schema validation is type-safe. Invalid data never reaches your code; you get a ParseError with details.",
  },
  {
    orderIndex: 2,
    title: "Schema with refinements",
    patternTitle: "Transform Data During Validation with Schema",
    instruction: `Add \`Schema.pipe(Schema.minLength(n))\`, \`Schema.email()\`, etc. to refine schemas. Compose validation rules.

Each pipe adds a constraint. Validation is declarative.`,
    conceptCode: `import { Effect, Schema } from "effect"

// We need: non-empty string, valid email format
// Schema lets us compose these...`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Schema } from "effect"

const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, {
    message: () => "Invalid email format",
  })
)

const CreateUserSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  email: EmailSchema,
})

const program = Schema.decodeUnknown(CreateUserSchema)({
  name: "Alice",
  email: "alice@example.com",
}).pipe(
  Effect.tap((user) => Effect.sync(() => console.log(user)))
)

Effect.runPromise(program)`,
    hints: [
      "Use `Schema.pipe(Schema.minLength(n))` for strings",
      "Use `Schema.pattern(regex)` for format validation",
      "Compose schemas for complex types",
    ],
    feedbackOnComplete:
      "Perfect! Refinements make schemas precise. Email format, min length, positive numbers - all declarative.",
  },
  {
    orderIndex: 3,
    title: "Schema.decodeEither for sync validation",
    patternTitle: "Parse and Validate Data with Schema.decode",
    instruction: `Use \`Schema.decodeEither\` when you need sync validation (e.g. in a non-Effect context). Returns \`Either<ParseError, A>\`.

Or use \`Schema.decode\` which returns \`Effect<A, ParseError>\` for Effect pipelines.`,
    conceptCode: `import { Effect, Schema } from "effect"

const UserSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
})

// Sometimes we need sync: decodeEither
// Sometimes we're in Effect: decode`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Schema, Either } from "effect"

const UserSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
})

// Sync: use decodeEither
const result = Schema.decodeUnknownEither(UserSchema)({ name: "Alice", age: 30 })

if (Either.isRight(result)) {
  console.log("Valid:", result.right)
} else {
  console.log("Invalid:", result.left)
}

// Or in Effect pipeline: use decode
const program = Schema.decodeUnknown(UserSchema)({ name: "Alice", age: 30 })
Effect.runPromise(program).then(console.log)`,
    hints: [
      "Use `Schema.decodeUnknownEither(schema)(data)` for sync",
      "Returns Either - isRight for success, isLeft for failure",
      "Use decode in Effect pipelines",
    ],
    feedbackOnComplete:
      "Excellent! decodeEither for sync, decode for Effect. Same schema, different integration points.",
  },
]

// ---------------------------------------------------------------------------
// Pattern title → ID resolver
// ---------------------------------------------------------------------------

interface StepDefinition {
  orderIndex: number
  title: string
  patternTitle: string | null
  instruction: string
  conceptCode: string
  conceptCodeLanguage: string
  solutionCode: string
  hints: string[]
  feedbackOnComplete: string
}

/** Cache of pattern title → id (reads from LIVE patterns table) */
let patternCache: Map<string, string> | null = null

async function buildPatternCache() {
  const allPatterns = await db.select({ id: patterns.id, title: patterns.title }).from(patterns)
  patternCache = new Map(allPatterns.map((p) => [p.title, p.id]))
  console.log(`Loaded ${patternCache.size} patterns for linking`)
}

function resolvePatternId(patternTitle: string | null): string | null {
  if (!patternTitle || !patternCache) return null
  const id = patternCache.get(patternTitle)
  if (!id) {
    console.warn(`  ⚠ Pattern not found: "${patternTitle}"`)
  }
  return id ?? null
}

/**
 * Insert steps into the STAGING table with deterministic IDs.
 * The step UUID is derived from (lessonSlug, step.orderIndex).
 */
async function insertSteps(lessonSlug: string, deterministicLessonId: string, steps: StepDefinition[]) {
  for (const step of steps) {
    await db.insert(tourStepsStaging).values({
      id: stepId(lessonSlug, step.orderIndex),
      lessonId: deterministicLessonId,
      orderIndex: step.orderIndex,
      title: step.title,
      instruction: step.instruction,
      conceptCode: step.conceptCode,
      conceptCodeLanguage: step.conceptCodeLanguage,
      solutionCode: step.solutionCode,
      playgroundUrl: null,
      hints: step.hints,
      feedbackOnComplete: step.feedbackOnComplete,
      patternId: resolvePatternId(step.patternTitle),
    })
  }
}

// ---------------------------------------------------------------------------
// Lesson definitions (data-driven for blue-green seeding)
// ---------------------------------------------------------------------------

interface LessonDefinition {
  readonly slug: string
  readonly title: string
  readonly description: string
  readonly orderIndex: number
  readonly group: string
  readonly difficulty: string
  readonly estimatedMinutes: number
  readonly steps: StepDefinition[]
}

const allLessons: LessonDefinition[] = [
  {
    slug: "effects-are-lazy",
    title: "Effects Are Lazy Blueprints",
    description: "Learn the fundamental concept that Effects are descriptions of programs, not the programs themselves. They don't execute until you explicitly run them.",
    orderIndex: 1,
    group: "Fundamentals",
    difficulty: "beginner",
    estimatedMinutes: 10,
    steps: lesson1Steps,
  },

  {
    slug: "effect-channels",
    title: "Understanding Effect Channels",
    description: "Learn about Effect's three type channels: Success (A), Error (E), and Requirements (R). Master typed error handling and dependency injection.",
    orderIndex: 2,
    group: "Fundamentals",
    difficulty: "beginner",
    estimatedMinutes: 15,
    steps: lesson2Steps,
  },
  {
    slug: "async-effects",
    title: "Async Effects and Effect.gen",
    description: "Learn Effect.runPromise for async Effects, Effect.gen for sequential code, and Effect.tryPromise for wrapping async operations.",
    orderIndex: 3,
    group: "Fundamentals",
    difficulty: "beginner",
    estimatedMinutes: 12,
    steps: lesson3Steps,
  },
  {
    slug: "layers",
    title: "Layers and Composing Services",
    description: "Learn Layer.merge to compose services, Effect.provide to inject dependencies, and Layer.scoped for managed resources.",
    orderIndex: 4,
    group: "Composition",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    steps: lesson4Steps,
  },
  {
    slug: "resource-management",
    title: "Resource Management",
    description: "Learn Effect.acquireRelease for manual acquire/release, Effect.scoped for bracket-style cleanup, and guaranteed release even on failure.",
    orderIndex: 5,
    group: "Composition",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson5ResourceManagementSteps,
  },
  {
    slug: "retries",
    title: "Retries and Resilience",
    description: "Learn Effect.retry, Effect.timeout, and Schedule for building resilient programs that handle flaky operations.",
    orderIndex: 6,
    group: "Concurrency",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson6Steps,
  },
  {
    slug: "fibers",
    title: "Fibers and Concurrency",
    description: "Learn Effect.fork for background work, Fiber.join to wait for results, and Fiber.interrupt to cancel.",
    orderIndex: 7,
    group: "Concurrency",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson7Steps,
  },
  {
    slug: "parallel",
    title: "Parallel Processing",
    description: "Learn Effect.all for parallel execution, Effect.forEach with concurrency, and structured parallelism.",
    orderIndex: 8,
    group: "Concurrency",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson8Steps,
  },
  {
    slug: "streams",
    title: "Streams",
    description: "Learn Stream.fromIterable, runCollect, filter, take, and runDrain for incremental data processing.",
    orderIndex: 9,
    group: "Data & I/O",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson9Steps,
  },
  {
    slug: "chunk",
    title: "Chunk",
    description: "Learn Chunk.fromIterable, append, prepend, take, and when to use Chunk over Array in Effect pipelines.",
    orderIndex: 10,
    group: "Data & I/O",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson10ChunkSteps,
  },
  {
    slug: "testing-layers",
    title: "Testing with Layers",
    description: "Learn how to provide test implementations with Layer.succeed, making your Effect code testable without mocks.",
    orderIndex: 11,
    group: "Data & I/O",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson11Steps,
  },
  {
    slug: "schema",
    title: "Schema and Validation",
    description: "Learn Schema.decode for validation, refinements like minLength and pattern, and decodeEither for sync validation.",
    orderIndex: 12,
    group: "Validation",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson12Steps,
  },
  {
    slug: "queues-pubsub",
    title: "Queues and PubSub",
    description: "Learn Queue.bounded for producer-consumer, PubSub for broadcasting, and forking consumers for decoupled workflows.",
    orderIndex: 13,
    group: "Concurrency",
    difficulty: "advanced",
    estimatedMinutes: 15,
    steps: lesson13Steps,
  },
  {
    slug: "metrics",
    title: "Metrics",
    description: "Learn Metric.counter for counting events, Metric.timer for duration, and composing metrics in Effect pipelines.",
    orderIndex: 14,
    group: "Data & I/O",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson14Steps,
  },
  {
    slug: "cause-defects",
    title: "Cause and Defects",
    description: "Learn Cause.isFailure vs Cause.isDie, Effect.catchAllCause for global handling, and inspecting Cause for defects.",
    orderIndex: 15,
    group: "Composition",
    difficulty: "advanced",
    estimatedMinutes: 12,
    steps: lesson15Steps,
  },
  {
    slug: "runtimes",
    title: "Runtimes",
    description: "Learn ManagedRuntime.make for reusable execution, when to use Runtime vs Effect.provide, and Runtime.runFork for long-running effects.",
    orderIndex: 16,
    group: "Composition",
    difficulty: "advanced",
    estimatedMinutes: 15,
    steps: lesson16Steps,
  },
  {
    slug: "refs",
    title: "Refs",
    description: "Learn Ref.make, Ref.get, Ref.update for concurrent state, Ref.modify for atomic read-and-update, and sharing Ref across fibers.",
    orderIndex: 17,
    group: "Concurrency",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    steps: lesson17Steps,
  },
]

// ---------------------------------------------------------------------------
// Seed execution — writes to STAGING tables with deterministic IDs
// ---------------------------------------------------------------------------

async function seed() {
  // Always clear staging tables (they're scratch space)
  console.log("Clearing staging tables...")
  await db.delete(tourStepsStaging)
  await db.delete(tourLessonsStaging)

  // Build pattern cache for linking steps → patterns (reads from LIVE table)
  await buildPatternCache()

  // Insert all lessons and steps into staging tables
  let totalSteps = 0
  for (const lesson of allLessons) {
    const deterministicId = lessonId(lesson.slug)

    console.log(`\nStaging Lesson ${lesson.orderIndex}: ${lesson.title} (id: ${deterministicId.slice(0, 8)}...)`)

    await db.insert(tourLessonsStaging).values({
      id: deterministicId,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      orderIndex: lesson.orderIndex,
      group: lesson.group,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
    })

    await insertSteps(lesson.slug, deterministicId, lesson.steps)
    totalSteps += lesson.steps.length
    console.log(`  → ${lesson.steps.length} steps staged`)
  }

  // Record the deployment
  await db.insert(contentDeployments).values({
    tableGroup: "tour",
    status: "staged",
    rowCount: allLessons.length + totalSteps,
    metadata: { lessons: allLessons.length, steps: totalSteps },
  })

  console.log(`\nStaging complete! ${allLessons.length} lessons, ${totalSteps} steps.`)
  console.log("To promote to live, run:")
  console.log("  bun run db:promote tour")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
