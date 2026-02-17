import { Schema } from "effect"

export const FeedbackSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "Invalid email address",
    })
  ),
  message: Schema.String.pipe(
    Schema.minLength(10, { message: () => "Please provide at least 10 characters of feedback" })
  ),
})

export type FeedbackInput = Schema.Schema.Type<typeof FeedbackSchema>
