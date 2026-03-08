import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MobileBanner } from "../src/components/layout/MobileBanner";

// ─── External module mocks ────────────────────────────────────────────────────

jest.mock("lucide-react", () => ({
  Monitor: () => <svg data-testid="monitor-icon" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setWindowWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
};

const fireResize = () => act(() => { window.dispatchEvent(new Event("resize")); });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MobileBanner", () => {
  afterEach(() => {
    // Reset to a safe desktop width after every test
    setWindowWidth(1024);
  });

  // ── Rendering on mobile ────────────────────────────────────────────────────

  it("renders the banner when the window width is below 768px", () => {
    setWindowWidth(375);
    render(<MobileBanner />);
    expect(screen.getByText("Desktop Required")).toBeInTheDocument();
  });

  it("renders the subtitle message on mobile", () => {
    setWindowWidth(375);
    render(<MobileBanner />);
    expect(
      screen.getByText(/optimized for desktop use/i)
    ).toBeInTheDocument();
  });

  it("renders the Monitor icon on mobile", () => {
    setWindowWidth(375);
    render(<MobileBanner />);
    expect(screen.getByTestId("monitor-icon")).toBeInTheDocument();
  });

  it("renders the blurred backdrop on mobile", () => {
    setWindowWidth(375);
    const { container } = render(<MobileBanner />);
    // The backdrop is the first fixed div with backdrop-blur
    const backdrop = container.querySelector(".backdrop-blur-md");
    expect(backdrop).toBeInTheDocument();
  });

  it("renders the card panel on mobile", () => {
    setWindowWidth(375);
    const { container } = render(<MobileBanner />);
    const card = container.querySelector(".rounded-2xl");
    expect(card).toBeInTheDocument();
  });

  // ── Not rendering on desktop ───────────────────────────────────────────────

  it("renders nothing when the window width is 768px (boundary)", () => {
    setWindowWidth(768);
    const { container } = render(<MobileBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the window width is above 768px", () => {
    setWindowWidth(1280);
    const { container } = render(<MobileBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing on a typical desktop width of 1440px", () => {
    setWindowWidth(1440);
    const { container } = render(<MobileBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  // ── Boundary conditions ────────────────────────────────────────────────────

  it("renders the banner at exactly 767px (one below the breakpoint)", () => {
    setWindowWidth(767);
    render(<MobileBanner />);
    expect(screen.getByText("Desktop Required")).toBeInTheDocument();
  });

  it("renders the banner at very small widths (320px)", () => {
    setWindowWidth(320);
    render(<MobileBanner />);
    expect(screen.getByText("Desktop Required")).toBeInTheDocument();
  });

  // ── Resize behaviour ───────────────────────────────────────────────────────

  it("shows the banner after resizing from desktop to mobile", async () => {
    setWindowWidth(1024);
    render(<MobileBanner />);
    expect(screen.queryByText("Desktop Required")).not.toBeInTheDocument();

    setWindowWidth(375);
    await fireResize();

    expect(screen.getByText("Desktop Required")).toBeInTheDocument();
  });

  it("hides the banner after resizing from mobile to desktop", async () => {
    setWindowWidth(375);
    render(<MobileBanner />);
    expect(screen.getByText("Desktop Required")).toBeInTheDocument();

    setWindowWidth(1024);
    await fireResize();

    expect(screen.queryByText("Desktop Required")).not.toBeInTheDocument();
  });

  it("toggles correctly across multiple resize events", async () => {
    setWindowWidth(1024);
    render(<MobileBanner />);

    setWindowWidth(375);
    await fireResize();
    expect(screen.getByText("Desktop Required")).toBeInTheDocument();

    setWindowWidth(1024);
    await fireResize();
    expect(screen.queryByText("Desktop Required")).not.toBeInTheDocument();

    setWindowWidth(480);
    await fireResize();
    expect(screen.getByText("Desktop Required")).toBeInTheDocument();
  });

  it("re-evaluates on resize to exactly the breakpoint (768px)", async () => {
    setWindowWidth(375);
    render(<MobileBanner />);
    expect(screen.getByText("Desktop Required")).toBeInTheDocument();

    setWindowWidth(768);
    await fireResize();
    expect(screen.queryByText("Desktop Required")).not.toBeInTheDocument();
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────

  it("removes the resize event listener on unmount", () => {
    setWindowWidth(375);
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = render(<MobileBanner />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("adds the resize event listener on mount", () => {
    setWindowWidth(375);
    const addSpy = jest.spyOn(window, "addEventListener");
    render(<MobileBanner />);
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    addSpy.mockRestore();
  });

  // ── Accessibility & structure ──────────────────────────────────────────────

  it("renders the heading as an h2", () => {
    setWindowWidth(375);
    render(<MobileBanner />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Desktop Required");
  });

  it("renders two fixed-position overlay elements on mobile", () => {
    setWindowWidth(375);
    const { container } = render(<MobileBanner />);
    const fixedEls = container.querySelectorAll(".fixed");
    expect(fixedEls.length).toBeGreaterThanOrEqual(2);
  });

  it("the card is not interactive — no buttons or links rendered", () => {
    setWindowWidth(375);
    render(<MobileBanner />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});