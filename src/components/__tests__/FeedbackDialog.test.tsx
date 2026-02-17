/**
 * Minimal render tests for FeedbackDialog (open dialog and assert form is present).
 * useRouter is stubbed so FeedbackForm mounts; we do not assert on navigation or fetch.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FeedbackDialog } from "@/components/FeedbackDialog"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}))

describe("FeedbackDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders trigger that opens dialog with form", () => {
    render(<FeedbackDialog />)
    const trigger = screen.getByRole("button", { name: /send feedback/i })
    expect(trigger).toBeInTheDocument()
    fireEvent.click(trigger)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent("Send Feedback")
    expect(dialog).toHaveTextContent(/share feedback, report a bug/i)
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message \*/i)).toBeInTheDocument()
  })
})
