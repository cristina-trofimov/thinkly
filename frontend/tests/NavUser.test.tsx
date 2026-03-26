import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavUser } from '../src/components/layout/NavUser'
import { logout } from '../src/api/AuthAPI'
import { getUserPreferences, updateUserPreferences } from '../src/api/AccountsAPI'
import { logFrontend } from '../src/api/LoggerAPI'
import { useNavigate } from 'react-router-dom'
import { Account } from '../src/types/account/Account.type'
import { UserContext } from '../src/context/UserContext'

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../src/api/AuthAPI', () => ({
    logout: jest.fn(),
    getProfile: jest.fn(),
}))

jest.mock('../src/api/AccountsAPI', () => ({
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
}))

jest.mock('../src/api/LoggerAPI', () => ({
    logFrontend: jest.fn(),
}))

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}))

jest.mock('../src/components/helpers/AvatarInitials', () => ({
    AvatarInitials: ({ firstName, lastName }: any) => (
        <div data-testid="avatar">{firstName[0]}{lastName[0]}</div>
    ),
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const mockUser: Account = {
    id: 1,
    firstName: 'Julia',
    lastName: 'Doe',
    email: 'julia@test.com',
    accountType: 'Participant',
}

const mockNavigate = jest.fn()
const mockedLogout = logout as jest.Mock
const mockedGetUserPreferences = getUserPreferences as jest.Mock
const mockedUpdateUserPreferences = updateUserPreferences as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderNavUser = (userOverride?: Account | null) =>
    render(
        <UserContext.Provider value={{
            user: userOverride !== undefined ? userOverride : mockUser,
            loading: false,
            setUser: jest.fn(),
            refreshUser: jest.fn() as () => Promise<void>,
        }}>
            <NavUser />
        </UserContext.Provider>
    )

// Opens the main dropdown
const openDropdown = async () => {
    await userEvent.click(screen.getByRole('button'))
}

// Opens the main dropdown then hovers Theme to reveal the submenu
const openThemeSubmenu = async () => {
    await openDropdown()
    await userEvent.hover(screen.getByText('Theme'))
    await waitFor(() => screen.getByText('Dark'))
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks()
        ; (useNavigate as jest.Mock).mockReturnValue(mockNavigate)
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockedGetUserPreferences.mockResolvedValue({ theme: 'light', notifications_enabled: true })
    mockedUpdateUserPreferences.mockResolvedValue({})
    mockedLogout.mockResolvedValue(undefined)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NavUser — rendering', () => {
    it('renders user name when user prop is provided', () => {
        renderNavUser()
        expect(screen.getByText('Julia Doe')).toBeInTheDocument()
    })

    it('renders avatar with initials', () => {
        renderNavUser()
        expect(screen.getAllByTestId('avatar').length).toBeGreaterThan(0)
    })

    it('renders with no user (null)', async () => {
        renderNavUser(null)
        // no user, nothing to fetch — just renders without crashing
        expect(screen.queryByText('Julia Doe')).not.toBeInTheDocument()
    })

    it('renders user email in dropdown after opening', async () => {
        renderNavUser()
        await openDropdown()
        expect(screen.getByText('julia@test.com')).toBeInTheDocument()
    })

    it('renders Profile and Log out menu items after opening', async () => {
        renderNavUser()
        await openDropdown()
        expect(screen.getByText('Profile')).toBeInTheDocument()
        expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('renders Theme submenu trigger after opening', async () => {
        renderNavUser()
        await openDropdown()
        expect(screen.getByText('Theme')).toBeInTheDocument()
    })
})

describe('NavUser — profile fetch', () => {
    it('syncs dark theme from DB preferences on mount', async () => {
        mockedGetUserPreferences.mockResolvedValue({ theme: 'dark', notifications_enabled: true })
        renderNavUser()
        await waitFor(() =>
            expect(document.documentElement.classList.contains('dark')).toBe(true)
        )
        expect(localStorage.getItem('theme')).toBe('dark')
    })

    it('does not apply theme if prefs.theme is falsy', async () => {
        mockedGetUserPreferences.mockResolvedValue({ theme: null, notifications_enabled: true })
        renderNavUser()
        await waitFor(() => expect(mockedGetUserPreferences).toHaveBeenCalled())
        expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('logs error when getUserPreferences fails', async () => {
        mockedGetUserPreferences.mockRejectedValueOnce(new Error('auth failure'))
        renderNavUser()
        await waitFor(() =>
            expect(logFrontend).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'ERROR', component: 'NavUser' })
            )
        )
    })
})

describe('NavUser — theme switching', () => {
    it('shows Light and Dark options in theme submenu', async () => {
        renderNavUser()
        await openThemeSubmenu()
        expect(screen.getByText('Light')).toBeInTheDocument()
        expect(screen.getByText('Dark')).toBeInTheDocument()
    })

    it('applies dark class when dark theme selected', async () => {
        renderNavUser()
        await openThemeSubmenu()
        await userEvent.click(screen.getByText('Dark'))
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(localStorage.getItem('theme')).toBe('dark')
    })

    it('removes dark class when light theme selected', async () => {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
        renderNavUser()
        await openThemeSubmenu()
        await userEvent.click(screen.getByText('Light'))
        expect(document.documentElement.classList.contains('dark')).toBe(false)
        expect(localStorage.getItem('theme')).toBe('light')
    })

    it('calls updateUserPreferences when theme changes', async () => {
        renderNavUser()
        await openThemeSubmenu()
        await userEvent.click(screen.getByText('Dark'))
        await waitFor(() =>
            expect(mockedUpdateUserPreferences).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({ theme: 'dark' })
            )
        )
    })

    it('does not call updateUserPreferences when user has no id', async () => {
        renderNavUser({ ...mockUser, id: undefined as any })
        await openThemeSubmenu()
        await userEvent.click(screen.getByText('Dark'))
        await new Promise(r => setTimeout(r, 50))
        expect(mockedUpdateUserPreferences).not.toHaveBeenCalled()
    })

    it('logs error when updateUserPreferences fails', async () => {
        mockedUpdateUserPreferences.mockRejectedValueOnce(new Error('pref error'))
        renderNavUser()
        await openThemeSubmenu()
        await userEvent.click(screen.getByText('Dark'))
        await waitFor(() =>
            expect(logFrontend).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'ERROR', component: 'NavUser' })
            )
        )
    })

    it('dispatches storage_sync event when theme changes', async () => {
        const listener = jest.fn()
        window.addEventListener('storage_sync', listener)
        renderNavUser()
        await openThemeSubmenu()
        await userEvent.click(screen.getByText('Dark'))
        expect(listener).toHaveBeenCalled()
        window.removeEventListener('storage_sync', listener)
    })

    it('syncs theme when storage event fires', async () => {
        renderNavUser()
        act(() => {
            localStorage.setItem('theme', 'dark')
            window.dispatchEvent(new Event('storage'))
        })
        await waitFor(() =>
            expect(document.documentElement.classList.contains('dark')).toBe(true)
        )
    })

    it('syncs theme when storage_sync event fires', async () => {
        renderNavUser()
        act(() => {
            localStorage.setItem('theme', 'dark')
            window.dispatchEvent(new Event('storage_sync'))
        })
        await waitFor(() =>
            expect(document.documentElement.classList.contains('dark')).toBe(true)
        )
    })
})

describe('NavUser — logout', () => {
    it('calls logout and navigates to / on log out click', async () => {
        renderNavUser()
        await openDropdown()
        await userEvent.click(screen.getByText('Log out'))
        await waitFor(() => expect(mockedLogout).toHaveBeenCalledTimes(1))
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('removes theme from localStorage on logout', async () => {
        localStorage.setItem('theme', 'dark')
        renderNavUser()
        await openDropdown()
        await userEvent.click(screen.getByText('Log out'))
        await waitFor(() => expect(mockedLogout).toHaveBeenCalled())
        expect(localStorage.getItem('theme')).toBeNull()
    })

    it('removes dark class from documentElement on logout', async () => {
        document.documentElement.classList.add('dark')
        renderNavUser()
        await openDropdown()
        await userEvent.click(screen.getByText('Log out'))
        await waitFor(() => expect(mockedLogout).toHaveBeenCalled())
        expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('logs error when logout fails', async () => {
        mockedLogout.mockRejectedValueOnce(new Error('logout error'))
        renderNavUser()
        await openDropdown()
        await userEvent.click(screen.getByText('Log out'))
        await waitFor(() =>
            expect(logFrontend).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'ERROR', component: 'NavUser' })
            )
        )
    })

    it('does not navigate when logout throws', async () => {
        mockedLogout.mockRejectedValueOnce(new Error('logout error'))
        renderNavUser()
        await openDropdown()
        await userEvent.click(screen.getByText('Log out'))
        await waitFor(() => expect(logFrontend).toHaveBeenCalled())
        expect(mockNavigate).not.toHaveBeenCalled()
    })
})

describe('NavUser — profile navigation', () => {
    it('navigates to /app/profile when Profile is clicked', async () => {
        renderNavUser()
        await openDropdown()
        await userEvent.click(screen.getByText('Profile'))
        expect(mockNavigate).toHaveBeenCalledWith('/app/profile')
    })
})