/**
 * Minimal render tests for FeedbackForm (no submit, no network).
 * useRouter is stubbed so the component mounts; we do not assert on navigation or fetch.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { FeedbackForm } from "@/components/FeedbackForm"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}))

describe("FeedbackForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders form with name, email, and message fields and submit button", () => {
    render(<FeedbackForm />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message \*/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send feedback/i })).toBeInTheDocument()
  })

  it("renders card title when not embedded", () => {
    const { container } = render(<FeedbackForm />)
    const cardTitle = container.querySelector("[data-slot=card-title]")
    expect(cardTitle).toBeInTheDocument()
    expect(cardTitle).toHaveTextContent("Send Feedback")
  })

  it("renders without card wrapper when embedded", () => {
    render(<FeedbackForm embedded />)
    expect(screen.queryByRole("heading", { name: /send feedback/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send feedback/i })).toBeInTheDocument()
  })

  it("email and message inputs are required", () => {
    render(<FeedbackForm />)
    const email = screen.getByLabelText(/email \*/i)
    const message = screen.getByLabelText(/message \*/i)
    expect(email).toBeRequired()
    expect(message).toBeRequired()
  })
})
