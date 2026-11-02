import { render, screen } from '@testing-library/react';
import QuotationHistory from './QuotationHistory';

afterEach(() => { jest.restoreAllMocks(); });

test('shows previous client comments and the quotation they responded to', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ history: [{ action: 'requote', name: 'Client', email: 'client@example.com', note: 'Please reduce the scope.', documentHash: 'old', respondedAt: '2026-10-25T10:00:00Z', document: { title: 'Original website', total: 5000, currency: 'PHP', items: [{ description: 'Website', quantity: 1, unitPrice: 5000, scope: [{ title: 'Pages', details: 'Five pages' }] }] } }] }) });
  render(<QuotationHistory token="admin-token" quotationId={3} />);
  expect(await screen.findByText('Requote requested')).toBeInTheDocument();
  expect(screen.getByText('Please reduce the scope.')).toBeInTheDocument();
  expect(screen.getByText('Original website')).toBeInTheDocument();
  expect(screen.getByText('Pages')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/admin/quotations/3/history'), expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }));
});

test('explains when the quotation has no responses yet', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ history: [] }) });
  render(<QuotationHistory token="admin-token" quotationId={3} />);
  expect(await screen.findByText('No client responses yet.')).toBeInTheDocument();
});
