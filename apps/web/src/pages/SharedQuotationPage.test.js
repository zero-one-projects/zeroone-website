import { render, screen, act } from '@testing-library/react';
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
  expect(screen.getByRole('button', { name: 'Print / Save PDF' })).toBeInTheDocument();
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
