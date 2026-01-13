import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import HomePageBanner from "../src/components/helpers/HomePageBanner";

describe("HomePageBanner", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("renders the no competitions message", () => {
    render(<HomePageBanner competitions={[]} />);

    expect(
      screen.getByText(/Welcome to Thinkly Competitions!/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/There are no competitions at the moment/i)
    ).toBeInTheDocument();
  });

  test("renders the active competition call to action", () => {
    jest.setSystemTime(new Date(2025, 10, 3, 12, 0, 0));

    render(
      <HomePageBanner
        competitions={[
          {
            id: 1,
            competitionTitle: "WebComp",
            competitionLocation: "Toronto",
            startDate: new Date(2025, 10, 3, 9, 0, 0),
            endDate: new Date(2025, 10, 3, 17, 0, 0),
          },
          {
            id: 2,
            competitionTitle: "CyberComp",
            competitionLocation: "Montreal",
            startDate: new Date(2025, 10, 9, 9, 0, 0),
            endDate: new Date(2025, 10, 9, 17, 0, 0),
          },
        ]}
      />
    );

    expect(screen.getByText(/Active now/i)).toBeInTheDocument();
    expect(screen.getByText("WebComp")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Join Competition/i })
    ).toBeInTheDocument();
  });

  test("renders upcoming competition countdown and title", async () => {
    jest.setSystemTime(new Date(2025, 0, 1, 0, 0, 0));

    render(
      <HomePageBanner
        competitions={[
          {
            id: 1,
            competitionTitle: "NextUp",
            competitionLocation: "Toronto",
            startDate: new Date(2025, 0, 2, 0, 0, 5),
            endDate: new Date(2025, 0, 2, 8, 0, 0),
          },
          {
            id: 2,
            competitionTitle: "LaterComp",
            competitionLocation: "Montreal",
            startDate: new Date(2025, 0, 5, 9, 0, 0),
            endDate: new Date(2025, 0, 5, 17, 0, 0),
          },
        ]}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/1d 0h 0m 5s/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByText("NextUp")).toBeInTheDocument();
    expect(
      screen.getByText(/Get ready! The competition starts on/i)
    ).toBeInTheDocument();
  });
});
