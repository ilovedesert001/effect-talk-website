/**
 * Email service API using Resend.
 * Sends confirmation emails for waitlist signups.
 */

import { Effect } from "effect"
import {
  EMAIL_FROM_ADDRESS,
  FEEDBACK_RECIPIENT_EMAIL,
  EMAIL_PATTERNS_LINK,
  BUSINESS_DAYS_RESPONSE_TIME,
  PRODUCT_NAME_PLAYGROUND,
  PRODUCT_NAME_CODE_REVIEW,
} from "@/types/constants"
import type { WaitlistSource } from "@/types/strings"
import { EmailError } from "@/services/Email/errors"
import { getResendClient } from "@/services/Email/helpers"

/**
 * Send a waitlist confirmation email.
 */
export function sendWaitlistConfirmation(
  email: string,
  source: WaitlistSource
): Effect.Effect<void, EmailError> {
  const productName = source === "playground" ? PRODUCT_NAME_PLAYGROUND : PRODUCT_NAME_CODE_REVIEW

  return Effect.tryPromise({
    try: async () => {
      const resend = getResendClient()
      await resend.emails.send({
        from: EMAIL_FROM_ADDRESS,
        to: email,
        subject: `You're on the waitlist for ${productName}!`,
        html: `
          <h2>Welcome to the ${productName} waitlist!</h2>
          <p>Thanks for signing up. We'll notify you as soon as ${productName} is available.</p>
          <p>In the meantime, check out our <a href="${EMAIL_PATTERNS_LINK}">Effect.ts patterns</a>.</p>
          <br/>
          <p>— The EffectTalk Team</p>
        `,
      })
    },
    catch: (error) =>
      new EmailError({
        message: error instanceof Error ? error.message : "Failed to send email",
      }),
  })
}

/**
 * Send a consulting inquiry confirmation email.
 */
export function sendConsultingConfirmation(
  email: string,
  name: string
): Effect.Effect<void, EmailError> {
  return Effect.tryPromise({
    try: async () => {
      const resend = getResendClient()
      await resend.emails.send({
        from: EMAIL_FROM_ADDRESS,
        to: email,
        subject: "We received your consulting inquiry",
        html: `
          <h2>Hi ${name},</h2>
          <p>Thanks for reaching out about Effect.ts consulting. We'll review your inquiry and get back to you within ${BUSINESS_DAYS_RESPONSE_TIME} business days.</p>
          <br/>
          <p>— The EffectTalk Team</p>
        `,
      })
    },
    catch: (error) =>
      new EmailError({
        message: error instanceof Error ? error.message : "Failed to send email",
      }),
  })
}

/**
 * Send a feedback notification email to the site owner.
 */
export function sendFeedbackNotification(data: {
  name: string | null
  email: string
  message: string
}): Effect.Effect<void, EmailError> {
  const fromLabel = data.name ? `${data.name} <${data.email}>` : data.email
  return Effect.tryPromise({
    try: async () => {
      const resend = getResendClient()
      await resend.emails.send({
        from: EMAIL_FROM_ADDRESS,
        to: FEEDBACK_RECIPIENT_EMAIL,
        replyTo: data.email,
        subject: `[EffectTalk] Feedback from ${data.name ?? "Anonymous"}`,
        html: `
          <h2>New feedback</h2>
          <p><strong>From:</strong> ${escapeHtml(fromLabel)}</p>
          <p><strong>Message:</strong></p>
          <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(data.message)}</pre>
        `,
      })
    },
    catch: (error) =>
      new EmailError({
        message: error instanceof Error ? error.message : "Failed to send email",
      }),
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
