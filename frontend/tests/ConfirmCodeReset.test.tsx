import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetCode from "../src/components/helpers/ConfirmCodeReset"

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
        expect(screen.queryByTestId("cancel-reset-btn")).not.toBeInTheDocument()
        expect(screen.queryByTestId("reset-btn")).not.toBeInTheDocument()
        expect(screen.queryByText(/Reset your code/)).not.toBeInTheDocument()
        expect(screen.queryByText(/will delete/)).not.toBeInTheDocument()
    })

    it("renders modal if isOpen is true", async () => {
        render(<ResetCode isOpen={open.isOpen} setClose={open.setClose}
            setReset={open.setReset} setNoReset={open.setNoReset} />)

        expect(screen.getByTestId("confirm-code-reset")).toBeInTheDocument()
        expect(screen.getByTestId("cancel-reset-btn")).toBeInTheDocument()
        expect(screen.getByTestId("reset-btn")).toBeInTheDocument()
        expect(screen.getByText(/Reset your code/)).toBeInTheDocument()
        expect(screen.getByText(/will delete/)).toBeInTheDocument()
    })

    it("closes the modal without resetting when the 'Cancel' button is clicked", async () => {
        render(<ResetCode isOpen={open.isOpen} setClose={open.setClose}
            setReset={open.setReset} setNoReset={open.setNoReset} />)

        fireEvent.click(screen.getByTestId("cancel-reset-btn"))

        await waitFor(() => {
            expect(open.setClose).toHaveBeenCalled()
            expect(open.setNoReset).toHaveBeenCalled()
            expect(open.setReset).not.toHaveBeenCalled()
        })
    })

    it("resets and closes the modal when the 'Reset' button is clicked", async () => {
        render(<ResetCode isOpen={open.isOpen} setClose={open.setClose}
            setReset={open.setReset} setNoReset={open.setNoReset} />)

        fireEvent.click(screen.getByTestId("reset-btn"))

        await waitFor(() => {
            expect(open.setClose).toHaveBeenCalled()
            expect(open.setNoReset).not.toHaveBeenCalled()
            expect(open.setReset).toHaveBeenCalled()
        })
    })
})
