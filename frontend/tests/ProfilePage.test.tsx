import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "../src/views/ProfilePage";
import { getProfile, isGoogleAccount } from "../src/api/AuthAPI";
import { updateAccount } from "../src/api/AccountsAPI";
import { useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";

/**
 * NOTE: The compilation errors in the preview window (Could not resolve) 
 * are due to the environment not having access to your local project files 
 * or specific node_modules. This code is designed to run in your local 
 * Jest/Vitest environment where those paths exist.
 */

// --- Mocks ---
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
jest.mock("../src/api/AuthAPI", () => ({
    getProfile: jest.fn(),
    isGoogleAccount: jest.fn(),
}));

jest.mock("../src/api/AccountsAPI", () => ({
    updateAccount: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: jest.fn(),
    useOutlet: jest.fn(),
}));

jest.mock("sonner", () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock("lucide-react", () => ({
    IdCardLanyard: () => <div />,
    Mail: () => <div />,
    User: () => <div />,
    IdCard: () => <div />,
    Pencil: () => <span>Pencil</span>,
    KeyRound: () => <div />,
    Check: () => <span>Check</span>,
    X: () => <span>X</span>,
}));

jest.mock("@/components/helpers/AvatarInitials", () => ({
    AvatarInitials: ({ firstName, lastName }: { firstName: string; lastName: string }) => (
        <div data-testid="avatar-initials">{firstName?.[0]}{lastName?.[0]}</div>
    ),
}));

jest.mock("@/components/ui/button", () => ({
    Button: ({ children, onClick, disabled, variant, size, className }: any) => (
        <button 
            onClick={onClick} 
            disabled={disabled} 
            data-variant={variant} 
            data-size={size}
            className={className}
        >
            {children}
        </button>
    ),
}));

describe("ProfilePage Component", () => {
    const mockUser = {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        accountType: "participant",
    };

    const mockNavigate = jest.fn();
    const mockReload = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
        (useOutlet as jest.Mock).mockReturnValue(null);
        
        // FIX: Safely mock window.location to avoid JSDOM branding errors
        // We delete the property and redefine it as a plain object to ensure mockReload is tracked
        delete (window as any).location;
        window.location = { 
            reload: mockReload,
            href: 'http://localhost/app/profile',
            origin: 'http://localhost',
            pathname: '/app/profile',
            assign: jest.fn(),
            replace: jest.fn(),
            toString: () => 'http://localhost/app/profile'
        } as any;

        const sessionStorageMock = (() => {
            let store: Record<string, string> = {};
            return {
                getItem: jest.fn((key: string) => store[key] || null),
                setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
                removeItem: jest.fn((key: string) => { delete store[key]; }),
                clear: jest.fn(() => { store = {}; }),
            };
        })();
        Object.defineProperty(window, 'sessionStorage', { 
            value: sessionStorageMock, 
            configurable: true, 
            writable: true 
        });

        (getProfile as jest.Mock).mockResolvedValue(mockUser);
        (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: false });
    });

    test("renders user profile information correctly after loading", async () => {
        render(<ProfilePage />);
        await waitFor(() => {
            expect(screen.getByText("John Doe")).toBeTruthy();
            expect(screen.getByText("john.doe@example.com")).toBeTruthy();
        });
    });

    test("cancels editing when the X button is clicked", async () => {
        render(<ProfilePage />);
        await screen.findByText("John Doe");

        const editButtons = screen.getAllByRole("button");
        const firstNameEdit = editButtons.find(b => b.textContent?.includes("Pencil"));
        if (firstNameEdit) fireEvent.click(firstNameEdit);

        const cancelButton = screen.getAllByRole("button").find(b => b.textContent?.includes("X"));
        if (cancelButton) fireEvent.click(cancelButton);

        expect(screen.queryByRole("textbox")).toBeNull();
    });

    test("restricts email and password changes for Google accounts", async () => {
        (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: true });
        render(<ProfilePage />);

        await waitFor(() => {
            // FIX: Use getAllByText because "Managed by Google" appears in both Email and Password fields
            const managedLabels = screen.getAllByText(/Managed by Google/i);
            expect(managedLabels.length).toBeGreaterThanOrEqual(1);
            expect(screen.queryByText("Change Password")).toBeNull();
        });
    });

    test("navigates to change password for non-Google accounts", async () => {
        render(<ProfilePage />);
        await screen.findByText("Change Password");
        fireEvent.click(screen.getByText("Change Password"));
        expect(mockNavigate).toHaveBeenCalledWith("changePassword");
    });

    test("shows success toast on mount if a pending update exists", async () => {
        (window.sessionStorage.getItem as jest.Mock).mockReturnValue("Last name updated successfully.");
        render(<ProfilePage />);
        expect(toast.success).toHaveBeenCalledWith("Last name updated successfully.");
    });

    test("renders sub-routes via outlet if present", () => {
        (useOutlet as jest.Mock).mockReturnValue(<div data-testid="outlet-content">Sub-route Content</div>);
        render(<ProfilePage />);
        expect(screen.getByTestId("outlet-content")).toBeTruthy();
    });

    test("displays error toast if profile fetching fails", async () => {
        (getProfile as jest.Mock).mockRejectedValue(new Error("API failure"));
        render(<ProfilePage />);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to load profile data.");
        });
    });
});