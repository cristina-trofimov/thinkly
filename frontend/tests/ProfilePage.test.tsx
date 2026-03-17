import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "../src/views/ProfilePage";
import { getProfile, isGoogleAccount } from "../src/api/AuthAPI";
import { updateAccount } from "../src/api/AccountsAPI";
import { getUserPrefs, updateAllPrefs } from "../src/api/UserPreferencesAPI";
import { useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";
import { logFrontend } from "../src/api/LoggerAPI";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../src/api/AuthAPI", () => ({
  getProfile: jest.fn(),
  isGoogleAccount: jest.fn(),
}));

jest.mock("../src/api/AccountsAPI", () => ({
  updateAccount: jest.fn(),
}));

jest.mock("../src/api/UserPreferencesAPI", () => ({
  getUserPrefs: jest.fn(),
  updateAllPrefs: jest.fn(),
}));

jest.mock("../src/api/LoggerAPI", () => ({ logFrontend: jest.fn() }));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  useOutlet: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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

jest.mock("lucide-react", () => ({
  Mail: () => <div />, User: () => <div />, IdCard: () => <div />,
  Pencil: () => <span>Pencil</span>, KeyRound: () => <div />,
  Check: () => <span>Check</span>, X: () => <span>X</span>,
  Bell: () => <div />, Sun: () => <div />, Moon: () => <div />,
  Settings2: () => <div />,
}));

jest.mock("@/components/helpers/AvatarInitials", () => ({
  AvatarInitials: ({ firstName, lastName }: any) => (
    <div data-testid="avatar-initials">{firstName?.[0]}{lastName?.[0]}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockUser = {
  id: "user-123",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  accountType: "participant",
};

const mockPreferences = {
  user_id: 21,
  theme: "light" as const,
  notifications_enabled: true,
  last_used_programming_language: 71,
};

describe("ProfilePage Component", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useOutlet as jest.Mock).mockReturnValue(null);
    localStorage.clear();
    sessionStorage.clear();

    (getProfile as jest.Mock).mockResolvedValue(mockUser);
    (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: false });
    (getUserPrefs as jest.Mock).mockResolvedValue(mockPreferences);
    (updateAllPrefs as jest.Mock).mockResolvedValue(mockPreferences);
  });

  // -------------------------------------------------------------------------
  // Profile display & load
  // -------------------------------------------------------------------------

  test("renders user profile information correctly after loading", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy();
      expect(screen.getByText("john.doe@example.com")).toBeTruthy();
    });
  });

  test("renders loading spinner while fetching profile", () => {
    (getProfile as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ProfilePage />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  test("displays error toast if profile fetching fails", async () => {
    (getProfile as jest.Mock).mockRejectedValue(new Error("API failure"));
    render(<ProfilePage />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile data.");
      expect(logFrontend).toHaveBeenCalled();
    });
  });

  test("shows success toast on mount if a pending update exists in sessionStorage", async () => {
    sessionStorage.setItem("profileUpdateToast", "Update successful!");
    render(<ProfilePage />);
    expect(toast.success).toHaveBeenCalledWith("Update successful!");
    expect(sessionStorage.getItem("profileUpdateToast")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Editing fields
  // -------------------------------------------------------------------------

  test("allows editing and saving first name successfully", async () => {
    (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, firstName: "Jane" });

    render(<ProfilePage />);
    await screen.findByText("John Doe");

    const editButtons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Pencil"));
    fireEvent.click(editButtons[0]); // First name

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Jane" } });
    fireEvent.click(screen.getByText("Check"));

    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalledWith("user-123", { first_name: "Jane" });
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully.");
      expect(screen.queryByRole("textbox")).toBeNull();
    });
  });

  test("displays error toast when field update fails", async () => {
    (updateAccount as jest.Mock).mockRejectedValue(new Error("Update failed"));

    render(<ProfilePage />);
    await screen.findByText("John Doe");

    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent?.includes("Pencil"))!);
    fireEvent.click(screen.getByText("Check"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update firstName.");
    });
  });

  // -------------------------------------------------------------------------
  // Google account restrictions
  // -------------------------------------------------------------------------

  test("restricts email and password changes for Google accounts", async () => {
    (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: true });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Managed by Google/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Change Password")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Theme switching (Auto-save)
  // -------------------------------------------------------------------------

  test("clicking Dark theme button triggers immediate auto-save and DOM update", async () => {
    render(<ProfilePage />);
    await screen.findByText("Dark");

    fireEvent.click(screen.getByText("Dark"));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(updateUserPreferences).toHaveBeenCalledWith("user-123", expect.objectContaining({ theme: "dark" }));
  });

  test("syncs theme when storage_sync event is dispatched", async () => {
    render(<ProfilePage />);
    await screen.findByText("John Doe");

    localStorage.setItem("theme", "dark");
    fireEvent(window, new Event("storage_sync"));

    // Check if the UI buttons would reflect the change (this depends on your CSS classes)
    await waitFor(() => {
        const darkBtn = screen.getByText("Dark").closest('button');
        expect(darkBtn).toHaveClass('bg-primary');
    });
  });

  // -------------------------------------------------------------------------
  // Notifications toggle (Auto-save)
  // -------------------------------------------------------------------------

  test("toggling notifications triggers auto-save", async () => {
    render(<ProfilePage />);
    const toggle = await screen.findByRole("switch");
    
    fireEvent.click(toggle);

    expect(updateUserPreferences).toHaveBeenCalledWith("user-123", expect.objectContaining({ 
        notifications_enabled: false 
    }));
  });

  test("logs error and shows toast when auto-save fails", async () => {
    (updateUserPreferences as jest.Mock).mockRejectedValue(new Error("Sync error"));
    render(<ProfilePage />);
    
    const darkBtn = await screen.findByText("Dark");
    fireEvent.click(darkBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to sync preferences.");
      expect(logFrontend).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining("Auto-save failed")
      }));
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  test("navigates to change password for non-Google accounts", async () => {
    render(<ProfilePage />);
    const btn = await screen.findByText("Change Password");
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith("changePassword");
  });

  test("renders sub-routes via outlet if present", () => {
    (useOutlet as jest.Mock).mockReturnValue(<div data-testid="outlet">Sub-route</div>);
    render(<ProfilePage />);
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });
});