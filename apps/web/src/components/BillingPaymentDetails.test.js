import { fireEvent, render, screen } from '@testing-library/react';
import BillingPaymentDetails from './BillingPaymentDetails';

const originalClipboard = navigator.clipboard;
afterEach(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard }); jest.restoreAllMocks(); });

test('blocked copying provides a selected field for manual copying', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('blocked')) } });
  render(<BillingPaymentDetails instructions={'Account number: 310-19-000104-1\nSwift code: AUBKPHMM'} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy account number' }));
  const input = await screen.findByLabelText('Account number to copy');
  expect(input).toHaveValue('310-19-000104-1');
  expect(input).toHaveFocus();
  expect(input.selectionStart).toBe(0);
  expect(input.selectionEnd).toBe(input.value.length);
  expect(screen.getByRole('status')).toHaveTextContent('Command+C');
});
