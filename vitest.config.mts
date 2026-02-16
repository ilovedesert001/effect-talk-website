import { config } from "dotenv"
import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

// Load .env.local so DATABASE_URL and other vars are available for integration tests
config({ path: resolve(process.cwd(), ".env.local") })

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/",
        "**/.next/",
        "**/errors.ts",
        "src/db/schema.ts",
        "src/db/schema-app.ts",
        "src/db/schema-patterns.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "./src"),
    },
  },
})
