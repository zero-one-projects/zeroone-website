import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuotationListPanel from './QuotationListPanel';
import QuotationsPanel from './QuotationsPanel';
import { newQuotation } from '../utils/quotation';

const originalFetch = global.fetch;
const originalClipboard = navigator.clipboard;
const sample = { id: 45, reference: 'ZO-2026-00045', document: { ...newQuotation(), clientName: 'Example client', title: 'Business website', total: 15000 }, sharePath: null, expiresAt: '2099-01-01T16:00:00Z' };
afterEach(() => { global.fetch = originalFetch; window.history.replaceState({}, '', '/'); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard }); });

test('list shows saved quotation details and opens the selected document', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [sample], total: 1 }) }));
  render(<QuotationListPanel token="test-session" />);
  expect(await screen.findByText('Example client')).toBeInTheDocument();
  expect(screen.getByText('Business website')).toBeInTheDocument();
  expect(screen.getByText('Not shared')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open ZO-2026-00045' })).toHaveAttribute('href', '/admin/quotations?id=45');
});

test('search requests the matching server results and supports paging', async () => {
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => ({ quotations: [sample], total: url.includes('search=missing') ? 0 : 25 }) }));
  render(<QuotationListPanel token="test-session" />);
  await screen.findByText('Example client');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=2'), expect.anything()));
  await screen.findByText('Example client');
  fireEvent.change(screen.getByLabelText('Search quotations'), { target: { value: 'Example client' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=1&search=Example+client'), expect.anything()));
});

test('editor loads a quotation directly by its ID, even outside the first saved page', async () => {
  window.history.replaceState({}, '', '/admin/quotations?id=45');
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.endsWith('/45') ? { quotation: sample } : { quotations: [], total: 0 } }));
  render(<QuotationsPanel token="test-session" />);
  await waitFor(() => expect(screen.getByLabelText('Client / company name')).toHaveValue('Example client'));
  expect(screen.getByLabelText('Project / quotation title')).toHaveValue('Business website');
  fireEvent.click(screen.getByRole('button', { name: 'New Quotation' }));
  expect(window.location.search).toBe('');
  expect(screen.getByLabelText('Client / company name')).toHaveValue('');
});

test('list copies the existing saved link without generating a different token', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [{ ...sample, sharePath: '/quotation/original-link' }], total: 1 }) }));
  render(<QuotationListPanel token="test-session" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Copy link for ZO-2026-00045' }));
  await screen.findByText('Client link copied for ZO-2026-00045.');
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/quotation/original-link`);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('blocked clipboard access opens a popup for manual copying', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('blocked')) } });
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [{ ...sample, sharePath: '/quotation/original-link' }], total: 1 }) }));
  render(<QuotationListPanel token="test-session" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Copy link for ZO-2026-00045' }));
  expect(await screen.findByRole('dialog', { name: 'Your client link is ready' })).toBeInTheDocument();
  expect(screen.getByLabelText('Client quotation link')).toHaveValue(`${window.location.origin}/quotation/original-link`);
});

test('quotation tabs keep the in-progress draft while browsing the full list', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], total: 0 }) }));
  render(<QuotationsPanel token="test-session" />);
  expect(screen.getByRole('tab', { name: 'Create Quotation' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.change(screen.getByLabelText('Project / quotation title'), { target: { value: 'Unsaved website draft' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Quotation List' }));
  expect(await screen.findByLabelText('Search quotations')).toBeInTheDocument();
  await screen.findByText('No saved quotations yet. Create your first quotation to get started.');
  expect(screen.queryByLabelText('Project / quotation title')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Create Quotation' }));
  expect(screen.getByLabelText('Project / quotation title')).toHaveValue('Unsaved website draft');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Create Quotation' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Quotation List' })).toHaveAttribute('aria-selected', 'true');
  await screen.findByText('No saved quotations yet. Create your first quotation to get started.');
});

test('icon actions support selecting all rows and deleting the group with one emailed code', async () => {
  const second = { ...sample, id: 46, reference: 'ZO-2026-00046' };
  let deleted = false;
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith('/bulk-delete-verification')) return { ok: true, json: async () => ({ challengeId: 'bulk-challenge' }) };
    if (url.endsWith('/bulk-delete')) { deleted = true; return { ok: true, json: async () => ({ message: 'Deleted' }) }; }
    return { ok: true, json: async () => ({ quotations: deleted ? [] : [sample, second], total: deleted ? 0 : 2 }) };
  });
  render(<QuotationListPanel token="test-session" />);
  await screen.findByRole('link', { name: 'Open ZO-2026-00045' });
  expect(screen.getByRole('link', { name: 'Open ZO-2026-00045' })).toHaveTextContent('');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select ZO-2026-00045' }));
  expect(screen.getByRole('checkbox', { name: 'Select all quotations on this page' }).indeterminate).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all quotations on this page' }));
  expect(screen.getByRole('checkbox', { name: 'Select ZO-2026-00046' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Delete selected (2)' }));
  expect(screen.getByRole('dialog', { name: 'Delete 2 quotations?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send Deletion Code' }));
  fireEvent.change(await screen.findByLabelText('Deletion verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));
  await screen.findByText('2 quotations deleted. Client links are no longer available.');
  await screen.findByText('No saved quotations yet. Create your first quotation to get started.');
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/bulk-delete'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ ids: [45, 46], challengeId: 'bulk-challenge', code: '123456' }) }));
});
