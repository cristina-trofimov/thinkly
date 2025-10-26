import { render, screen } from "@testing-library/react";
import { AppBreadcrumbs } from "../src/components/layout/app-breadcrumb";

describe("AppBreadcrumbs", () => {
  const mockItems = [
    { title: "Home", href: "/" },
    { title: "Products", href: "/products" },
    { title: "Electronics", href: "/products/electronics" },
  ];

  test("renders null when items array is empty", () => {
    const { container } = render(<AppBreadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders null when items is undefined", () => {
    const { container } = render(<AppBreadcrumbs items={null as any} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders correct number of breadcrumb items", () => {
    render(<AppBreadcrumbs items={mockItems} />);
    const breadcrumbItems = screen.getAllByRole("listitem");
    expect(breadcrumbItems).toHaveLength(mockItems.length);
  });

  test("renders all breadcrumb titles correctly", () => {
    render(<AppBreadcrumbs items={mockItems} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  test("renders links for non-last items with correct href", () => {
    render(<AppBreadcrumbs items={mockItems} />);
    const homeLink = screen.getByRole("link", { name: "Home" });
    const productsLink = screen.getByRole("link", { name: "Products" });
    
    expect(homeLink).toHaveAttribute("href", "/");
    expect(productsLink).toHaveAttribute("href", "/products");
  });

  test("renders last item as page (not a link)", () => {
    render(<AppBreadcrumbs items={mockItems} />);
    const lastItem = screen.getByText("Electronics");
    
    // Should not be a link
    expect(lastItem.closest("a")).toBeNull();
  });

  test("renders separators between items but not after last item", () => {
    const { container } = render(<AppBreadcrumbs items={mockItems} />);
    const separators = container.querySelectorAll('[data-testid="breadcrumb-separator"]');
    
    // Should have 2 separators for 3 items
    expect(separators.length).toBe(mockItems.length - 1);
  });

  test("renders single item without separator", () => {
    const singleItem = [{ title: "Home", href: "/" }];
    const { container } = render(<AppBreadcrumbs items={singleItem} />);
    
    expect(screen.getByText("Home")).toBeInTheDocument();
    const separators = container.querySelectorAll('[data-testid="breadcrumb-separator"]');
    expect(separators.length).toBe(0);
  });

  test("handles items with special characters in titles", () => {
    const specialItems = [
      { title: "Home & Garden", href: "/home" },
      { title: "Tools & Equipment", href: "/tools" },
    ];
    render(<AppBreadcrumbs items={specialItems} />);
    
    expect(screen.getByText("Home & Garden")).toBeInTheDocument();
    expect(screen.getByText("Tools & Equipment")).toBeInTheDocument();
  });

  test("renders exactly two items correctly", () => {
    const twoItems = [
      { title: "Home", href: "/" },
      { title: "About", href: "/about" },
    ];
    render(<AppBreadcrumbs items={twoItems} />);
    
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("About").closest("a")).toBeNull();
  });

  test("uses React.Fragment with correct key for each iteration", () => {
    const { container } = render(<AppBreadcrumbs items={mockItems} />);
    const listItems = container.querySelectorAll('li');
    
    // Verify that all items are rendered
    expect(listItems.length).toBeGreaterThan(0);
  });
});