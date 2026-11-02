import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuotationNotifications from './QuotationNotifications';
const originalFetch = global.fetch;
const rows = [
  { id: 8, quotationId: 4, reference: 'ZO-2026-00004', action: 'accept', title: 'Website', clientName: 'Example Client', respondedAt: '2026-11-03T01:00:00Z', isRead: false, href: '/admin/quotations?id=4' },
  { id: 7, quotationId: 3, reference: 'ZO-2026-00003', action: 'requote', title: 'POS', clientName: 'Other Client', note: 'Please add a report.', respondedAt: '2026-11-03T00:00:00Z', isRead: false, href: '/admin/quotations?id=3' }
];
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test('shows response notifications and persists per-item and mark-all read actions', async () => {
  let data = rows.map(row => ({ ...row }));
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'POST') data = data.map(row => url.endsWith('/read-all') || url.endsWith(`/${row.id}/read`) ? { ...row, isRead: true } : row);
    return { ok: true, json: async () => ({ notifications: data, unreadCount: data.filter(row => !row.isRead).length }) };
  });
  render(<QuotationNotifications token="admin-token" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }));
  expect(screen.getByText('Quotation accepted')).toBeInTheDocument();
  expect(screen.getByText('Requote requested')).toBeInTheDocument();
  expect(screen.getByText('Please add a report.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Quotation accepted/ })).toHaveAttribute('href', '/admin/quotations?id=4');
  fireEvent.click(screen.getByRole('button', { name: 'Mark as read ZO-2026-00004' }));
  await screen.findByRole('button', { name: 'Notifications, 1 unread' });
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/8/read'), expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer admin-token' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
  await screen.findByRole('button', { name: 'Notifications, 0 unread' });
  expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Quotation notifications' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).toHaveFocus();
});

test('polls for new responses without reloading and cancels the timer on unmount', async () => {
  jest.useFakeTimers();
  let hasResponse = false;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ notifications: hasResponse ? rows : [], unreadCount: hasResponse ? 2 : 0 }) }));
  const view = render(<QuotationNotifications token="admin-token" />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  hasResponse = true;
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(await screen.findByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
  view.unmount();
  const count = global.fetch.mock.calls.length;
  act(() => { jest.advanceTimersByTime(60000); });
  expect(global.fetch).toHaveBeenCalledTimes(count);
});

test('shows failures with retry and leaves unread status intact when marking fails', async () => {
  let fail = true;
  global.fetch = jest.fn(async (_, options = {}) => ({ ok: !fail && options.method !== 'POST', json: async () => fail ? { message: 'Notifications unavailable.' } : options.method === 'POST' ? { message: 'Unable to save read status.' } : { notifications: rows, unreadCount: 2 } }));
  render(<QuotationNotifications token="admin-token" />);
  fireEvent.click(screen.getByRole('button', { name: 'Notifications, 0 unread' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Notifications unavailable.');
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('button', { name: 'Notifications, 2 unread' });
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save read status.');
  expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
});
