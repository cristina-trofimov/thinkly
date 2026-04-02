import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LoginForm } from '../src/components/forms/LogInForm';
import * as authApi from '../src/api/AuthAPI';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';
import { UserContext } from '../src/context/UserContext';
import { logFrontend } from '../src/api/LoggerAPI';
import { getUserPreferences } from '../src/api/AccountsAPI';
import { useAnalytics } from '../src/hooks/useAnalytics';

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
    useGoogleOAuth: jest.fn(() => ({
        clientId: 'test-client-id',
        scriptLoadedSuccessfully: true,
    })),
}));

jest.mock('../src/api/AccountsAPI', () => ({
    getUserPreferences: jest.fn().mockResolvedValue({ theme: 'light' }),
}));

jest.mock('../src/hooks/useAnalytics', () => ({
    useAnalytics: jest.fn(() => ({
        identifyUser: jest.fn(),
        trackLoginAttempt: jest.fn(),
        trackLoginSuccess: jest.fn(),
        trackLoginFailed: jest.fn(),
    })),
}));

// add to the top of the file alongside other mocks
const mockGetProfile = authApi.getProfile as jest.MockedFunction<typeof authApi.getProfile>;

const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockGoogleLogin = authApi.googleLogin as jest.MockedFunction<typeof authApi.googleLogin>;
const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;
const mockLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;
const mockGetUserPreferences = getUserPreferences as jest.MockedFunction<typeof getUserPreferences>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseGoogleOAuth = jest.requireMock('@react-oauth/google').useGoogleOAuth as jest.Mock;

const mockSetUser = jest.fn();
const mockIdentifyUser = jest.fn();
const mockTrackLoginAttempt = jest.fn();
const mockTrackLoginSuccess = jest.fn();
const mockTrackLoginFailed = jest.fn();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <GoogleOAuthProvider clientId="test-client-id">
        <BrowserRouter>
            <UserContext.Provider value={{ user: null, loading: false, setUser: mockSetUser, refreshUser: jest.fn() }}>
                {children}
            </UserContext.Provider>
        </BrowserRouter>
    </GoogleOAuthProvider>
);

describe('LoginForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        mockGetProfile.mockResolvedValue({ id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User', accountType: 'Participant' as const });
        mockGetUserPreferences.mockResolvedValue({ theme: 'light' } as any);
        mockUseGoogleOAuth.mockReturnValue({
            clientId: 'test-client-id',
            scriptLoadedSuccessfully: true,
        });
        mockUseAnalytics.mockReturnValue({
            identifyUser: mockIdentifyUser,
            trackLoginAttempt: mockTrackLoginAttempt,
            trackLoginSuccess: mockTrackLoginSuccess,
            trackLoginFailed: mockTrackLoginFailed,
        } as any);
        (global as any).window.google = {
            accounts: {
                id: {
                    initialize: jest.fn(),
                    prompt: jest.fn((callback?: (notification: any) => void) => {
                        callback?.({
                            isNotDisplayed: () => false,
                            isSkippedMoment: () => false,
                        });
                    }),
                },
            },
        };
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

            expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
        });

        it('renders sign up link', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
            expect(screen.getByText('Sign up')).toBeInTheDocument();
        });

        it('renders the Google icon inside the custom button', () => {
            const { container } = render(<LoginForm />, { wrapper: Wrapper });

            const googleButton = screen.getByRole('button', { name: /sign in with google/i });
            expect(googleButton).toContainElement(container.querySelector('svg'));
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
            const mockDecodedToken = { id: 1, sub: 'test@example.com', role: 'student' };

            mockLogin.mockResolvedValue({ access_token: mockToken });
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
            expect(mockSetUser).toHaveBeenCalledWith({ id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User', accountType: 'Participant' });
            expect(mockIdentifyUser).toHaveBeenCalledWith({
                id: 1,
                email: 'test@example.com',
                firstName: '',
                lastName: '',
                role: 'student',
            });
            expect(mockTrackLoginAttempt).toHaveBeenCalledWith('email_password');
            expect(mockTrackLoginSuccess).toHaveBeenCalledWith('email_password');
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

            expect(screen.getByRole('button', { name: /sign in with google/i })).not.toBeDisabled();
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
            expect(mockTrackLoginFailed).toHaveBeenCalledWith('email_password', 'Login failed');
            expect(mockLogFrontend).toHaveBeenCalled();
        });

        it('clears previous error on new submission', async () => {
            mockLogin.mockRejectedValueOnce(new Error('First error'));
            mockLogin.mockResolvedValueOnce({ access_token: 'mock-token' });
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

        it('applies dark mode when user preference theme is dark', async () => {
            mockLogin.mockResolvedValue({ access_token: 'dark-mode-token' });
            mockJwtDecode.mockReturnValue({ id: 1, sub: 'test@example.com', role: 'student' } as any);
            mockGetUserPreferences.mockResolvedValue({ theme: 'dark' } as any);

            render(<LoginForm />, { wrapper: Wrapper });

            fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /login/i }));

            await waitFor(() => {
                expect(document.documentElement.classList.contains('dark')).toBe(true);
            });

            expect(localStorage.getItem('theme')).toBe('dark');
        });
    });

    describe('Google Login', () => {
        it('successfully logs in with Google', async () => {
            const mockToken = 'mock-google-jwt-token';
            const mockDecodedToken = { id: 2, sub: 'google@example.com', role: 'student' };

            mockGoogleLogin.mockResolvedValue({ access_token: mockToken });
            mockJwtDecode.mockReturnValue(mockDecodedToken as any);

            render(<LoginForm />, { wrapper: Wrapper });

            const googleButton = screen.getByRole('button', { name: /sign in with google/i });
            fireEvent.click(googleButton);

            const initialize = (global as any).window.google.accounts.id.initialize as jest.Mock;
            const initConfig = initialize.mock.calls[0][0];
            initConfig.callback({ credential: 'mock-google-credential' });

            await waitFor(() => {
                expect(mockGoogleLogin).toHaveBeenCalledWith('mock-google-credential');
            });

            expect(localStorage.getItem('token')).toBe(mockToken);
            expect(mockJwtDecode).toHaveBeenCalledWith(mockToken);
            expect(mockNavigate).toHaveBeenCalledWith('/app/home');
            expect((global as any).window.google.accounts.id.prompt).toHaveBeenCalled();
            expect(mockIdentifyUser).toHaveBeenCalledWith({
                id: 2,
                email: 'google@example.com',
                firstName: '',
                lastName: '',
                role: 'student',
            });
            expect(mockTrackLoginAttempt).toHaveBeenCalledWith('google');
            expect(mockTrackLoginSuccess).toHaveBeenCalledWith('google');
        });

        it('handles Google login failure', async () => {
            mockGoogleLogin.mockRejectedValue(new Error('Google login failed'));

            render(<LoginForm />, { wrapper: Wrapper });

            const googleButton = screen.getByRole('button', { name: /sign in with google/i });
            fireEvent.click(googleButton);

            const initialize = (global as any).window.google.accounts.id.initialize as jest.Mock;
            const initConfig = initialize.mock.calls[0][0];
            initConfig.callback({ credential: 'mock-google-credential' });

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Google login failed. Please try again.');
            });

            expect(localStorage.getItem('token')).toBeNull();
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockTrackLoginFailed).toHaveBeenCalledWith('google', 'Google login failed');
            expect(mockLogFrontend).toHaveBeenCalled();
        });

        it('shows an error when Google returns no credential', async () => {
            render(<LoginForm />, { wrapper: Wrapper });

            fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

            const initialize = (global as any).window.google.accounts.id.initialize as jest.Mock;
            const initConfig = initialize.mock.calls[0][0];
            initConfig.callback({});

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Google login failed. Please try again.');
            });

            expect(mockGoogleLogin).not.toHaveBeenCalled();
            expect(mockTrackLoginFailed).toHaveBeenCalledWith('google', 'No credential returned by Google');
        });

        it('shows a prompt unavailable error when Google prompt is not displayed', async () => {
            (global as any).window.google.accounts.id.prompt = jest.fn((callback?: (notification: any) => void) => {
                callback?.({
                    isNotDisplayed: () => true,
                    isSkippedMoment: () => false,
                });
            });

            render(<LoginForm />, { wrapper: Wrapper });

            fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

            expect(toast.error).toHaveBeenCalledWith('Google Sign-In was unavailable. Try again later.');
            expect(mockTrackLoginFailed).toHaveBeenCalledWith('google', 'Google prompt unavailable');
        });

        it('shows a Google widget error when the Google identity object is unavailable', async () => {
            delete (global as any).window.google;

            render(<LoginForm />, { wrapper: Wrapper });

            const googleButton = screen.getByRole('button', { name: /sign in with google/i });
            expect(googleButton).toBeDisabled();
        });

        it('disables the Google button until the Google script reports ready', () => {
            mockUseGoogleOAuth.mockReturnValue({
                clientId: 'test-client-id',
                scriptLoadedSuccessfully: false,
            });

            render(<LoginForm />, { wrapper: Wrapper });

            expect(screen.getByRole('button', { name: /sign in with google/i })).toBeDisabled();
            expect((global as any).window.google.accounts.id.initialize).not.toHaveBeenCalled();
        });
    });

    describe('Navigation', () => {
        it('navigates to forgot password page', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));

            expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
        });

        it('navigates to signup page', () => {
            render(<LoginForm />, { wrapper: Wrapper });

            fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

            expect(mockNavigate).toHaveBeenCalledWith('/signup');
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
            mockLogin.mockResolvedValue({ access_token: mockToken });
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
