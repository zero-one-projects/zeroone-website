import { fireEvent, render, screen } from '@testing-library/react';
import QuotationPaymentProofs from './QuotationPaymentProofs';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test('staff records a separate payment review without submitting or changing the surrounding quotation form', async () => {
  let proof = { id: 'proof-id', documentHash: 'signed-version', amountPaid: 1000, currency: 'PHP', paidOn: '2026-11-05', transactionReference: 'TEST-REF', clientName: 'Example Client', clientEmail: 'client@example.com', submittedAt: '2026-11-05T00:00:00Z', status: 'pending_verification' };
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'POST') proof = { ...proof, status: 'verified', verification: { name: 'Authorized Staff', reviewedAt: '2026-11-05T01:00:00Z', confirmedAmount: 950, note: 'Receipt checked' } };
    return { ok: true, json: async () => options.method === 'POST' ? { proof } : { proofs: [proof] } };
  });
  const submit = jest.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><QuotationPaymentProofs token="admin-token" quotationId={42} /></form>);
  fireEvent.click(await screen.findByRole('button', { name: 'Review Receipt' }));
  fireEvent.change(screen.getByLabelText('Confirmed amount received'), { target: { value: '950' } });
  fireEvent.change(screen.getByLabelText('Review note'), { target: { value: 'Receipt checked' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Receipt Review' }));
  expect(await screen.findByText(/Receipt reviewed/)).toBeInTheDocument();
  expect(screen.getByText(/Confirmed amount received:/)).toHaveTextContent('950');
  expect(screen.getByText(/Reviewed by Authorized Staff/)).toBeInTheDocument();
  expect(submit).not.toHaveBeenCalled();
  const request = global.fetch.mock.calls.find(([, options]) => options.method === 'POST');
  expect(JSON.parse(request[1].body)).toMatchObject({ documentHash: 'signed-version', status: 'verified', confirmedAmount: '950', note: 'Receipt checked' });
});
