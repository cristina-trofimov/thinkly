import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "../src/views/ProfilePage";
import { isGoogleAccount } from "../src/api/AuthAPI";
import { updateAccount, updateUserPreferences } from "../src/api/AccountsAPI";
import { getUserPrefs, updateAllPrefs } from "../src/api/UserPreferencesAPI";
import { useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";
import { logFrontend } from "../src/api/LoggerAPI";
import { UserContext } from '../src/context/UserContext';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../src/api/AuthAPI", () => ({
  isGoogleAccount: jest.fn(),
}));

jest.mock("../src/api/AccountsAPI", () => ({
  updateAccount: jest.fn(),
  updateUserPreferences: jest.fn(),
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
  id: 21,
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


const mockSetUser = jest.fn();

const renderProfilePage = (contextUser = mockUser, loading = false) =>
  render(
    <UserContext.Provider value={{
      user: contextUser as any,
      loading,
      setUser: mockSetUser,
      refreshUser: jest.fn(),
    }}>
      <ProfilePage />
    </UserContext.Provider>
  );


describe("ProfilePage Component", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useOutlet as jest.Mock).mockReturnValue(null);
    localStorage.clear();
    sessionStorage.clear();

    (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: false });
    (getUserPrefs as jest.Mock).mockResolvedValue(mockPreferences);
    (updateAllPrefs as jest.Mock).mockResolvedValue(mockPreferences);
  });


  // -------------------------------------------------------------------------
  // Profile display & load
  // -------------------------------------------------------------------------

  test("renders user profile information correctly after loading", async () => {
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy();
      expect(screen.getByText("john.doe@example.com")).toBeTruthy();
    });
  });

  test("renders loading spinner while fetching profile", () => {
    renderProfilePage(mockUser, true); // loading: true from context
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });



  test("shows success toast on mount if a pending update exists in sessionStorage", async () => {
    sessionStorage.setItem("profileUpdateToast", "Update successful!");
    renderProfilePage();
    expect(toast.success).toHaveBeenCalledWith("Update successful!");
    expect(sessionStorage.getItem("profileUpdateToast")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Editing fields
  // -------------------------------------------------------------------------

  test("allows editing and saving first name successfully", async () => {
    (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, firstName: "Jane" });

    renderProfilePage();
    await screen.findByText("John Doe");

    const editButtons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Pencil"));
    fireEvent.click(editButtons[0]);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Jane" } });
    fireEvent.click(screen.getByText("Check"));

    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalledWith(mockUser.id, { first_name: "Jane" });
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully.");
      expect(screen.queryByRole("textbox")).toBeNull();
    });
  })


  // -------------------------------------------------------------------------
  // Google account restrictions
  // -------------------------------------------------------------------------

  test("restricts email and password changes for Google accounts", async () => {
    (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: true });
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getAllByText(/Managed by Google/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Change Password")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Theme switching (Auto-save)
  // -------------------------------------------------------------------------

  test("clicking Dark theme button triggers immediate auto-save and DOM update", async () => {
    renderProfilePage();
    await screen.findByText("Dark"); // wait for init to complete
    await screen.findByText("John Doe"); // ensure user is loaded

    fireEvent.click(screen.getByText("Dark"));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    await waitFor(() => {
      expect(updateUserPreferences).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({ theme: "dark" }));
    });
  });

  test("syncs theme when storage_sync event is dispatched", async () => {
    renderProfilePage();
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
    renderProfilePage();
    await screen.findByText("John Doe"); // wait for user to load

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateUserPreferences).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({
        notifications_enabled: false,
      }));
    });
  });

  test("logs error and shows toast when auto-save fails", async () => {
    (updateUserPreferences as jest.Mock).mockRejectedValue(new Error("Sync error"));
    renderProfilePage();

    await screen.findByText("John Doe"); // wait for user to load via init()

    const darkBtn = screen.getByText("Dark");
    fireEvent.click(darkBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to sync preferences.");
      expect(logFrontend).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining("Auto-save failed"),
      }));
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  test("navigates to change password for non-Google accounts", async () => {
    renderProfilePage();
    const btn = await screen.findByText("Change Password");
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith("changePassword");
  });

  test("renders sub-routes via outlet if present", () => {
    (useOutlet as jest.Mock).mockReturnValue(<div data-testid="outlet">Sub-route</div>);
    renderProfilePage();
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });
});