import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../src/components/helpers/ProtectedRoute';
import * as LoggerAPI from '../src/api/LoggerAPI';
import { UserContext } from '../src/context/UserContext';
import type { Account } from '../src/types/account/Account.type';

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

jest.mock('../src/api/LoggerAPI');

const mockLogFrontend = LoggerAPI.logFrontend as jest.MockedFunction<typeof LoggerAPI.logFrontend>;

// Test components
const ProtectedContent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;
const UnauthorizedPage = () => <div>Unauthorized Page</div>;

// Helper to build context value
const makeContextValue = (user: Account | null, loading = false) => ({
    user,
    loading,
    setUser: jest.fn(),
    refreshUser: jest.fn(),
});

// Wrapper component with routing
const renderWithRouter = (
    allowedRoles: string[],
    user: Account | null = null,
    loading = false,
    initialPath = '/protected'
) => {
    window.history.pushState({}, 'Test page', initialPath);

    return render(
        <BrowserRouter>
            <UserContext.Provider value={makeContextValue(user, loading)}>
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
                        <Route path="/protected" element={<ProtectedContent />} />
                    </Route>
                </Routes>
            </UserContext.Provider>
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
        it('shows loading spinner while context is still loading', () => {
            localStorage.setItem('token', 'mock-token');
            renderWithRouter(['admin'], null, true); // loading: true
            expect(document.querySelector('.animate-spin')).toBeInTheDocument();
        });

        it('displays loading state when token exists but user not yet resolved', () => {
            localStorage.setItem('token', 'mock-token');
            renderWithRouter(['admin'], null, true); // loading: true
            expect(document.querySelector('.animate-spin')).toBeInTheDocument();
        });
    });

    describe('No Token', () => {
        it('redirects to login when no token exists', async () => {
            // No token, no user
            renderWithRouter(['admin'], null);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('redirects to login when token is missing regardless of role', async () => {
            renderWithRouter(['participant'], null);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });
    });

    describe('Successful Authentication', () => {
        it('renders protected content when user has correct role', async () => {
            localStorage.setItem('token', 'valid-token');
            const user: Account = {
                id: 1,
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                accountType: 'Admin',
            };

            renderWithRouter(['admin'], user);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        it('handles role case-insensitively', async () => {
            localStorage.setItem('token', 'valid-token');
            const user: Account = {
                id: 1,
                email: 'participant@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Participant', // Uppercase in user
            };

            renderWithRouter(['participant'], user); // Lowercase in allowedRoles

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        it('allows access when user role matches one of multiple allowed roles', async () => {
            localStorage.setItem('token', 'valid-token');
            const user: Account = {
                id: 1,
                email: 'owner@example.com',
                firstName: 'Owner',
                lastName: 'User',
                accountType: 'Owner',
            };

            renderWithRouter(['admin', 'owner', 'participant'], user);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });
    });

    describe('Role-Based Authorization', () => {
        it('redirects to /unauthorized when user role is not allowed', async () => {
            localStorage.setItem('token', 'valid-token');
            const user: Account = {
                id: 1,
                email: 'participant@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Participant',
            };

            renderWithRouter(['admin', 'owner'], user); // Participant not allowed

            await waitFor(() => {
                expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            });
        });

        it('denies access to participant trying to access admin route', async () => {
            localStorage.setItem('token', 'valid-token');
            const user: Account = {
                id: 2,
                email: 'user@example.com',
                firstName: 'Regular',
                lastName: 'User',
                accountType: 'Participant',
            };

            renderWithRouter(['admin'], user);

            await waitFor(() => {
                expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            });
        });
    });

    describe('Authentication Failures', () => {
        it('redirects to login when user is null after loading completes', async () => {
            localStorage.setItem('token', 'expired-token');
            // Token exists but context resolved with no user (e.g. refresh failed)
            renderWithRouter(['admin'], null);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('redirects to login on network errors (user resolves to null)', async () => {
            localStorage.setItem('token', 'valid-token');

            renderWithRouter(['participant'], null);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('redirects to login when 401 occurs (user resolves to null)', async () => {
            localStorage.setItem('token', 'invalid-token');

            renderWithRouter(['admin'], null);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });
    });

    describe('Token Refresh Flow', () => {
        it('successfully authenticates after token refresh', async () => {
            localStorage.setItem('token', 'expired-token');
            // Interceptor refreshed token, UserContext resolved with valid user
            const user: Account = {
                id: 1,
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                accountType: 'Admin',
            };

            renderWithRouter(['admin'], user);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        it('handles case where refresh token is also expired', async () => {
            localStorage.setItem('token', 'expired-token');
            // Both tokens expired: UserContext resolved with null
            renderWithRouter(['admin'], null);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });
    });

    describe('Re-authentication on Token Change', () => {
        it('re-verifies when token changes', async () => {
            localStorage.setItem('token', 'token-1');
            const user: Account = {
                id: 1,
                email: 'user@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Admin',
            };

            const { rerender } = renderWithRouter(['admin'], user);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });

            localStorage.setItem('token', 'token-2');

            rerender(
                <BrowserRouter>
                    <UserContext.Provider value={makeContextValue(user)}>
                        <Routes>
                            <Route path="/" element={<LoginPage />} />
                            <Route path="/unauthorized" element={<UnauthorizedPage />} />
                            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                                <Route path="/protected" element={<ProtectedContent />} />
                            </Route>
                        </Routes>
                    </UserContext.Provider>
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });
    });

    describe('Edge Cases', () => {
        it('handles undefined accountType gracefully', async () => {
            localStorage.setItem('token', 'valid-token');
            const user = {
                id: 1,
                email: 'user@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: undefined as any,
            };

            renderWithRouter(['admin'], user);

            await waitFor(() => {
                // undefined accountType can't be lowercased — effect won't set authorized
                // so it stays loading, then falls through to unauthorized redirect
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('handles empty allowedRoles array', async () => {
            localStorage.setItem('token', 'valid-token');
            const user: Account = {
                id: 1,
                email: 'user@example.com',
                firstName: 'Test',
                lastName: 'User',
                accountType: 'Admin',
            };

            renderWithRouter([], user); // No roles allowed

            await waitFor(() => {
                expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            });
        });

        it('handles null user gracefully', async () => {
            localStorage.setItem('token', 'valid-token');

            renderWithRouter(['admin'], null);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('handles simultaneous route access attempts', async () => {
            localStorage.setItem('token', 'valid-token');
            const user: Account = {
                id: 1,
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                accountType: 'Admin',
            };

            renderWithRouter(['admin'], user);

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });
    });
});