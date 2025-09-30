import { render, screen } from '@testing-library/react'
import App from '../src/App'
import '@testing-library/jest-dom'


test('renders Vite + React heading', () => {
  render(<App />);
  const heading = screen.getByText(/Vite \+ React/i);
  expect(heading).toBeInTheDocument();
});
