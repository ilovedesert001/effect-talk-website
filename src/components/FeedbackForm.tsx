"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FeedbackFormProps {
  /** When provided, called on success instead of redirecting (e.g. for dialog use). */
  onSuccess?: () => void
  /** When true, form is rendered without the Card wrapper (e.g. inside FeedbackDialog). */
  embedded?: boolean
}

export function FeedbackForm({ onSuccess, embedded = false }: FeedbackFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name") || undefined,
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Something went wrong")
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/thanks")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setIsSubmitting(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="feedback-name">Name</Label>
          <Input id="feedback-name" name="name" placeholder="Your name (optional)" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="feedback-email">Email *</Label>
          <Input
            id="feedback-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="feedback-message">Message *</Label>
        <Textarea
          id="feedback-message"
          name="message"
          required
          placeholder="Share your feedback, bug report, or suggestion..."
          rows={5}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Feedback"}
      </Button>
    </form>
  )

  if (embedded) {
    return formContent
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Send Feedback</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}
