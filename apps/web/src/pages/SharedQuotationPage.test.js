import { render, screen, act, fireEvent } from '@testing-library/react';
import SharedQuotationPage from './SharedQuotationPage';
import { newQuotation } from '../utils/quotation';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test('new quotations default to fifteen days', () => {
  const document = newQuotation();
  const start = Date.parse(document.issuedOn);
  expect(Date.parse(document.validUntil) - start).toBe(15 * 86400000);
});

test('client can view a shared quotation without an admin session', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({
    quotation: { reference: 'ZO-2026-00001', document: { ...newQuotation(), clientName: 'Example client' } },
    expiresAt: new Date(Date.now() + 60000).toISOString()
  }) }));
  render(<SharedQuotationPage token="client-token" />);
  expect(await screen.findByRole('region', { name: 'Quotation preview' })).toHaveTextContent('Example client');
  expect(screen.getByRole('button', { name: 'Download Quotation' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/quotations/client-token'), expect.not.objectContaining({ headers: expect.anything() }));
});

test('expired link displays its message without revealing quotation content', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({ message: 'This quotation has expired.' }) }));
  render(<SharedQuotationPage token="expired-token" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('This quotation has expired.');
  expect(screen.queryByRole('region', { name: 'Quotation preview' })).not.toBeInTheDocument();
});

test('an already open client page hides the document when it expires', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({
    quotation: { reference: 'ZO-2026-00001', document: newQuotation() },
    expiresAt: new Date(Date.now() + 1000).toISOString()
  }) }));
  render(<SharedQuotationPage token="expiring-token" />);
  await screen.findByRole('region', { name: 'Quotation preview' });
  act(() => { jest.advanceTimersByTime(1001); });
  expect(screen.queryByRole('region', { name: 'Quotation preview' })).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('expired');
});


test('successful requote hides the inactive quotation and confirms a replacement link will follow', async () => {
  const quotation = { reference: 'ZO-2026-00024', documentVersion: 'version', document: { ...newQuotation(), title: 'Project', clientName: 'Client', clientEmail: 'client@example.com' } };
  global.fetch = jest.fn(async (url, options = {}) => ({ ok: true, json: async () => options.method === 'POST' ? url.endsWith('/verification') ? { challengeId: 'challenge', message: 'Verification code sent.' } : { quotation: { ...quotation, clientResponse: { action: 'requote', current: true } } } : { quotation, expiresAt: '2099-01-01T00:00:00Z' } }));
  render(<SharedQuotationPage token="requote-token" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Request a Revision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('What would you like changed or added?'), { target: { value: 'Add online ordering.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Request a Revision' }));
  expect(await screen.findByRole('dialog', { name: 'Request a revised quotation?' })).toHaveTextContent('link will no longer be available');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm & Send Request' }));
  expect(await screen.findByRole('heading', { name: 'Revision requested' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('This quotation link is now inactive');
  expect(screen.queryByRole('region', { name: 'Quotation preview' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Download Quotation' })).not.toBeInTheDocument();
});

test.each(['quotation_only', 'full'])('decide later hides the quotation and controls without submitting in %s mode', async clientFlow => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotation: { document: { ...newQuotation(), clientName: 'Client', clientFlow }, documentVersion: 'version' }, expiresAt: '2099-01-01T00:00:00Z' }) }));
  render(<SharedQuotationPage token="client-token" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Decide Later' }));
  expect(screen.getByRole('heading', { name: 'No Response Submitted' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('You may return to this page anytime before the quotation expires');
  expect(screen.getByRole('link', { name: 'sales@zerooneitinc.com' })).toHaveAttribute('href', 'mailto:sales@zerooneitinc.com');
  expect(screen.getByRole('status')).toHaveTextContent('We look forward to working with you!');
  expect(screen.getByRole('status')).toHaveTextContent('No response has been submitted yet.');
  expect(screen.queryByRole('region', { name: 'Quotation preview' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Respond to quotation' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
