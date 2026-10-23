import { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import useScrollReveal from './useScrollReveal';

function Example() {
  const ref = useRef(null);
  useScrollReveal(ref);
  return <section ref={ref} data-testid="reveal"><h2 data-scroll-reveal-block="true"><span className="scroll-reveal-content">About Us</span></h2></section>;
}

test('reveals text with scroll position, reverses on scroll back, and respects motion changes', () => {
  const originalMatchMedia = window.matchMedia;
  let onMotionChange;
  const motion = {
    matches: true,
    addEventListener: jest.fn((event, callback) => { onMotionChange = callback; }),
    removeEventListener: jest.fn(),
  };
  window.matchMedia = jest.fn(() => motion);
  let update;
  const frames = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { update = callback; return 1; });
  let top = window.innerHeight;
  const positions = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ top }));
  let view;
  try {
    view = render(<Example />);
    act(() => update());
    const section = screen.getByTestId('reveal');
    const heading = screen.getByRole('heading', { name: 'About Us' });
    expect(section).toHaveAttribute('data-scroll-reveal', 'true');
    expect(heading.style.getPropertyValue('--reveal-progress')).toBe('0.0000');
    top = window.innerHeight * 0.4;
    fireEvent.scroll(window);
    act(() => update());
    expect(heading.style.getPropertyValue('--reveal-progress')).toBe('1.0000');
    top = window.innerHeight;
    fireEvent.scroll(window);
    act(() => update());
    expect(heading.style.getPropertyValue('--reveal-progress')).toBe('0.0000');
    motion.matches = false;
    act(() => { onMotionChange(); update(); });
    expect(section).not.toHaveAttribute('data-scroll-reveal');
    expect(heading.style.getPropertyValue('--reveal-progress')).toBe('');
    view.unmount();
    const calls = frames.mock.calls.length;
    fireEvent.scroll(window);
    expect(frames).toHaveBeenCalledTimes(calls);
    expect(motion.removeEventListener).toHaveBeenCalledWith('change', onMotionChange);
  } finally {
    view?.unmount();
    frames.mockRestore();
    positions.mockRestore();
    window.matchMedia = originalMatchMedia;
  }
});

test('keeps text readable when motion preference detection is unavailable', () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = undefined;
  try {
    render(<Example />);
    expect(screen.getByRole('heading', { name: 'About Us' })).toBeInTheDocument();
    expect(screen.getByTestId('reveal')).not.toHaveAttribute('data-scroll-reveal');
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});
