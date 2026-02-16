import { render, screen } from "@testing-library/react";
import { Trophy } from "lucide-react";
import { ManageCard } from "../src/components/dashboardCards/ManageCard";

jest.mock("lucide-react", () => {
  const actual = jest.requireActual("lucide-react");

  return {
    ...actual,
    ChevronRightIcon: ({ className }: { className?: string }) => (
      <svg data-testid="chevron-right-icon" className={className} />
    ),
  };
});

describe("ManageCard", () => {
  it("renders the provided title", () => {
    render(<ManageCard title="Manage Competitions" icon={Trophy} />);

    expect(screen.getByText("Manage Competitions")).toBeInTheDocument();
  });

  it("renders the trailing chevron icon", () => {
    render(<ManageCard title="Manage Competitions" icon={Trophy} />);

    expect(screen.getByTestId("chevron-right-icon")).toBeInTheDocument();
  });

  it("renders as an outlined item container", () => {
    const { container } = render(<ManageCard title="Manage Competitions" icon={Trophy} />);

    const item = container.querySelector('[data-slot="item"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveAttribute("data-variant", "outline");
  });
});
