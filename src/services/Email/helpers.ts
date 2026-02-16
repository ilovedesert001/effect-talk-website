/**
 * Email service helpers.
 * If RESEND_API_KEY is unset, Resend client is still created but sends will fail;
 * consulting/waitlist routes catch and log, and DB insert still succeeds (no confirmation email).
 * See docs/deployment.md for production setup.
 */

import { Resend } from "resend"

export function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY)
}
