import { act, fireEvent, render, screen } from '@testing-library/react';
import HeroSlideshow from './HeroSlideshow';

afterEach(() => jest.useRealTimers());

test('touch devices keep rotating and support horizontal swipes without treating vertical scrolling as navigation', () => {
  jest.useFakeTimers();
  const original = window.matchMedia;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  try {
    render(<HeroSlideshow />);
    const carousel = screen.getByRole('region', { name: 'ZeroOne introduction' });
    fireEvent.mouseEnter(carousel);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByRole('heading')).toHaveTextContent('Digital systems.');
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250, clientY: 100 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100, clientY: 110 }] });
    expect(screen.getByRole('heading')).toHaveTextContent('Software & SaaS.');
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250, clientY: 100 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 230, clientY: 300 }] });
    expect(screen.getByRole('heading')).toHaveTextContent('Software & SaaS.');
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByRole('heading')).toHaveTextContent('Built around you.');
  } finally {
    window.matchMedia = original;
  }
});

test('rotates through the messages, pauses, and wraps after the tagline slide', () => {
  jest.useFakeTimers();
  render(<HeroSlideshow />);
  expect(screen.getByRole('heading')).toHaveTextContent('Build. Transform. Scale with Confidence.');
  act(() => jest.advanceTimersByTime(3000));
  expect(screen.getByRole('heading')).toHaveTextContent('Digital systems.');
  const carousel = screen.getByRole('region', { name: 'ZeroOne introduction' });
  expect(screen.queryByRole('button', { name: /previous slide|next slide|play slideshow|pause slideshow/i })).not.toBeInTheDocument();
  fireEvent.mouseEnter(carousel);
  act(() => jest.advanceTimersByTime(12000));
  expect(screen.getByRole('heading')).toHaveTextContent('Digital systems.');
  fireEvent.mouseLeave(carousel);
  act(() => jest.advanceTimersByTime(3000));
  expect(screen.getByRole('heading')).toHaveTextContent('Software & SaaS.');
  fireEvent.click(screen.getByRole('button', { name: 'Show slide 4: Built around you' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Built around you.');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Show slide 4: Built around you' }), { key: 'ArrowRight' });
  expect(screen.getByRole('heading')).toHaveTextContent('From idea to Deployment.');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Show slide 5: Idea to deployment' }), { key: 'ArrowRight' });
  expect(screen.getByRole('heading')).toHaveTextContent('We design and build.');
  expect(screen.getByText('Software solutions that simplify processes and drive results.')).toBeVisible();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Show slide 6: Software that delivers' }), { key: 'ArrowRight' });
  expect(screen.getByRole('heading')).toHaveTextContent('Build. Transform. Scale with Confidence.');
});

test('reduced motion disables automatic rotation while keeping manual navigation', () => {
  jest.useFakeTimers();
  const original = window.matchMedia;
  window.matchMedia = jest.fn(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  try {
    render(<HeroSlideshow />);
    act(() => jest.advanceTimersByTime(12000));
    expect(screen.getByRole('heading')).toHaveTextContent('Build. Transform.');
    expect(screen.queryByRole('button', { name: 'Pause slideshow' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show slide 4: Built around you' }));
    expect(screen.getByRole('heading')).toHaveTextContent('Built around you.');
  } finally {
    window.matchMedia = original;
  }
});
