// tests/Sidebar.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SidebarProvider,
  useSidebar,
  Sidebar,
  SidebarTrigger,
} from "../src/components/ui/sidebar";
import * as hooks from "../src/hooks/use-mobile";

jest.mock("@/hooks/use-mobile");

describe("Sidebar components", () => {
  const useIsMobileMock = hooks.useIsMobile as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobileMock.mockReturnValue(false);
  });

  function TestComponent() {
    const { state, toggleSidebar, open } = useSidebar();
    return (
      <div>
        <span data-testid="sidebar-state">{state}</span>
        <span data-testid="sidebar-open">{open ? "true" : "false"}</span>
        <button onClick={toggleSidebar}>Toggle</button>
      </div>
    );
  }

  it("throws if useSidebar used outside provider", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderFn = () => render(<TestComponent /> as any);
    expect(renderFn).toThrow("useSidebar must be used within a SidebarProvider.");
  });

  it("provides default state via SidebarProvider", () => {
    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("expanded");
    expect(screen.getByTestId("sidebar-open").textContent).toBe("true");
  });

  it("toggleSidebar changes state", () => {
    render(
      <SidebarProvider defaultOpen={true}>
        <TestComponent />
      </SidebarProvider>
    );

    const toggleButton = screen.getByText("Toggle");
    fireEvent.click(toggleButton);

    expect(screen.getByTestId("sidebar-state").textContent).toBe("collapsed");
    expect(screen.getByTestId("sidebar-open").textContent).toBe("false");
  });

  it("SidebarTrigger calls toggleSidebar", () => {
    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
        <TestComponent />
      </SidebarProvider>
    );

    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByTestId("sidebar-state").textContent).toBe("collapsed");
    fireEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByTestId("sidebar-state").textContent).toBe("expanded");
  });

  it("handles keyboard shortcut Ctrl+B / Cmd+B", () => {
    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(screen.getByTestId("sidebar-state").textContent).toBe("collapsed");

    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(screen.getByTestId("sidebar-state").textContent).toBe("expanded");
  });

  it("renders Sidebar component", () => {
    render(
      <SidebarProvider>
        <Sidebar data-testid="sidebar">Hello</Sidebar>
      </SidebarProvider>
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders mobile sidebar if isMobile is true", () => {
      useIsMobileMock.mockReturnValue(true);

      render(
        <SidebarProvider>
          <Sidebar data-testid="sidebar">Mobile</Sidebar>
          <SidebarTrigger data-testid="trigger" />
        </SidebarProvider>
      );

      // Click the trigger to open the mobile sidebar
      fireEvent.click(screen.getByTestId("trigger"));

      expect(screen.getByText("Mobile")).toBeInTheDocument();
    });
});
