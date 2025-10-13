import { render, screen } from "@testing-library/react";
import App from "../src/App";

test("renders the button with text 'Click me'", () => {
  render(<App />);
  expect(screen.getByText("Click me")).toBeInTheDocument();
});
