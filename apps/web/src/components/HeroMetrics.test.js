import { act, render, screen } from '@testing-library/react';
import { HeroMetrics } from './HeroSection';

test('counts up when the number strip enters view and replays after leaving', () => {
  const originalObserver = window.IntersectionObserver;
  let intersect;
  let tick;
  const observe = jest.fn();
  window.IntersectionObserver = jest.fn(callback => {
    intersect = callback;
    return { observe, disconnect: jest.fn() };
  });
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    tick = callback;
    return 1;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  try {
    const { unmount } = render(<HeroMetrics stats={[]} projectCounters={[{ value: '52', label: 'Completed projects' }]} />);
    const number = screen.getByLabelText('52+');
    expect(observe.mock.calls[0][0]).toHaveClass('counter-strip');
    expect(number).toHaveTextContent('00+');
    act(() => intersect([{ isIntersecting: true, intersectionRatio: 0.6 }]));
    act(() => tick(0));
    act(() => tick(800));
    expect(number).toHaveTextContent('46+');
    act(() => tick(1600));
    expect(number).toHaveTextContent('52+');
    act(() => intersect([{ isIntersecting: false, intersectionRatio: 0 }]));
    expect(number).toHaveTextContent('00+');
    act(() => intersect([{ isIntersecting: true, intersectionRatio: 0.6 }]));
    act(() => tick(2000));
    act(() => tick(3600));
    expect(number).toHaveTextContent('52+');
    unmount();
  } finally {
    window.IntersectionObserver = originalObserver;
    jest.restoreAllMocks();
  }
});
