#!/usr/bin/env bun

/**
 * Seed script: loads tour lessons and steps into the website database.
 *
 * Usage: bun run scripts/seed-tour.ts
 *
 * Set SKIP_DELETE=1 to insert without clearing existing tour data.
 */

import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { tourLessons, tourSteps } from "../src/db/schema"

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
    title: "Effects are descriptions, not actions",
    instruction: `Effects are lazy blueprints. They don't execute until you run them. This means you can build up complex programs without any side effects happening.

In the anti-pattern, we might expect side effects to happen immediately. In the Effect way, we understand nothing happens until we run the Effect.`,
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
      "Excellent observation! The Effect is just a description - a blueprint. Nothing happens until you explicitly run it. This is why Effect is so powerful for building composable, testable programs.",
  },
  {
    orderIndex: 3,
    title: "Chain effects with .pipe and Effect.map",
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

// Effect way: Typed errors with Data.TaggedError
class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: number
}> {}

interface User {
  readonly name: string
}

// Now the error type is explicit and descriptive
const getUser = (id: number): Effect.Effect<User, UserNotFoundError> => {
  if (id === 1) {
    return Effect.succeed({ name: "Alice" })
  }
  return Effect.fail(new UserNotFoundError({ userId: id }))
}

// TypeScript knows exactly what can go wrong
const user = getUser(2) // Effect<User, UserNotFoundError, never>`,
    playgroundUrl: null,
    hints: [
      "Use `Data.TaggedError` to create typed error classes",
      "The error type `E` in `Effect<A, E, R>` documents what can go wrong",
      "Tagged errors provide better error handling and type safety",
    ],
    feedbackOnComplete:
      "Excellent! You've learned that Effect's type system documents not just what succeeds, but what can fail. Tagged errors make error handling explicit and type-safe, unlike throwing exceptions where errors are `unknown`.",
  },
  {
    orderIndex: 2,
    title: "Handling Errors with catchTag",
    instruction: `When an Effect can fail, you need to handle the error. Use \`Effect.catchTag\` to handle specific error types.

In the anti-pattern, we ignore the error type and just run the Effect. In the Effect way, we explicitly handle the error.`,
    conceptCode: `import { Effect, Data } from "effect"

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: number
}> {}

interface User {
  readonly name: string
}

const getUser = (id: number): Effect.Effect<User, UserNotFoundError> => {
  if (id === 1) {
    return Effect.succeed({ name: "Alice" })
  }
  return Effect.fail(new UserNotFoundError({ userId: id }))
}

// Anti-pattern: Ignoring the error type
// This will throw if the user doesn't exist!
const user = getUser(999)
const result = Effect.runSync(user) // 💥 Crashes!`,
    conceptCodeLanguage: "typescript",
    solutionCode: `import { Effect, Data } from "effect"

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: number
}> {}

interface User {
  readonly name: string
}

const getUser = (id: number): Effect.Effect<User, UserNotFoundError> => {
  if (id === 1) {
    return Effect.succeed({ name: "Alice" })
  }
  return Effect.fail(new UserNotFoundError({ userId: id }))
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
    orderIndex: 3,
    title: "The Requirements Channel: Dependency Injection",
    instruction: `The third channel \`R\` represents requirements - services your Effect needs to run.

Instead of importing services directly, Effects declare what they need. This makes code testable and composable.

Create an Effect that needs a Database service.`,
    conceptCode: `// Anti-pattern: Direct import
import { db } from "./database"

const getUser = (id: number) => {
  return db.query(\`SELECT * FROM users WHERE id = \${id}\`)
}

// How do we test this? How do we swap implementations?`,
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
// Seed execution
// ---------------------------------------------------------------------------

async function seed() {
  // Clear existing data (unless SKIP_DELETE=1)
  if (!process.env.SKIP_DELETE) {
    console.log("Clearing existing tour data...")
    await db.delete(tourSteps)
    await db.delete(tourLessons)
  } else {
    console.log("Skipping delete (SKIP_DELETE=1)")
  }

  // Insert Lesson 1
  console.log("Inserting Lesson 1: Effects Are Lazy Blueprints...")
  const [lesson1] = await db
    .insert(tourLessons)
    .values({
      slug: "effects-are-lazy",
      title: "Effects Are Lazy Blueprints",
      description: "Learn the fundamental concept that Effects are descriptions of programs, not the programs themselves. They don't execute until you explicitly run them.",
      orderIndex: 1,
      difficulty: "beginner",
      estimatedMinutes: 10,
    })
    .returning()

  if (!lesson1) {
    throw new Error("Failed to insert lesson 1")
  }

  // Insert Lesson 1 steps
  let inserted = 0
  for (const step of lesson1Steps) {
    await db.insert(tourSteps).values({
      lessonId: lesson1.id,
      orderIndex: step.orderIndex,
      title: step.title,
      instruction: step.instruction,
      conceptCode: step.conceptCode,
      conceptCodeLanguage: step.conceptCodeLanguage,
      solutionCode: step.solutionCode,
      playgroundUrl: null,
      hints: step.hints,
      feedbackOnComplete: step.feedbackOnComplete,
    })
    inserted++
  }

  console.log(`Inserted Lesson 1 with ${inserted} steps`)

  // Insert Lesson 2
  console.log("\nInserting Lesson 2: Understanding Effect Channels...")
  const [lesson2] = await db
    .insert(tourLessons)
    .values({
      slug: "effect-channels",
      title: "Understanding Effect Channels",
      description: "Learn about Effect's three type channels: Success (A), Error (E), and Requirements (R). Master typed error handling and dependency injection.",
      orderIndex: 2,
      difficulty: "beginner",
      estimatedMinutes: 15,
    })
    .returning()

  if (!lesson2) {
    throw new Error("Failed to insert lesson 2")
  }

  // Insert Lesson 2 steps
  inserted = 0
  for (const step of lesson2Steps) {
    await db.insert(tourSteps).values({
      lessonId: lesson2.id,
      orderIndex: step.orderIndex,
      title: step.title,
      instruction: step.instruction,
      conceptCode: step.conceptCode,
      conceptCodeLanguage: step.conceptCodeLanguage,
      solutionCode: step.solutionCode,
      playgroundUrl: null,
      hints: step.hints,
      feedbackOnComplete: step.feedbackOnComplete,
    })
    inserted++
  }

  console.log(`Inserted Lesson 2 with ${inserted} steps`)
  console.log("\nDone!")
  console.log("\nNext steps:")
  console.log("1. Add Lessons 3-5 using the same pattern")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
