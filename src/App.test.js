import { render, screen } from '@testing-library/react';
import App from './App';

test('renders company hero heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', {
    name: /from idea to deployment/i
  });
  expect(heading).toBeInTheDocument();
});
