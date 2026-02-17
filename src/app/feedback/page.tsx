import { FeedbackForm } from "@/components/FeedbackForm"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Feedback",
  description: "Send feedback, report a bug, or suggest an improvement for EffectTalk.",
})

export default function FeedbackPage() {
  return (
    <div className="container px-4 md:px-6 py-20 flex flex-col items-center">
      <h1 className="text-3xl font-bold tracking-tight mb-3">Send Feedback</h1>
      <p className="text-muted-foreground max-w-md text-center mb-8">
        Share feedback, report a bug, or suggest an improvement. We read every message.
      </p>
      <FeedbackForm />
    </div>
  )
}
