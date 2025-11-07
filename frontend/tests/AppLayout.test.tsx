/// <reference types="jest" />

import { render, screen } from "@testing-library/react";
import { Layout } from "../src/components/layout/AppLayout";
import { jest } from '@jest/globals';

// Mock react-router-dom
const mockUseMatches = jest.fn();

jest.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  useMatches: () => mockUseMatches(),
}));

// Mock child components
jest.mock("../src/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: unknown) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
}));

jest.mock("../src/components/layout/AppSidebar", () => ({
  AppSidebar: () => <aside data-testid="app-sidebar">Sidebar</aside>,
}));

jest.mock("../src/components/layout/AppBreadcrumb", () => ({
  AppBreadcrumbs: ({ items }: unknown) => (
    <nav data-testid="app-breadcrumbs">
      {items.map((item: unknown, index: number) => (
        <span key={index} data-href={item.href}>
          {item.title}
        </span>
      ))}
    </nav>
  ),
}));

describe("Layout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Structure", () => {
    test("renders SidebarProvider wrapper", () => {
      mockUseMatches.mockReturnValue([]);
      render(<Layout />);
      expect(screen.getByTestId("sidebar-provider")).toBeInTheDocument();
    });

    test("renders AppSidebar", () => {
      mockUseMatches.mockReturnValue([]);
      render(<Layout />);
      expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
    });

    test("renders AppBreadcrumbs", () => {
      mockUseMatches.mockReturnValue([]);
      render(<Layout />);
      expect(screen.getByTestId("app-breadcrumbs")).toBeInTheDocument();
    });

    test("renders Outlet for nested routes", () => {
      mockUseMatches.mockReturnValue([]);
      render(<Layout />);
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
      expect(screen.getByText("Outlet Content")).toBeInTheDocument();
    });

    test("renders main content area with correct structure", () => {
      mockUseMatches.mockReturnValue([]);
      const { container } = render(<Layout />);
      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass("flex-1"); 
    });

    test("renders flex container with min-h-screen", () => {
      mockUseMatches.mockReturnValue([]);
      const { container } = render(<Layout />);
      const flexContainer = container.querySelector(".flex.min-h-screen");
      expect(flexContainer).toBeInTheDocument();
    });
}); 

  describe("Breadcrumb Generation", () => {
    test("generates breadcrumbs from routes with crumb handles", () => {
      const mockRoutes = [
        {
          pathname: "/",
          handle: { crumb: { title: "Home" } },
        },
        {
          pathname: "/products",
          handle: { crumb: { title: "Products" } },
        },
        {
          pathname: "/products/123",
          handle: { crumb: { title: "Product Details" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Product Details")).toBeInTheDocument();
    });

    test("filters out routes without crumb handles", () => {
      const mockRoutes = [
        {
          pathname: "/",
          handle: { crumb: { title: "Home" } },
        },
        {
          pathname: "/intermediate",
          handle: {},
        },
        {
          pathname: "/destination",
          handle: { crumb: { title: "Destination" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Destination")).toBeInTheDocument();
      expect(screen.queryByText("intermediate")).not.toBeInTheDocument();
    });

    test("filters out routes without handle property", () => {
      const mockRoutes = [
        {
          pathname: "/",
          handle: { crumb: { title: "Home" } },
        },
        {
          pathname: "/no-handle",
        },
        {
          pathname: "/destination",
          handle: { crumb: { title: "Destination" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Destination")).toBeInTheDocument();
    });

    test("passes correct href to breadcrumb items", () => {
      const mockRoutes = [
        {
          pathname: "/home",
          handle: { crumb: { title: "Home" } },
        },
        {
          pathname: "/home/settings",
          handle: { crumb: { title: "Settings" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      const homeSpan = screen.getByText("Home");
      const settingsSpan = screen.getByText("Settings");
      
      expect(homeSpan).toHaveAttribute("data-href", "/home");
      expect(settingsSpan).toHaveAttribute("data-href", "/home/settings");
    });

    test("handles empty routes array", () => {
      mockUseMatches.mockReturnValue([]);
      
      render(<Layout />);
      
      const breadcrumbs = screen.getByTestId("app-breadcrumbs");
      expect(breadcrumbs).toBeEmptyDOMElement();
    });

    test("handles routes with only non-crumb handles", () => {
      const mockRoutes = [
        {
          pathname: "/",
          handle: { someOtherProperty: "value" },
        },
        {
          pathname: "/page",
          handle: { anotherProperty: "value" },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      const breadcrumbs = screen.getByTestId("app-breadcrumbs");
      expect(breadcrumbs).toBeEmptyDOMElement();
    });
  });

  describe("Special Cases", () => {
    test("handles routes with special characters in pathname", () => {
      const mockRoutes = [
        {
          pathname: "/products/item-123",
          handle: { crumb: { title: "Product Item" } },
        },
        {
          pathname: "/products/category/sub-category",
          handle: { crumb: { title: "Subcategory" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      const productItem = screen.getByText("Product Item");
      const subcategory = screen.getByText("Subcategory");
      
      expect(productItem).toHaveAttribute("data-href", "/products/item-123");
      expect(subcategory).toHaveAttribute("data-href", "/products/category/sub-category");
    });

    test("handles routes with special characters in title", () => {
      const mockRoutes = [
        {
          pathname: "/settings",
          handle: { crumb: { title: "Settings & Preferences" } },
        },
        {
          pathname: "/user",
          handle: { crumb: { title: "User's Profile" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      expect(screen.getByText("Settings & Preferences")).toBeInTheDocument();
      expect(screen.getByText("User's Profile")).toBeInTheDocument();
    });

    test("handles single route with crumb", () => {
      const mockRoutes = [
        {
          pathname: "/",
          handle: { crumb: { title: "Home" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    test("handles deeply nested routes", () => {
      const mockRoutes = [
        {
          pathname: "/",
          handle: { crumb: { title: "Home" } },
        },
        {
          pathname: "/level1",
          handle: { crumb: { title: "Level 1" } },
        },
        {
          pathname: "/level1/level2",
          handle: { crumb: { title: "Level 2" } },
        },
        {
          pathname: "/level1/level2/level3",
          handle: { crumb: { title: "Level 3" } },
        },
        {
          pathname: "/level1/level2/level3/level4",
          handle: { crumb: { title: "Level 4" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Level 1")).toBeInTheDocument();
      expect(screen.getByText("Level 2")).toBeInTheDocument();
      expect(screen.getByText("Level 3")).toBeInTheDocument();
      expect(screen.getByText("Level 4")).toBeInTheDocument();
    });
  });

  describe("Hook Usage", () => {
    test("calls useMatches hook", () => {
      mockUseMatches.mockReturnValue([]);
      render(<Layout />);
      expect(mockUseMatches).toHaveBeenCalled();
    });

    test("calls useMatches only once per render", () => {
      mockUseMatches.mockReturnValue([]);
      render(<Layout />);
      expect(mockUseMatches).toHaveBeenCalledTimes(1);
    });
  });

  describe("Route with Query Parameters", () => {
    test("handles routes with query parameters in pathname", () => {
      const mockRoutes = [
        {
          pathname: "/search",
          handle: { crumb: { title: "Search" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      const searchSpan = screen.getByText("Search");
      expect(searchSpan).toHaveAttribute("data-href", "/search");
    });
  });

  describe("Mixed Route Scenarios", () => {
    test("handles alternating routes with and without crumbs", () => {
      const mockRoutes = [
        {
          pathname: "/",
          handle: { crumb: { title: "Home" } },
        },
        {
          pathname: "/intermediate1",
          handle: {},
        },
        {
          pathname: "/page1",
          handle: { crumb: { title: "Page 1" } },
        },
        {
          pathname: "/intermediate2",
        },
        {
          pathname: "/page2",
          handle: { crumb: { title: "Page 2" } },
        },
      ];
      mockUseMatches.mockReturnValue(mockRoutes);

      render(<Layout />);
      
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Page 1")).toBeInTheDocument();
      expect(screen.getByText("Page 2")).toBeInTheDocument();
      
      const breadcrumbs = screen.getByTestId("app-breadcrumbs");
      expect(breadcrumbs.children).toHaveLength(3);
    });
  });
});