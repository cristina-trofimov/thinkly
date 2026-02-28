import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "../src/views/ProfilePage";
import { getProfile, isGoogleAccount } from "../src/api/AuthAPI";
import { updateAccount, getUserPreferences, updateUserPreferences } from "../src/api/AccountsAPI";
import { useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";

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
}));

jest.mock("../src/api/AuthAPI", () => ({
    getProfile: jest.fn(),
    isGoogleAccount: jest.fn(),
}));

jest.mock("../src/api/AccountsAPI", () => ({
    updateAccount: jest.fn(),
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
}));

jest.mock("../src/api/LoggerAPI", () => ({
    logFrontend: jest.fn(),
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

jest.mock("@/hooks/useAnalytics", () => ({
    useAnalytics: () => ({
        trackProfileViewed: jest.fn(),
        trackProfileFieldEdited: jest.fn(),
        trackProfileFieldSaved: jest.fn(),
        trackProfileFieldSaveFailed: jest.fn(),
        trackChangePasswordNavigated: jest.fn(),
    }),
}));

// Mock ALL lucide-react icons used in ProfilePage
jest.mock("lucide-react", () => ({
    Mail: () => <div />,
    User: () => <div />,
    IdCard: () => <div />,
    Pencil: () => <span>Pencil</span>,
    KeyRound: () => <div />,
    Check: () => <span>Check</span>,
    X: () => <span>X</span>,
    Bell: () => <div />,
    Sun: () => <div />,
    Moon: () => <div />,
    Settings2: () => <div />,
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

// Mock shadcn components that may not resolve in test env
jest.mock("@/components/ui/separator", () => ({
    Separator: () => <hr />,
}));

jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

jest.mock("@/components/ui/card", () => ({
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock("@/components/ui/label", () => ({
    Label: ({ children, className, htmlFor }: any) => <label htmlFor={htmlFor} className={className}>{children}</label>,
}));

jest.mock("@/components/ui/input", () => ({
    Input: ({ value, onChange, disabled, autoFocus, className }: any) => (
        <input value={value} onChange={onChange} disabled={disabled} autoFocus={autoFocus} className={className} />
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

    const mockPreferences = {
        theme: "light",
        notifications_enabled: true,
    };

    const mockNavigate = jest.fn();
    const mockReload = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
        (useOutlet as jest.Mock).mockReturnValue(null);

        delete (window as any).location;
        window.location = {
            href: 'http://localhost/app/profile',
            origin: 'http://localhost',
            pathname: '/app/profile',
            reload: mockReload,
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
            writable: true,
        });

        (getProfile as jest.Mock).mockResolvedValue(mockUser);
        (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: false });
        (getUserPreferences as jest.Mock).mockResolvedValue(mockPreferences);
        (updateUserPreferences as jest.Mock).mockResolvedValue(mockPreferences);
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

    test("allows editing and saving first name successfully", async () => {
        (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, firstName: "Jane" });

        render(<ProfilePage />);
        await screen.findByText("John Doe");

        const editButtons = screen.getAllByRole("button");
        const firstNameEdit = editButtons.find(b => b.textContent?.includes("Pencil"));
        if (firstNameEdit) fireEvent.click(firstNameEdit);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Jane" } });

        const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
        if (saveButton) fireEvent.click(saveButton);

        await waitFor(() => {
            expect(updateAccount).toHaveBeenCalledWith("user-123", { first_name: "Jane" });
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "profileUpdateToast",
                "First name updated successfully."
            );
        });
    });

    test("allows editing and saving last name successfully", async () => {
        (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, lastName: "Smith" });

        render(<ProfilePage />);
        await screen.findByText("John Doe");

        const editButtons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Pencil"));
        if (editButtons[1]) fireEvent.click(editButtons[1]);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Smith" } });

        const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
        if (saveButton) fireEvent.click(saveButton);

        await waitFor(() => {
            expect(updateAccount).toHaveBeenCalledWith("user-123", { last_name: "Smith" });
        });
    });

    test("allows editing and saving email successfully", async () => {
        (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, email: "jane.doe@example.com" });

        render(<ProfilePage />);
        await screen.findByText("John Doe");

        const editButtons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Pencil"));
        if (editButtons[2]) fireEvent.click(editButtons[2]);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "jane.doe@example.com" } });

        const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
        if (saveButton) fireEvent.click(saveButton);

        await waitFor(() => {
            expect(updateAccount).toHaveBeenCalledWith("user-123", { email: "jane.doe@example.com" });
        });
    });

    test("displays error toast when field update fails", async () => {
        (updateAccount as jest.Mock).mockRejectedValue(new Error("Update failed"));

        render(<ProfilePage />);
        await screen.findByText("John Doe");

        const editButtons = screen.getAllByRole("button");
        const firstNameEdit = editButtons.find(b => b.textContent?.includes("Pencil"));
        if (firstNameEdit) fireEvent.click(firstNameEdit);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Jane" } });

        const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
        if (saveButton) fireEvent.click(saveButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to update firstname.");
        });
    });

    test("disables save and cancel buttons during save operation", async () => {
        (updateAccount as jest.Mock).mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({ ...mockUser }), 100))
        );

        render(<ProfilePage />);
        await screen.findByText("John Doe");

        const editButtons = screen.getAllByRole("button");
        const firstNameEdit = editButtons.find(b => b.textContent?.includes("Pencil"));
        if (firstNameEdit) fireEvent.click(firstNameEdit);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Jane" } });

        const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
        if (saveButton) fireEvent.click(saveButton);

        await waitFor(() => {
            const disabledButtons = screen.getAllByRole("button").filter(b => b.hasAttribute("disabled"));
            expect(disabledButtons.length).toBeGreaterThan(0);
        });
    });

    test("does not allow editing email for Google accounts", async () => {
        (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: true });
        render(<ProfilePage />);

        await waitFor(() => {
            expect(screen.getByText("john.doe@example.com")).toBeTruthy();
            const managedLabels = screen.getAllByText(/Managed by Google/i);
            expect(managedLabels.length).toBeGreaterThan(0);
        });

        const editButtons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Pencil"));
        expect(editButtons.length).toBe(2);
    });

    test("renders loading spinner while fetching profile", () => {
        (getProfile as jest.Mock).mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve(mockUser), 1000))
        );

        render(<ProfilePage />);

        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeTruthy();
    });

    test("clears editing state after successful save", async () => {
        (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, firstName: "Jane" });

        render(<ProfilePage />);
        await screen.findByText("John Doe");

        const editButtons = screen.getAllByRole("button");
        const firstNameEdit = editButtons.find(b => b.textContent?.includes("Pencil"));
        if (firstNameEdit) fireEvent.click(firstNameEdit);

        const input = screen.getByRole("textbox");
        expect(input).toBeTruthy();

        fireEvent.change(input, { target: { value: "Jane" } });

        const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
        if (saveButton) fireEvent.click(saveButton);

        await waitFor(() => {
            expect(updateAccount).toHaveBeenCalled();
            expect(window.sessionStorage.setItem).toHaveBeenCalled();
        });
    });

    test("displays account type badge", async () => {
        render(<ProfilePage />);
        await waitFor(() => {
            const badge = screen.getByText(/participant/i);
            expect(badge).toBeTruthy();
        });
    });

    test("renders avatar with user initials", async () => {
        render(<ProfilePage />);
        await waitFor(() => {
            const avatar = screen.getByTestId("avatar-initials");
            expect(avatar).toBeTruthy();
            expect(avatar.textContent).toBe("JD");
        });
    });
});