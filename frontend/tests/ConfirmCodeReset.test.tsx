import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetCode from "../src/components/helpers/ConfirmCodeReset"
import React from "react"

beforeAll(() => {
    Object.defineProperty(global, 'import', {
        value: {
        meta: {
            env: {
            VITE_BACKEND_URL: 'http://localhost:8000'
            }
        }
        }
    })
})

const open = {
    isOpen: true,
    setClose: jest.fn(),
    setReset: jest.fn(),
    setNoReset: jest.fn()
};
const closed = {
    isOpen: false,
    setClose: jest.fn(),
    setReset: jest.fn(),
    setNoReset: jest.fn()
};

describe("ConfirmCodeReset", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("doesn't render modal if isOpen is false", async () => {
        render(<ResetCode isOpen={closed.isOpen} setClose={closed.setClose}
            setReset={closed.setReset} setNoReset={closed.setNoReset} />)

        expect(screen.queryByTestId("confirm-code-reset")).not.toBeInTheDocument()
        expect(screen.queryByTestId("x-reset-btn")).not.toBeInTheDocument()
        expect(screen.queryByTestId("cancel-reset-btn")).not.toBeInTheDocument()
        expect(screen.queryByTestId("reset-btn")).not.toBeInTheDocument()
        expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument()
        expect(screen.queryByText(/will delete/)).not.toBeInTheDocument()
    })

    it("renders modal if isOpen is true", async () => {
        render(<ResetCode isOpen={open.isOpen} setClose={open.setClose}
            setReset={open.setReset} setNoReset={open.setNoReset} />)

        expect(screen.getByTestId("confirm-code-reset")).toBeInTheDocument()
        expect(screen.getByTestId("x-reset-btn")).toBeInTheDocument()
        expect(screen.getByTestId("cancel-reset-btn")).toBeInTheDocument()
        expect(screen.getByTestId("reset-btn")).toBeInTheDocument()
        expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
        expect(screen.getByText(/will delete/)).toBeInTheDocument()
    })

    it("closes the modal without resetting when the X button is clicked", async () => {
        render(<ResetCode isOpen={open.isOpen} setClose={open.setClose}
            setReset={open.setReset} setNoReset={open.setNoReset} />)

        fireEvent.click(screen.getByTestId("x-reset-btn"))

        await waitFor(() => {
            expect(open.setClose).toHaveBeenCalled()
            expect(open.setNoReset).toHaveBeenCalled()
            expect(open.setReset).not.toHaveBeenCalled()
            // expect(screen.getByTestId("confirm-code-reset")).not.toBeInTheDocument()
        })
    })

    it("closes the modal without resetting when the 'Cancel' button is clicked", async () => {
        render(<ResetCode isOpen={open.isOpen} setClose={open.setClose}
            setReset={open.setReset} setNoReset={open.setNoReset} />)

        fireEvent.click(screen.getByTestId("cancel-reset-btn"))

        await waitFor(() => {
            expect(open.setClose).toHaveBeenCalled()
            expect(open.setNoReset).toHaveBeenCalled()
            expect(open.setReset).not.toHaveBeenCalled()
            // expect(screen.getByTestId("confirm-code-reset")).not.toBeInTheDocument()
        })
    })

    it("resets and closes the modal when the 'Continue' button is clicked", async () => {
        render(<ResetCode isOpen={open.isOpen} setClose={open.setClose}
            setReset={open.setReset} setNoReset={open.setNoReset} />)

        fireEvent.click(screen.getByTestId("reset-btn"))

        await waitFor(() => {
            expect(open.setClose).toHaveBeenCalled()
            expect(open.setNoReset).not.toHaveBeenCalled()
            expect(open.setReset).toHaveBeenCalled()
            // expect(screen.getByTestId("confirm-code-reset")).not.toBeInTheDocument()
        })
    })
})
