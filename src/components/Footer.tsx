"use client"

import { FeedbackDialog } from "@/components/FeedbackDialog"

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <p className="text-sm text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} Paul Philp. Built with Effect.ts.{" "}
          <FeedbackDialog />
        </p>
      </div>
    </footer>
  )
}
