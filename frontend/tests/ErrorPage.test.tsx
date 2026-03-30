import { fireEvent, render, screen } from "@testing-library/react"
import '@testing-library/jest-dom'
import React from "react"
import ErroPage from '../src/views/ErrorPage'

const nav = jest.fn()

jest.mock("react-router-dom", () => ({
    useNavigate: () => nav,
}))

describe('ErrorPage Component', () => {
    it('renders and shows the error messages', () => {
        render(<ErroPage />)
        expect(screen.getAllByText("404").length).toBeGreaterThan(0)
        expect(screen.getByText("Page not found")).toBeInTheDocument()
        expect(screen.getByText("Go back home")).toBeInTheDocument()
    })

    it('Goes back home after clicking on "Go back home" button', () => {
        render(<ErroPage />)
        fireEvent.click(screen.getByText("Go back home"))
        expect(nav).toHaveBeenCalledWith('/app')
    })
})