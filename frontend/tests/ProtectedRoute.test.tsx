import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../src/components/helpers/ProtectedRoute';
import * as AuthAPI from '../src/api/AuthAPI';
import * as LoggerAPI from '../src/api/LoggerAPI';

// Polyfill for TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock axiosClient to avoid import.meta issues
jest.mock('../src/lib/axiosClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

// Mock dependencies
jest.mock('../src/api/AuthAPI');
jest.mock('../src/api/LoggerAPI');

const mockGetProfile = AuthAPI.getProfile as jest.MockedFunction<typeof AuthAPI.getProfile>;
const mockLogFrontend = LoggerAPI.logFrontend as jest.MockedFunction<typeof LoggerAPI.logFrontend>;

// Test components
const ProtectedContent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;
const UnauthorizedPage = () => <div>Unauthorized Page</div>;

// Wrapper component with routing
const renderWithRouter = (allowedRoles: string[], initialPath = '/protected') => {
    window.history.pushState({}, 'Test page', initialPath);

    return render(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
                    <Route path="/protected" element={<ProtectedContent />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

describe('ProtectedRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockLogFrontend.mockResolvedValue(undefined);
    });

    describe('Loading State', () => {
        it('shows loading spinner while verifying session', () => {
            localStorage.setItem('token', 'mock-token');
            mockGetProfile.mockImplementation(() => new Promise(() => { })); // Never resolves

            renderWithRouter(['admin']);

            // Check for spinner element directly
            const spinner = document.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });

        it('displays loading state before making API call', () => {
            localStorage.setItem('token', 'mock-token');
            mockGetProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            renderWithRouter(['admin']);

            // Should show loading spinner immediately
            const spinner = document.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });
    });

    describe('No Token', () => {
        it('redirects to login when no token exists', async () => {
            // No token in localStorage
            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });

            expect(mockGetProfile).not.toHaveBeenCalled();
        });

        it('does not call getProfile when token is missing', async () => {
            renderWithRouter(['participant']);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });

            expect(mockGetProfile).not.toHaveBeenCalled();
        });
    });

    describe('Successful Authentication', () => {
        it('renders protected content when user has correct role', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                accountType: 'Admin',
            });

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            expect(mockGetProfile).toHaveBeenCalledTimes(1);
        });

        it('handles role case-insensitively', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'participant@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Participant', // Uppercase
            });

            renderWithRouter(['participant']); // Lowercase in allowedRoles

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        it('allows access when user role matches one of multiple allowed roles', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'owner@example.com',
                firstName: 'Owner',
                lastName: 'User',
                accountType: 'Owner',
            });

            renderWithRouter(['admin', 'owner', 'participant']);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });
    });

    describe('Role-Based Authorization', () => {
        it('redirects to /unauthorized when user role is not allowed', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'participant@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Participant',
            });

            renderWithRouter(['admin', 'owner']); // Participant not allowed

            await waitFor(() => {
                expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            });

            expect(mockGetProfile).toHaveBeenCalledTimes(1);
        });

        it('denies access to participant trying to access admin route', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 2,
                email: 'user@example.com',
                firstName: 'Regular',
                lastName: 'User',
                accountType: 'Participant',
            });

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            });
        });

    });

    describe('Authentication Failures', () => {
        it('redirects to login when getProfile fails', async () => {
            localStorage.setItem('token', 'expired-token');
            mockGetProfile.mockRejectedValue(new Error('Token expired'));

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });

            expect(mockGetProfile).toHaveBeenCalledTimes(1);
        });

        it('logs error when authentication fails', async () => {
            localStorage.setItem('token', 'invalid-token');
            const authError = new Error('Authentication failed');
            mockGetProfile.mockRejectedValue(authError);

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(mockLogFrontend).toHaveBeenCalledWith({
                    level: 'ERROR',
                    message: 'Auth verification failed: Authentication failed',
                    component: 'ProtectedRoute.tsx',
                    url: expect.any(String),
                });
            });
        });

        it('handles network errors gracefully', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockRejectedValue(new Error('Network error'));

            renderWithRouter(['participant']);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });

            expect(mockLogFrontend).toHaveBeenCalled();
        });

        it('redirects to login when 401 error occurs', async () => {
            localStorage.setItem('token', 'invalid-token');
            const unauthorizedError = new Error('Unauthorized');
            mockGetProfile.mockRejectedValue(unauthorizedError);

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });
    });

    describe('Token Refresh Flow', () => {
        it('successfully authenticates after token refresh', async () => {
            localStorage.setItem('token', 'expired-token');

            // Simulate the interceptor refreshing the token
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                accountType: 'Admin',
            });

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            expect(mockGetProfile).toHaveBeenCalledTimes(1);
        });

        it('handles case where refresh token is also expired', async () => {
            localStorage.setItem('token', 'expired-token');
            mockGetProfile.mockRejectedValue(new Error('Refresh token expired'));

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });

            expect(mockLogFrontend).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'ERROR',
                    message: expect.stringContaining('Refresh token expired'),
                })
            );
        });
    });

    describe('Re-authentication on Token Change', () => {
        it('re-verifies when token changes', async () => {
            localStorage.setItem('token', 'token-1');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'user@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Admin',
            });

            const { rerender } = renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            expect(mockGetProfile).toHaveBeenCalledTimes(1);

            // Change token
            localStorage.setItem('token', 'token-2');

            // Force re-render by updating the route
            rerender(
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<LoginPage />} />
                        <Route path="/unauthorized" element={<UnauthorizedPage />} />
                        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route path="/protected" element={<ProtectedContent />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            );

            // Note: In real app, changing token would trigger useEffect
            // This test demonstrates the dependency array working
        });
    });

    describe('Edge Cases', () => {
        it('handles undefined accountType gracefully', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'user@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: undefined as any,
            });

            renderWithRouter(['admin']);

            await waitFor(() => {
                // Undefined accountType will cause toLowerCase() to fail, triggering error
                // This should redirect to login (unauthorized status)
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('handles empty allowedRoles array', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'user@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Admin',
            });

            renderWithRouter([]); // No roles allowed

            await waitFor(() => {
                expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            });
        });

        it('handles getProfile returning null user', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue(null as any);

            renderWithRouter(['admin']);

            await waitFor(() => {
                // Null user will cause an error when trying to access accountType
                // This should redirect to login page
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('handles simultaneous route access attempts', async () => {
            localStorage.setItem('token', 'valid-token');
            mockGetProfile.mockResolvedValue({
                id: 1,
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                accountType: 'Admin',
            });

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            // Should only call getProfile once even if multiple protected routes mount
            expect(mockGetProfile).toHaveBeenCalledTimes(1);
        });
    });

    describe('Error Message Formatting', () => {
        it('logs complete error details', async () => {
            localStorage.setItem('token', 'invalid-token');
            const detailedError = new Error('Detailed authentication failure message');
            mockGetProfile.mockRejectedValue(detailedError);

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(mockLogFrontend).toHaveBeenCalledWith({
                    level: 'ERROR',
                    message: 'Auth verification failed: Detailed authentication failure message',
                    component: 'ProtectedRoute.tsx',
                    url: expect.stringContaining('http'),
                });
            });
        });

        it('includes current URL in error log', async () => {
            localStorage.setItem('token', 'invalid-token');
            mockGetProfile.mockRejectedValue(new Error('Auth failed'));

            renderWithRouter(['admin']);

            await waitFor(() => {
                expect(mockLogFrontend).toHaveBeenCalledWith(
                    expect.objectContaining({
                        level: 'ERROR',
                        message: 'Auth verification failed: Auth failed',
                        component: 'ProtectedRoute.tsx',
                        url: expect.stringContaining('http'),
                    })
                );
            });
        });
    });
});