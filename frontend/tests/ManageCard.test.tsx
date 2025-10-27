import { render, screen } from "@testing-library/react";
import { ManageCard } from "../src/components/dashboard/ManageCard";
import type { ManageItem } from "../src/components/dashboard/ManageCard";

// Mock shadcn components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="button" className={className}>{children}</button>
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar-fallback" className={className}>{children}</div>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconChevronRight: ({ className }: { className?: string }) => (
    <svg data-testid="icon-chevron-right" className={className} />
  ),
}));

describe("ManageCard", () => {
  const itemsWithAvatars: ManageItem[] = [
    { avatarUrl: "/user1.jpg", name: "John Doe", info: "john@example.com" },
    { avatarUrl: "/user2.jpg", name: "Jane Smith", info: "jane@example.com" },
  ];

  const itemsWithColors: ManageItem[] = [
    { color: "#FF0000", name: "Red Item", info: "Info 1" },
    { color: "#00FF00", name: "Green Item", info: "Info 2" },
  ];

  const itemsWithoutIcons: ManageItem[] = [
    { name: "Item 1", info: "Description 1" },
    { name: "Item 2", info: "Description 2" },
  ];

  const itemsWithHref: ManageItem[] = [
    { name: "Link Item", info: "Click me", href: "/test-link" },
  ];

  describe("Basic rendering", () => {
    it("renders the card title", () => {
      render(<ManageCard title="Test Title" items={itemsWithAvatars} />);
      
      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("renders the chevron button", () => {
      render(<ManageCard title="Test Title" items={itemsWithAvatars} />);
      
      expect(screen.getByTestId("icon-chevron-right")).toBeInTheDocument();
    });

    it("renders all items", () => {
      render(<ManageCard title="Test Title" items={itemsWithAvatars} />);
      
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("renders empty items array", () => {
      render(<ManageCard title="Empty Card" items={[]} />);
      
      expect(screen.getByText("Empty Card")).toBeInTheDocument();
      expect(screen.queryByTestId("avatar")).not.toBeInTheDocument();
    });
  });

  describe("Items with avatars", () => {
    it("renders avatar images when avatarUrl is provided", () => {
      render(<ManageCard title="Users" items={itemsWithAvatars} />);
      
      const avatars = screen.getAllByTestId("avatar");
      expect(avatars).toHaveLength(2);
      
      const avatarImages = screen.getAllByTestId("avatar-image");
      expect(avatarImages).toHaveLength(2);
      expect(avatarImages[0]).toHaveAttribute("src", "/user1.jpg");
      expect(avatarImages[1]).toHaveAttribute("src", "/user2.jpg");
    });

    it("renders avatar with correct alt text", () => {
      render(<ManageCard title="Users" items={itemsWithAvatars} />);
      
      const avatarImages = screen.getAllByTestId("avatar-image");
      expect(avatarImages[0]).toHaveAttribute("alt", "John Doe");
    });

    it("renders avatar fallback", () => {
      render(<ManageCard title="Users" items={itemsWithAvatars} />);
      
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      expect(fallbacks.length).toBeGreaterThan(0);
    });
  });

  describe("Items with color circles", () => {
    it("renders color circles when color is provided", () => {
      const { container } = render(<ManageCard title="Competitions" items={itemsWithColors} />);
      
      const colorCircles = container.querySelectorAll(".h-8.w-8.rounded-full");
      expect(colorCircles).toHaveLength(2);
    });

    it("applies correct background color to circles", () => {
      const { container } = render(<ManageCard title="Competitions" items={itemsWithColors} />);
      
      const colorCircles = container.querySelectorAll(".h-8.w-8.rounded-full");
      expect(colorCircles[0]).toHaveStyle({ backgroundColor: "#FF0000" });
      expect(colorCircles[1]).toHaveStyle({ backgroundColor: "#00FF00" });
    });

    it("renders item names and info for colored items", () => {
      render(<ManageCard title="Competitions" items={itemsWithColors} />);
      
      expect(screen.getByText("Red Item")).toBeInTheDocument();
      expect(screen.getByText("Info 1")).toBeInTheDocument();
      expect(screen.getByText("Green Item")).toBeInTheDocument();
      expect(screen.getByText("Info 2")).toBeInTheDocument();
    });
  });

  describe("Items without icons", () => {
    it("renders items without avatars or color circles", () => {
      const { container } = render(<ManageCard title="Questions" items={itemsWithoutIcons} />);
      
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Description 1")).toBeInTheDocument();
      expect(screen.queryByTestId("avatar")).not.toBeInTheDocument();
      
      const colorCircles = container.querySelectorAll(".h-8.w-8.rounded-full");
      expect(colorCircles).toHaveLength(0);
    });
  });

  describe("Items with links", () => {
    it("renders item name as link when href is provided", () => {
      render(<ManageCard title="Links" items={itemsWithHref} />);
      
      const link = screen.getByRole("link", { name: "Link Item" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test-link");
    });

    it("renders item name as text when href is not provided", () => {
      render(<ManageCard title="No Links" items={itemsWithoutIcons} />);
      
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Item 1" })).not.toBeInTheDocument();
    });
  });

  describe("Dividers", () => {
    it("renders dividers between items", () => {
      const { container } = render(<ManageCard title="Test" items={itemsWithAvatars} />);
      
      const dividers = container.querySelectorAll(".h-px.bg-\\[\\#E5E5E5\\]");
      expect(dividers).toHaveLength(2); // One divider per item
    });
  });

  describe("Custom className", () => {
    it("applies custom className when provided", () => {
      const { container } = render(
        <ManageCard title="Test" items={itemsWithAvatars} className="custom-class" />
      );
      
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass("custom-class");
    });

    it("applies default classes", () => {
      const { container } = render(<ManageCard title="Test" items={itemsWithAvatars} />);
      
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass("border-[#E5E5E5]", "rounded-2xl");
    });
  });

  describe("Layout structure", () => {
    it("renders Card wrapper", () => {
      render(<ManageCard title="Test" items={itemsWithAvatars} />);
      
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });

    it("renders CardHeader", () => {
      render(<ManageCard title="Test" items={itemsWithAvatars} />);
      
      expect(screen.getByTestId("card-header")).toBeInTheDocument();
    });

    it("renders CardContent", () => {
      render(<ManageCard title="Test" items={itemsWithAvatars} />);
      
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });
  });

  describe("Text styling", () => {
    it("applies purple color to item names", () => {
      const { container } = render(<ManageCard title="Test" items={itemsWithAvatars} />);
      
      const nameElements = container.querySelectorAll(".text-\\[\\#8065CD\\]");
      expect(nameElements.length).toBeGreaterThan(0);
    });

    it("applies gray color to item info", () => {
      const { container } = render(<ManageCard title="Test" items={itemsWithAvatars} />);
      
      const infoElements = container.querySelectorAll(".text-\\[\\#737373\\]");
      expect(infoElements.length).toBeGreaterThan(0);
    });
  });
});