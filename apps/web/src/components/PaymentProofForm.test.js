import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaymentProofForm from './PaymentProofForm';
const originalFetch = global.fetch;
const quotation = { reference: 'ZO-2026-00024', documentVersion: 'version', document: { currency: 'PHP', total: 30000, initialPaymentPercent: 50, clientEmail: 'client@example.com' } };
const session = { challengeId: 'challenge', verificationProof: 'verified-proof' };
beforeAll(() => { Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => '12345678-1234-4234-8234-123456789012' } }); });
afterEach(() => { global.fetch = originalFetch; });

test('uploads a receipt with the verified session and payment details and reports pending verification', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ proof: { id: 'proof-reference' } }) }));
  render(<PaymentProofForm quotation={quotation} token="link" session={session} onClose={jest.fn()} />);
  expect(screen.getByLabelText('Amount paid (PHP)')).toHaveValue(15000);
  fireEvent.change(screen.getByLabelText('Transaction reference'), { target: { value: 'BANK-123' } });
  fireEvent.change(screen.getByLabelText(/Receipt or payment confirmation/), { target: { files: [new File(['receipt'], 'receipt.png', { type: 'image/png' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Proof to Sales & Billing' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Payment remains subject to verification');
  const body = global.fetch.mock.calls[0][1].body;
  expect(body).toBeInstanceOf(FormData);
  expect(body.get('verificationProof')).toBe('verified-proof');
  expect(body.get('amountPaid')).toBe('15000');
  expect(body.get('transactionReference')).toBe('BANK-123');
  expect(body.get('proof').name).toBe('receipt.png');
});

test('returning clients verify their signing email before uploading proof', async () => {
  const onVerified = jest.fn();
  global.fetch = jest.fn(async url => ({ ok: true, json: async () => url.endsWith('/verification') ? { challengeId: 'challenge' } : { signingSession: session } }));
  render(<PaymentProofForm quotation={quotation} token="link" onVerified={onVerified} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  fireEvent.change(await screen.findByLabelText('Payment verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify Email' }));
  await waitFor(() => expect(onVerified).toHaveBeenCalledWith(session));
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ action: 'payment', email: 'client@example.com', documentVersion: 'version' });
});
