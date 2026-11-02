import { fireEvent, render, screen, act } from '@testing-library/react';
import VerificationCodePage from './VerificationCodePage';

const originalClipboard = navigator.clipboard;
afterEach(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard }); jest.useRealTimers(); window.history.replaceState({}, '', '/'); });

function codeLink(milliseconds = 60000) {
  return '#'+new URLSearchParams({ code: '123456', expires: new Date(Date.now() + milliseconds).toISOString() });
}

test('copies the exact code and removes it from the address bar', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const fragment = codeLink();
  window.history.replaceState({}, '', '/verification-code'+fragment);
  render(<VerificationCodePage fragment={fragment} />);
  expect(window.location.hash).toBe('');
  expect(screen.getByLabelText('Verification code')).toHaveTextContent('123456');
  fireEvent.click(screen.getByRole('button', { name: 'Copy Code' }));
  await screen.findByRole('status');
  expect(writeText).toHaveBeenCalledWith('123456');
});

test('expired codes are hidden and cannot be copied', () => {
  render(<VerificationCodePage fragment={codeLink(-1000)} />);
  expect(screen.getByRole('heading', { name: 'This code has expired' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Copy Code' })).not.toBeInTheDocument();
  expect(screen.queryByText('123456')).not.toBeInTheDocument();
});

test('the copy page expires while open', () => {
  jest.useFakeTimers();
  render(<VerificationCodePage fragment={codeLink(1000)} />);
  expect(screen.getByRole('button', { name: 'Copy Code' })).toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(1001); });
  expect(screen.getByRole('heading', { name: 'This code has expired' })).toBeInTheDocument();
});

test('blocked clipboard access selects the code for manual copying', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('blocked')) } });
  render(<VerificationCodePage fragment={codeLink()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy Code' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('code is selected');
  expect(window.getSelection().toString()).toBe('123456');
});
