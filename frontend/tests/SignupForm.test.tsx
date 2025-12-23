/// <reference types="jest" />

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "../src/components/forms/SignupForm";
import { signup, login } from "../src/api/AuthAPI";
import { useNavigate } from "react-router-dom";
import { jest } from '@jest/globals';

// Mock the auth API
jest.mock("@/api/AuthAPI", () => ({
    signup: jest.fn(),
    login: jest.fn(),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

// Mock jwt-decode
jest.mock("jwt-decode", () => ({
    jwtDecode: jest.fn(() => ({
        sub: {
            id: "123",
            email: "test@example.com",
            role: "user",
        },
    })),
}));

// Mock UI components
jest.mock("@/components/ui/button", () => ({
    Button: ({ children, ...props }: any) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("@/components/ui/card", () => ({
    Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardDescription: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock("@/components/ui/field", () => ({
    Field: ({ children }: any) => <div>{children}</div>,
    FieldDescription: ({ children, className }: any) => (
        <p className={className}>{children}</p>
    ),
    FieldGroup: ({ children }: any) => <div>{children}</div>,
    FieldLabel: ({ children, htmlFor }: any) => (
        <label htmlFor={htmlFor}>{children}</label>
    ),
}));

jest.mock("@/components/ui/input", () => ({
    Input: (props: any) => <input {...props} />,
}));

describe("SignupForm", () => {
    const mockSignup = signup as jest.MockedFunction<typeof signup>;
    const mockLogin = login as jest.MockedFunction<typeof login>;

    // Mock localStorage
    let localStorageMock: { [key: string]: string } = {};

    beforeEach(() => {
        jest.clearAllMocks();
        mockNavigate.mockClear();

        // Setup localStorage mock
        localStorageMock = {};
        global.Storage.prototype.setItem = jest.fn((key: string, value: string) => {
            localStorageMock[key] = value;
        });
        global.Storage.prototype.getItem = jest.fn((key: string) => localStorageMock[key]);
        global.Storage.prototype.clear = jest.fn(() => {
            localStorageMock = {};
        });

        // Mock window.alert
        global.alert = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Rendering", () => {
        test("renders signup form with all fields", () => {
            render(<SignupForm />);

            expect(screen.getByText("Create an account")).toBeInTheDocument();
            expect(screen.getByText("Enter your information below to create your account")).toBeInTheDocument();
            expect(screen.getByLabelText("First Name")).toBeInTheDocument();
            expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
            expect(screen.getByLabelText("Email")).toBeInTheDocument();
            expect(screen.getByLabelText(/^Password$/)).toBeInTheDocument();
            expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
        });

        test("renders create account button", () => {
            render(<SignupForm />);

            expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
        });

        test("renders sign in link", () => {
            render(<SignupForm />);

            expect(screen.getByText("Already have an account?")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
        });

        test("renders email description", () => {
            render(<SignupForm />);

            expect(screen.getByText(/We'll use this to contact you/)).toBeInTheDocument();
        });
    });

    describe("Form Input", () => {
        test("allows typing in first name field", async () => {
            const user = userEvent.setup();
            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            await user.type(firstNameInput, "John");

            expect(firstNameInput).toHaveValue("John");
        });

        test("allows typing in last name field", async () => {
            const user = userEvent.setup();
            render(<SignupForm />);

            const lastNameInput = screen.getByLabelText("Last Name");
            await user.type(lastNameInput, "Doe");

            expect(lastNameInput).toHaveValue("Doe");
        });

        test("allows typing in email field", async () => {
            const user = userEvent.setup();
            render(<SignupForm />);

            const emailInput = screen.getByLabelText("Email");
            await user.type(emailInput, "test@example.com");

            expect(emailInput).toHaveValue("test@example.com");
        });

        test("allows typing in password field", async () => {
            const user = userEvent.setup();
            render(<SignupForm />);

            const passwordInput = screen.getByLabelText(/^Password$/);
            await user.type(passwordInput, "password123");

            expect(passwordInput).toHaveValue("password123");
        });

        test("allows typing in confirm password field", async () => {
            const user = userEvent.setup();
            render(<SignupForm />);

            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            await user.type(confirmPasswordInput, "password123");

            expect(confirmPasswordInput).toHaveValue("password123");
        });
    });

    describe("Form Validation", () => {
        test("shows error when passwords do not match", async () => {
            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "different" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
            });

            expect(mockSignup).not.toHaveBeenCalled();
        });

        test("does not show error when passwords match", async () => {
            mockSignup.mockResolvedValueOnce(undefined);
            mockLogin.mockResolvedValueOnce({ token: "fake-token" });

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockSignup).toHaveBeenCalled();
            });

            expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
        });
    });

    describe("Successful Signup", () => {
        test("calls signup API with correct data", async () => {
            mockSignup.mockResolvedValueOnce(undefined);
            mockLogin.mockResolvedValueOnce({ token: "fake-token" });

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockSignup).toHaveBeenCalledWith({
                    email: "test@example.com",
                    password: "password123",
                    firstName: "John",
                    lastName: "Doe",
                });
            });
        });

        test("shows success alert on successful signup", async () => {
            mockSignup.mockResolvedValueOnce(undefined);
            mockLogin.mockResolvedValueOnce({ token: "fake-token" });

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith("Account created successfully!");
            });
        });

        test("automatically logs in user after signup", async () => {
            mockSignup.mockResolvedValueOnce(undefined);
            mockLogin.mockResolvedValueOnce({ token: "fake-token" });

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith({
                    email: "test@example.com",
                    password: "password123",
                });
            });
        });

        test("stores token in localStorage after signup and login", async () => {
            mockSignup.mockResolvedValueOnce(undefined);
            mockLogin.mockResolvedValueOnce({ token: "fake-jwt-token" });

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(localStorage.setItem).toHaveBeenCalledWith("token", "fake-jwt-token");
            });
        });

        test("navigates to home page after successful signup and login", async () => {
            mockSignup.mockResolvedValueOnce(undefined);
            mockLogin.mockResolvedValueOnce({ token: "fake-token" });

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/app/home');
            });
        });
    });

    describe("Failed Signup", () => {
        test("shows error message when signup fails", async () => {
            mockSignup.mockRejectedValueOnce({
                response: { data: { error: "Email already exists" } },
            });

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText("Email already exists")).toBeInTheDocument();
            });
        });

        test("shows generic error when signup fails without specific message", async () => {
            mockSignup.mockRejectedValueOnce(new Error("Network error"));

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            // <-- Put it here -->
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/network error/i)).toBeInTheDocument();
            });
        });

        test("shows error when auto-login fails after successful signup", async () => {
            mockSignup.mockResolvedValueOnce(undefined);
            mockLogin.mockRejectedValueOnce(new Error("Login failed"));

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
            });
        });
    });

    describe("Loading State", () => {
        test("shows loading text while submitting", async () => {
            mockSignup.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            expect(screen.getByRole("button", { name: /creating.../i })).toBeInTheDocument();
        });

        test("disables button while submitting", async () => {
            mockSignup.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            render(<SignupForm />);

            const firstNameInput = screen.getByLabelText("First Name");
            const lastNameInput = screen.getByLabelText("Last Name");
            const emailInput = screen.getByLabelText("Email");
            const passwordInput = screen.getByLabelText(/^Password$/);
            const confirmPasswordInput = screen.getByLabelText("Confirm Password");
            const submitButton = screen.getByRole("button", { name: /create account/i });

            fireEvent.change(firstNameInput, { target: { value: "John" } });
            fireEvent.change(lastNameInput, { target: { value: "Doe" } });
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            fireEvent.change(passwordInput, { target: { value: "password123" } });
            fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

            fireEvent.click(submitButton);

            const loadingButton = screen.getByRole("button", { name: /creating.../i });
            expect(loadingButton).toBeDisabled();
        });
    });

    describe("Navigation", () => {
        test("navigates to login page when sign in link is clicked", async () => {
            const user = userEvent.setup();
            render(<SignupForm />);

            const signInButton = screen.getByRole("button", { name: /sign in/i });
            await user.click(signInButton);

            expect(mockNavigate).toHaveBeenCalledWith("/");
        });
    });
});