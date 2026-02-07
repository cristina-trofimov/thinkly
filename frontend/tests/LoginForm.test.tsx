import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LoginForm } from '../src/components/forms/LogInForm';
import * as authApi from '../src/api/AuthAPI';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';

// Polyfill for TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock dependencies
jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
jest.mock('../src/api/AuthAPI');
jest.mock('../src/api/LoggerAPI', () => ({
    logFrontend: jest.fn(),
}));
jest.mock('jwt-decode');
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
}));

// Mock GoogleLogin component
jest.mock('@react-oauth/google', () => ({
    GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    GoogleLogin: ({ onSuccess, onError }: any) => (
        <button
            type="button"
            onClick={() => onSuccess({ credential: 'mock-google-credential' })}
            data-testid="google-login-button"
        >
            Sign in with Google
        </button>
    ),
}));

const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockGoogleLogin = authApi.googleLogin as jest.MockedFunction<typeof authApi.googleLogin>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;
const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;

// Wrapper component with required providers
const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <GoogleOAuthProvider clientId="test-client-id">
        <BrowserRouter>
            {children}
        </BrowserRouter>
    </GoogleOAuthProvider>
);

describe('LoginForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    describe('Rendering', () => {
        it('renders the login form with all fields', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            expect(screen.getByText('Login to your account')).toBeInTheDocument();
            expect(screen.getByLabelText('Email')).toBeInTheDocument();
            expect(screen.getByLabelText('Password')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
        });

        it('renders email and password inputs with correct types', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
            const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

            expect(emailInput.type).toBe('email');
            expect(passwordInput.type).toBe('password');
        });

        it('renders Google Login button', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
        });

        it('renders sign up link', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
            expect(screen.getByText('Sign up')).toBeInTheDocument();
        });
    });

    describe('Form Input Handling', () => {
        it('updates email field on change', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

            expect(emailInput.value).toBe('test@example.com');
        });

        it('updates password field on change', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
            fireEvent.change(passwordInput, { target: { value: 'password123' } });

            expect(passwordInput.value).toBe('password123');
        });

        it('clears both fields when reset', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
            const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });

            expect(emailInput.value).toBe('test@example.com');
            expect(passwordInput.value).toBe('password123');
        });
    });

    describe('Login Submission', () => {
        it('successfully logs in with valid credentials', async () => {
            const mockToken = 'mock-jwt-token';
            const mockDecodedToken = { sub: { role: 'student' } };

            mockLogin.mockResolvedValue({ token: mockToken });
            mockJwtDecode.mockReturnValue(mockDecodedToken as any);

            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: /Login/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'password123',
                });
            });

            expect(localStorage.getItem('token')).toBe(mockToken);
            expect(mockJwtDecode).toHaveBeenCalledWith(mockToken);
            expect(mockNavigate).toHaveBeenCalledWith('/app/home');
        });

        it('shows loading state during login', async () => {
            mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: /Login/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            expect(screen.getByText('Logging in...')).toBeInTheDocument();
            expect(submitButton).toBeDisabled();

            await waitFor(() => {
                expect(screen.queryByText('Logging in...')).not.toBeInTheDocument();
            });
        });

        it('displays error message on failed login', async () => {
            mockLogin.mockRejectedValue(new Error('Login failed'));

            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: /Login/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Invalid email or password.');
            });

            expect(localStorage.getItem('token')).toBeNull();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('clears previous error on new submission', async () => {
            mockLogin.mockRejectedValueOnce(new Error('First error'));
            mockLogin.mockResolvedValueOnce({ token: 'mock-token' });
            mockJwtDecode.mockReturnValue({ sub: { role: 'student' } } as any);

            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: /Login/i });

            // First submission - should fail
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrong' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Invalid email or password.');
            });

            // Clear the mock to verify it's not called with error on second attempt
            (toast.error as jest.Mock).mockClear();

            // Second submission - should succeed
            fireEvent.change(passwordInput, { target: { value: 'correct' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/app/home');
            });

            // Verify error toast was not called on successful login
            expect(toast.error).not.toHaveBeenCalled();
        });
    });

    describe('Google Login', () => {
        it('successfully logs in with Google', async () => {
            const mockToken = 'mock-google-jwt-token';
            const mockDecodedToken = { sub: { role: 'student' } };

            mockGoogleLogin.mockResolvedValue({ token: mockToken });
            mockJwtDecode.mockReturnValue(mockDecodedToken as any);

            render(<LoginForm />, { wrapper: Wrapper });

            const googleButton = screen.getByTestId('google-login-button');
            fireEvent.click(googleButton);

            await waitFor(() => {
                expect(mockGoogleLogin).toHaveBeenCalledWith('mock-google-credential');
            });

            expect(localStorage.getItem('token')).toBe(mockToken);
            expect(mockJwtDecode).toHaveBeenCalledWith(mockToken);
            expect(mockNavigate).toHaveBeenCalledWith('/app/home');
        });

        it('handles Google login failure', async () => {
            mockGoogleLogin.mockRejectedValue(new Error('Google login failed'));

            render(<LoginForm />, { wrapper: Wrapper });

            const googleButton = screen.getByTestId('google-login-button');
            fireEvent.click(googleButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Google login failed: Google login failed');
            });

            expect(localStorage.getItem('token')).toBeNull();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Form Validation', () => {
        it('requires email field', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
            expect(emailInput.required).toBe(true);
        });

        it('requires password field', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
            expect(passwordInput.required).toBe(true);
        });

        it('has autocomplete disabled', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
            const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

            expect(emailInput.autocomplete).toBe('off');
            expect(passwordInput.autocomplete).toBe('off');
        });
    });

    describe('LocalStorage', () => {
        it('stores token in localStorage on successful login', async () => {
            const mockToken = 'test-token-12345';
            mockLogin.mockResolvedValue({ token: mockToken });
            mockJwtDecode.mockReturnValue({ sub: { role: 'student' } } as any);

            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: /Login/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(localStorage.getItem('token')).toBe(mockToken);
            });
        });

        it('does not store token on failed login', async () => {
            mockLogin.mockRejectedValue(new Error('Login failed'));

            render(<LoginForm />, { wrapper: Wrapper });

            const emailInput = screen.getByLabelText('Email');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: /Login/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrong' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Invalid email or password.');
            });

            expect(localStorage.getItem('token')).toBeNull();
        });
    });
});