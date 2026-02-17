"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FeedbackForm } from "@/components/FeedbackForm"

interface FeedbackDialogProps {
  /** Custom trigger element. Defaults to a "Send Feedback" text button. */
  trigger?: React.ReactNode
}

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Send Feedback
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Share feedback, report a bug, or suggest an improvement. We read every message.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm embedded onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
