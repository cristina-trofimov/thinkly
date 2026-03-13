import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "../src/views/ProfilePage";
import { getProfile, isGoogleAccount } from "../src/api/AuthAPI";
import { updateAccount } from "../src/api/AccountsAPI";
import { getUserPrefs, updateAllPrefs } from "../src/api/UserPreferencesAPI";
import { useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  API_URL: 'http://localhost:8000',
}));

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
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));
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
  const mockReload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useOutlet as jest.Mock).mockReturnValue(null);

    delete (window as any).location;
    window.location = {
      href: "http://localhost/app/profile",
      origin: "http://localhost",
      pathname: "/app/profile",
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
    Object.defineProperty(window, "sessionStorage", {
      value: sessionStorageMock,
      configurable: true,
      writable: true,
    });

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

  test("displays account type badge", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/participant/i)).toBeTruthy();
    });
  });

  test("renders avatar with user initials", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const avatar = screen.getByTestId("avatar-initials");
      expect(avatar.textContent).toBe("JD");
    });
  });

  test("renders loading spinner while fetching profile", () => {
    (getProfile as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockUser), 1000))
    );
    render(<ProfilePage />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  test("displays error toast if profile fetching fails", async () => {
    (getProfile as jest.Mock).mockRejectedValue(new Error("API failure"));
    render(<ProfilePage />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile data.");
    });
  });

  test("renders sub-routes via outlet if present", () => {
    (useOutlet as jest.Mock).mockReturnValue(
      <div data-testid="outlet-content">Sub-route Content</div>
    );
    render(<ProfilePage />);
    expect(screen.getByTestId("outlet-content")).toBeTruthy();
  });

  test("shows success toast on mount if a pending update exists", async () => {
    (window.sessionStorage.getItem as jest.Mock).mockReturnValue("Last name updated successfully.");
    render(<ProfilePage />);
    expect(toast.success).toHaveBeenCalledWith("Last name updated successfully.");
  });

  // -------------------------------------------------------------------------
  // Editing fields
  // -------------------------------------------------------------------------

  test("cancels editing when the X button is clicked", async () => {
    render(<ProfilePage />);
    await screen.findByText("John Doe");

    const firstNameEdit = screen.getAllByRole("button").find(b => b.textContent?.includes("Pencil"));
    if (firstNameEdit) fireEvent.click(firstNameEdit);

    const cancelButton = screen.getAllByRole("button").find(b => b.textContent?.includes("X"));
    if (cancelButton) fireEvent.click(cancelButton);

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  test("allows editing and saving first name successfully", async () => {
    (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, firstName: "Jane" });

    render(<ProfilePage />);
    await screen.findByText("John Doe");

    const firstNameEdit = screen.getAllByRole("button").find(b => b.textContent?.includes("Pencil"));
    if (firstNameEdit) fireEvent.click(firstNameEdit);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Jane" } });

    const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
    if (saveButton) fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalledWith("user-123", { first_name: "Jane" });
      expect(toast.success).toHaveBeenCalledWith("First name updated successfully.");
    });
  });

  test("allows editing and saving last name successfully", async () => {
    (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, lastName: "Smith" });

    render(<ProfilePage />);
    await screen.findByText("John Doe");

    const editButtons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Pencil"));
    if (editButtons[1]) fireEvent.click(editButtons[1]);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Smith" } });

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

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "jane.doe@example.com" } });

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

    const firstNameEdit = screen.getAllByRole("button").find(b => b.textContent?.includes("Pencil"));
    if (firstNameEdit) fireEvent.click(firstNameEdit);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Jane" } });

    const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
    if (saveButton) fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update firstname.");
    });
  });

  test("disables save and cancel buttons during save operation", async () => {
    (updateAccount as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ ...mockUser }), 100))
    );

    render(<ProfilePage />);
    await screen.findByText("John Doe");

    const firstNameEdit = screen.getAllByRole("button").find(b => b.textContent?.includes("Pencil"));
    if (firstNameEdit) fireEvent.click(firstNameEdit);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Jane" } });

    const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
    if (saveButton) fireEvent.click(saveButton);

    await waitFor(() => {
      const disabledButtons = screen.getAllByRole("button").filter(b => b.hasAttribute("disabled"));
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  test("clears editing state after successful save", async () => {
    (updateAccount as jest.Mock).mockResolvedValue({ ...mockUser, firstName: "Jane" });

    render(<ProfilePage />);
    await screen.findByText("John Doe");

    const firstNameEdit = screen.getAllByRole("button").find(b => b.textContent?.includes("Pencil"));
    if (firstNameEdit) fireEvent.click(firstNameEdit);

    expect(screen.getByRole("textbox")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Jane" } });

    const saveButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Check"));
    if (saveButton) fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
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

  test("does not allow editing email for Google accounts", async () => {
    (isGoogleAccount as jest.Mock).mockResolvedValue({ isGoogleUser: true });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("john.doe@example.com")).toBeTruthy();
      expect(screen.getAllByText(/Managed by Google/i).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Pencil"));
    expect(editButtons.length).toBe(2); // only first name + last name
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  test("navigates to change password for non-Google accounts", async () => {
    render(<ProfilePage />);
    await screen.findByText("Change Password");
    fireEvent.click(screen.getByText("Change Password"));
    expect(mockNavigate).toHaveBeenCalledWith("changePassword");
  });

  // -------------------------------------------------------------------------
  // Preferences loading
  // -------------------------------------------------------------------------

  test("calls getUserPrefs with the correct user ID on mount", async () => {
    render(<ProfilePage />);
    await screen.findByText("John Doe");
    await waitFor(() => {
      expect(getUserPrefs).toHaveBeenCalledWith("user-123");
    });
  });

  test("falls back to default preferences when getUserPrefs fails", async () => {
    (getUserPrefs as jest.Mock).mockRejectedValue(new Error("404"));
    render(<ProfilePage />);
    // Page should still render without crashing
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy();
    });
  });

  test("does not show error toast when preferences fetch silently fails", async () => {
    (getUserPrefs as jest.Mock).mockRejectedValue(new Error("404"));
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy();
    });
    // toast.error should only be called for profile failures, not preferences
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("renders Preferences section heading", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("Preferences")).toBeTruthy();
    });
  });

  test("displays 'Enable email notifications' label", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("Enable email notifications")).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Theme switching
  // -------------------------------------------------------------------------

  test("renders Light and Dark theme buttons", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("Light")).toBeTruthy();
      expect(screen.getByText("Dark")).toBeTruthy();
    });
  });

  test("clicking Dark theme button changes preference state", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Dark")).toBeTruthy());

    fireEvent.click(screen.getByText("Dark"));

    // After clicking Dark, the Save Preferences button should become enabled
    // because preferences.theme ("dark") !== savedPreferences.theme ("light")
    await waitFor(() => {
      const saveBtn = screen.getByText("Save Preferences");
      expect(saveBtn.closest("button")).not.toBeDisabled();
    });
  });

  test("clicking Light theme button when already light keeps Save button disabled", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Light")).toBeTruthy());

    // Click Light when already light — no change
    fireEvent.click(screen.getByText("Light"));

    const saveBtn = screen.getByText("Save Preferences");
    expect(saveBtn.closest("button")).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Notifications toggle
  // -------------------------------------------------------------------------

  test("notifications toggle is rendered as a switch", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const toggle = screen.getByRole("switch");
      expect(toggle).toBeTruthy();
    });
  });

  test("notifications toggle reflects initial enabled state", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const toggle = screen.getByRole("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("true");
    });
  });

  test("toggling notifications enables the Save Preferences button", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole("switch")).toBeTruthy());

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => {
      const saveBtn = screen.getByText("Save Preferences");
      expect(saveBtn.closest("button")).not.toBeDisabled();
    });
  });

  test("notifications toggle reflects disabled initial state", async () => {
    (getUserPrefs as jest.Mock).mockResolvedValue({
      theme: "light",
      notifications_enabled: false,
    });
    render(<ProfilePage />);
    await waitFor(() => {
      const toggle = screen.getByRole("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("false");
    });
  });

  // -------------------------------------------------------------------------
  // Save Preferences button state
  // -------------------------------------------------------------------------

  test("Save Preferences button is disabled when no preferences changed", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      const saveBtn = screen.getByText("Save Preferences");
      expect(saveBtn.closest("button")).toBeDisabled();
    });
  });

  test("Save Preferences button is enabled after changing theme to dark", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Dark")).toBeTruthy());

    fireEvent.click(screen.getByText("Dark"));

    await waitFor(() => {
      expect(screen.getByText("Save Preferences").closest("button")).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Saving preferences
  // -------------------------------------------------------------------------

  test("calls updateAllPrefs with correct args when Save Preferences is clicked", async () => {
    (updateAllPrefs as jest.Mock).mockResolvedValue({
      user_id: 21,
      theme: "dark",
      notifications_enabled: true,
      last_used_programming_language: 71,
    });

    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Dark")).toBeTruthy());

    fireEvent.click(screen.getByText("Dark"));

    await waitFor(() => {
      expect(screen.getByText("Save Preferences").closest("button")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(updateAllPrefs).toHaveBeenCalledWith(
        { user_id: 21, theme: "dark", notifications_enabled: true, last_used_programming_language: 71 }
      );
    });
  });

  test("shows success toast after saving preferences", async () => {
    (updateAllPrefs as jest.Mock).mockResolvedValue({
      theme: "dark",
      notifications_enabled: true,
    });

    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Dark")).toBeTruthy());

    fireEvent.click(screen.getByText("Dark"));
    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Preferences saved.");
    });
  });

  test("shows error toast when saving preferences fails", async () => {
    (updateAllPrefs as jest.Mock).mockRejectedValue(new Error("Server error"));

    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Dark")).toBeTruthy());

    fireEvent.click(screen.getByText("Dark"));
    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save preferences.");
    });
  });

  test("Save Preferences button is disabled again after successful save", async () => {
    (updateAllPrefs as jest.Mock).mockResolvedValue({
      theme: "dark",
      notifications_enabled: true,
    });

    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Dark")).toBeTruthy());

    fireEvent.click(screen.getByText("Dark"));
    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Preferences saved.");
    });

    // savedPreferences is updated to match preferences — button should be disabled again
    await waitFor(() => {
      expect(screen.getByText("Save Preferences").closest("button")).toBeDisabled();
    });
  });

  test("disables Save Preferences button while saving is in progress", async () => {
    (updateAllPrefs as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ theme: "dark", notifications_enabled: true }), 200))
    );

    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Dark")).toBeTruthy());

    fireEvent.click(screen.getByText("Dark"));
    fireEvent.click(screen.getByText("Save Preferences"));

    // During the async save the button should be disabled
    await waitFor(() => {
      expect(screen.getByText("Save Preferences").closest("button")).toBeDisabled();
    });
  });

  test("does not call updateAllPrefs when preferences unchanged", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("Save Preferences")).toBeTruthy());

    // Button is disabled — clicking it should not trigger the API call
    fireEvent.click(screen.getByText("Save Preferences"));

    expect(updateAllPrefs).not.toHaveBeenCalled();
  });

  test("saving notifications-only preference change calls updateAllPrefs", async () => {
    (updateAllPrefs as jest.Mock).mockResolvedValue({
      user_id: 21,
      theme: "light",
      notifications_enabled: false,
      last_used_programming_language: 71,
    });

    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole("switch")).toBeTruthy());

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(updateAllPrefs).toHaveBeenCalledWith(
        { user_id: 21, theme: "light", notifications_enabled: false, last_used_programming_language: 71 }
      );
    });
  });
});