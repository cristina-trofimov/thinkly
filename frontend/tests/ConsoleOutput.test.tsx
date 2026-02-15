import React from "react";
import ConsoleOutput from "../src/components/codingPage/ConsoleOutput"
import { Judge0Response } from "../src/types/questions/Judge0Response"
import { render, screen } from '@testing-library/react'

describe("ConsoleOutput component", () => {
    const success_log: Judge0Response[] = [
        {
            time: "0.12",
            token: "asdf134",
            stdout: "",
            stderr: "",
            compile_output: "",
            message: "",
            memory: "",
            status: {
                id: 1,
                description: "Accepted"
            }
        },
    ]
    const failed_log: Judge0Response[] = [{
        time: "0.12",
        token: "asdf134",
        stdout: "std out",
        stderr: "std err",
        compile_output: "compile_output",
        message: "message",
        memory: "3600",
        status: {
            id: 1,
            description: "Compilation Error"
        }
    }]

    it("should properly display successful logs", () => {
        render(<ConsoleOutput logs={success_log} />)

        expect(screen.getByText("Passed")).toBeInTheDocument()
        expect(screen.getByTestId("log-time")).toBeInTheDocument()
        expect(screen.queryByTestId("log-stdout")).not.toBeInTheDocument()
        expect(screen.queryByTestId("log-stderr")).not.toBeInTheDocument()
        expect(screen.queryByTestId("log-compile-output")).not.toBeInTheDocument()
        expect(screen.queryByTestId("log-message")).not.toBeInTheDocument()
    })

    it("should properly display failed logs", () => {
        render(<ConsoleOutput logs={failed_log} />)

        expect(screen.getByText("Failed")).toBeInTheDocument()
        expect(screen.getByTestId("log-time")).toBeInTheDocument()
        expect(screen.getByTestId("log-stdout")).toBeInTheDocument()
        expect(screen.getByTestId("log-stderr")).toBeInTheDocument()
        expect(screen.getByTestId("log-compile-output")).toBeInTheDocument()
        expect(screen.getByTestId("log-message")).toBeInTheDocument()
    })
})
