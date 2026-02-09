#!/usr/bin/env bun

/**
 * Helper script to generate Effect Playground URLs for tour steps.
 *
 * Since the Effect Playground doesn't expose an API for programmatic URL generation,
 * this script helps automate the manual process:
 * 1. Opens the Effect Playground in your browser
 * 2. Shows you the code to paste
 * 3. Waits for you to click "Share" and copy the URL
 * 4. Updates the database with the URL
 *
 * Usage:
 *   bun run scripts/generate-playground-urls.ts [lesson-slug]
 *
 * If no lesson slug is provided, it will process all lessons.
 *
 * Note: Playground URLs are optional. If a step doesn't have one, users can still
 * open the playground manually and paste the code.
 */

import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq, and, isNull } from "drizzle-orm"
import { tourLessons, tourSteps } from "../src/db/schema"
import { spawn } from "node:child_process"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(rootDir, "..", ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local")
  process.exit(1)
}

const db = drizzle(databaseUrl)

async function generateUrlsForLesson(lessonSlug?: string) {
  // Fetch lessons
  const lessons = lessonSlug
    ? await db.select().from(tourLessons).where(eq(tourLessons.slug, lessonSlug))
    : await db.select().from(tourLessons).orderBy(tourLessons.orderIndex)

  if (lessons.length === 0) {
    console.error(`No lessons found${lessonSlug ? ` for slug: ${lessonSlug}` : ""}`)
    process.exit(1)
  }

  for (const lesson of lessons) {
    console.log(`\n📚 Processing: ${lesson.title} (${lesson.slug})`)
    console.log("─".repeat(60))

    // Fetch steps without playground URLs
    const steps = await db
      .select()
      .from(tourSteps)
      .where(and(eq(tourSteps.lessonId, lesson.id), isNull(tourSteps.playgroundUrl)))
      .orderBy(tourSteps.orderIndex)

    if (steps.length === 0) {
      console.log("✅ All steps already have playground URLs")
      continue
    }

    console.log(`Found ${steps.length} step(s) without playground URLs\n`)

    for (const step of steps) {
      console.log(`\n📍 Step ${step.orderIndex}: ${step.title}`)
      console.log("─".repeat(60))

      // Display the code to paste
      const codeToPaste = step.conceptCode || step.solutionCode || ""
      if (!codeToPaste) {
        console.log("⚠️  No code found for this step, skipping...")
        continue
      }

      console.log("\n📋 Code to paste:")
      console.log("─".repeat(60))
      console.log(codeToPaste)
      console.log("─".repeat(60))

      // Open Effect Playground
      console.log("\n🌐 Opening Effect Playground in your browser...")
      const playgroundUrl = "https://effect.website/play"
      const command = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open"
      spawn(command, [playgroundUrl], { stdio: "ignore", detached: true }).unref()

      // Wait for user to paste code and get share URL
      console.log("\n📝 Instructions:")
      console.log("  1. Paste the code above into the Effect Playground editor")
      console.log("  2. Click the 'Share' button")
      console.log("  3. Copy the generated URL")
      console.log("\n⏳ Waiting for you to generate the URL...")

      // Read URL from stdin
      const prompt = "\n🔗 Paste the playground URL (or press Enter to skip this step): "
      process.stdout.write(prompt)

      const url = await new Promise<string>((resolve) => {
        process.stdin.once("data", (data) => {
          resolve(data.toString().trim())
        })
      })

      if (!url || url.length === 0) {
        console.log("⏭️  Skipped")
        continue
      }

      // Validate URL format
      if (!url.startsWith("https://effect.website/play")) {
        console.log(`⚠️  Warning: URL doesn't look like an Effect Playground URL: ${url}`)
        const confirm = await new Promise<string>((resolve) => {
          process.stdout.write("   Continue anyway? (y/n): ")
          process.stdin.once("data", (data) => {
            resolve(data.toString().trim().toLowerCase())
          })
        })
        if (confirm !== "y") {
          console.log("⏭️  Skipped")
          continue
        }
      }

      // Update database
      await db
        .update(tourSteps)
        .set({ playgroundUrl: url })
        .where(eq(tourSteps.id, step.id))

      console.log(`✅ Updated step ${step.orderIndex} with playground URL`)
    }
  }

  console.log("\n✨ Done!")
}

// Main execution
const lessonSlug = process.argv[2]
generateUrlsForLesson(lessonSlug).catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
