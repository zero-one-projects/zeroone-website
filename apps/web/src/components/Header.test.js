import { fireEvent, render, screen } from '@testing-library/react';
import Header from './Header';

const navigation = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'services', label: 'Services', href: '/about-us#services' },
  { id: 'about', label: 'About Us', href: '/about-us' },
  { id: 'contact', label: 'Contact', href: '/#contact' },
];

test('mobile menu opens and closes when a destination is selected', () => {
  render(<Header brand={{ name: 'ZeroOne IT Inc.' }} navigation={navigation} />);
  const toggle = screen.getByRole('button', { name: /menu/i });
  const nav = screen.getByRole('navigation', { name: 'Primary' });
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(nav).toHaveClass('is-open');
  const services = screen.getByRole('link', { name: 'Services' });
  expect(services).toHaveAttribute('href', '/about-us#services');
  fireEvent.click(services);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(nav).not.toHaveClass('is-open');
});

test('Escape closes the mobile menu and restores focus to its toggle', () => {
  render(<Header brand={{ name: 'ZeroOne IT Inc.' }} navigation={navigation} />);
  const toggle = screen.getByRole('button', { name: /menu/i });
  fireEvent.click(toggle);
  fireEvent.keyDown(screen.getByRole('navigation', { name: 'Primary' }), { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
});
