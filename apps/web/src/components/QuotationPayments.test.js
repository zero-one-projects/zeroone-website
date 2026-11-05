import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuotationPayments from './QuotationPayments';
const originalFetch = global.fetch;
const originalCrypto = window.crypto;
const quotation = { id: 42, reference: 'POS-42', documentVersion: 'signed-version', document: { currency: 'PHP' }, contractState: { clientSignedAt: '2026-11-05T00:00:00Z' } };
let uuid;
beforeEach(() => {
  uuid = 0;
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => `12345678-1234-4234-8234-${String(++uuid).padStart(12, '0')}` } });
});
afterEach(() => { global.fetch = originalFetch; Object.defineProperty(window, 'crypto', { configurable: true, value: originalCrypto }); });
function completeDetails() {
  fireEvent.change(screen.getByLabelText('Payment date'), { target: { value: '2026-01-05' } });
  fireEvent.change(screen.getByLabelText('Amount received (PHP)'), { target: { value: '1500.50' } });
  fireEvent.change(screen.getByLabelText('Reference number'), { target: { value: ' BANK-REFERENCE ' } });
  fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'bank_transfer' } });
}

test('payment stays unpaid until the administrator records a verified payment with all details', async () => {
  let payment;
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'POST') {
      payment = { ...JSON.parse(options.body), id: 'payment-1', currency: 'PHP', status: 'paid', source: 'manual', verifiedBy: { name: 'Authorized Administrator' }, verifiedAt: '2026-01-05T01:00:00Z' };
      return { ok: true, json: async () => ({ payment, payments: [payment], paymentStatus: 'paid' }) };
    }
    return { ok: true, json: async () => ({ payments: payment ? [payment] : [], paymentStatus: payment ? 'paid' : 'unpaid' }) };
  });
  const submit = jest.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><QuotationPayments token="admin-token" quotation={quotation} /></form>);
  expect(await screen.findByText('Unpaid')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Verify Payment' }));
  expect(screen.getByLabelText('Reference number')).toHaveAttribute('maxLength', '180');
  completeDetails();
  expect(screen.getByText('Unpaid')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Payment Verification' }));
  expect(await screen.findByText('Payment verified and recorded.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Paid')).toBeInTheDocument());
  expect(screen.getByText(/Verified by Authorized Administrator/)).toBeInTheDocument();
  expect(screen.getByText(/Reference:/)).toHaveTextContent('BANK-REFERENCE');
  const request = global.fetch.mock.calls.find(([, options]) => options.method === 'POST');
  expect(request[0]).toMatch(/\/quotations\/42\/verify-payment$/);
  expect(JSON.parse(request[1].body)).toEqual({ documentHash: 'signed-version', paymentDate: '2026-01-05', amount: 1500.5, referenceNumber: 'BANK-REFERENCE', paymentMethod: 'bank_transfer', idempotencyKey: expect.any(String), note: '' });
  expect(submit).not.toHaveBeenCalled();
});

test('invalid payment details cannot mark paid and a failed request can be safely retried with its original key', async () => {
  global.fetch = jest.fn(async (url, options = {}) => options.method === 'POST'
    ? { ok: false, json: async () => ({ message: 'Payment could not be verified.' }) }
    : { ok: true, json: async () => ({ payments: [], paymentStatus: 'unpaid' }) });
  render(<QuotationPayments token="admin-token" quotation={quotation} />);
  await screen.findByText('Unpaid');
  fireEvent.click(screen.getByRole('button', { name: 'Verify Payment' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Payment Verification' }));
  expect(screen.getByRole('alert')).toHaveTextContent('positive payment amount');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  completeDetails();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Payment Verification' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Payment could not be verified.');
  expect(screen.getByText('Unpaid')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Payment Verification' }));
  await waitFor(() => expect(global.fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(2));
  const attempts = global.fetch.mock.calls.filter(([, options]) => options.method === 'POST');
  expect(attempts[0][1].body).toEqual(attempts[1][1].body);
});

test('unsigned agreements cannot receive a verified payment record', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ payments: [], paymentStatus: 'unpaid' }) }));
  render(<QuotationPayments token="admin-token" quotation={{ ...quotation, contractState: {} }} />);
  await screen.findByText('Unpaid');
  expect(screen.getByRole('button', { name: 'Verify Payment' })).toBeDisabled();
});

test('changing the selected quotation or signed version discards a previous payment draft', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ payments: [], paymentStatus: 'unpaid' }) }));
  const { rerender } = render(<QuotationPayments token="admin-token" quotation={quotation} />);
  await screen.findByText('Unpaid');
  fireEvent.click(screen.getByRole('button', { name: 'Verify Payment' }));
  completeDetails();
  rerender(<QuotationPayments token="admin-token" quotation={{ ...quotation, id: 43 }} />);
  expect(screen.queryByRole('group', { name: 'Verify payment details' })).not.toBeInTheDocument();
  await screen.findByText('Unpaid');
  fireEvent.click(screen.getByRole('button', { name: 'Verify Payment' }));
  expect(screen.getByLabelText('Reference number')).toHaveValue('');
  completeDetails();
  rerender(<QuotationPayments token="admin-token" quotation={{ ...quotation, id: 43, documentVersion: 'later-signed-version' }} />);
  expect(screen.queryByRole('group', { name: 'Verify payment details' })).not.toBeInTheDocument();
  await screen.findByText('Unpaid');
});
