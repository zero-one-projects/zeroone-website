import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClientRecordsPanel from './ClientRecordsPanel';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });
const client = { id: 'record-id', clientName: 'Example Client', clientEmail: 'client@example.test', quotationCount: 1, acceptedCount: 1, signedCount: 1, latestProject: 'Custom platform' };
test('client record opens linked quotations and billing and offers only the requested types', async () => {
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes('/record-id?') ? { client: { ...client, quotations: [{ id: 7, reference: 'ZO-2026-00007', title: 'Custom platform', total: 5000, recurringTotal: 1500, currency: 'PHP', response: { action: 'accept', current: true, signedAt: '2026-10-27' } }] }, statements: [{ id: 1, reference: 'BILL-2026-00001', period: '2026-10', document: { total: 1500, currency: 'PHP', dueOn: '2026-10-31' } }] } : { clients: [client], total: 1 } }));
  render(<ClientRecordsPanel token="test-admin" />);
  expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Custom Subscriptions', 'Custom One-time Payment']);
  fireEvent.click(await screen.findByRole('button', { name: 'View record for Example Client' }));
  expect(await screen.findByText('Contract signed')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Quotation' })).toHaveAttribute('href', '/admin/quotations?id=7');
  expect(screen.getByRole('link', { name: 'Generate Billing' })).toHaveAttribute('href', '/admin/billing');
  expect(screen.getByText('BILL-2026-00001')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Custom One-time Payment' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=project'), expect.anything()));
  expect(screen.queryByText('Billing history')).not.toBeInTheDocument();
});
test('empty client records explain where records come from and search is supported', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ clients: [], total: 0 }) }));
  render(<ClientRecordsPanel token="test-admin" />);
  expect(await screen.findByText(/No custom subscription client records found/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search clients'), { target: { value: 'Example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('search=Example'), expect.anything()));
});
test('expired session requests login instead of displaying an empty directory', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
  render(<ClientRecordsPanel token="expired" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Your admin session has expired');
  expect(screen.getByRole('link', { name: 'Sign in again' })).toBeInTheDocument();
  expect(screen.queryByText(/No custom subscription client records/)).not.toBeInTheDocument();
});

test('adds a client directly and opens the saved record without requiring a quotation', async () => {
  HTMLDialogElement.prototype.showModal = jest.fn(function () { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = jest.fn(function () { this.removeAttribute('open'); });
  let saved;
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'POST') {
      saved = { ...JSON.parse(options.body), id: 'new-client', quotations: [] };
      return { ok: true, json: async () => ({ client: saved, message: 'Client added successfully.' }) };
    }
    return { ok: true, json: async () => url.includes('/new-client?') ? { client: saved, statements: [] } : { clients: [], total: 0 } };
  });
  render(<ClientRecordsPanel token="test-admin" initialAdd />);
  expect(screen.getByLabelText('Payment type')).toHaveValue('subscription');
  fireEvent.change(screen.getByLabelText('Client / company name'), { target: { value: 'New company' } });
  fireEvent.change(screen.getByLabelText('Client email'), { target: { value: 'client@example.com' } });
  fireEvent.change(screen.getByLabelText('Contact person (optional)'), { target: { value: 'Client Person' } });
  fireEvent.change(screen.getByLabelText('Client address (optional)'), { target: { value: 'Makati City' } });
  fireEvent.change(screen.getByLabelText('Payment type'), { target: { value: 'project' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Client' }));
  expect(await screen.findByRole('heading', { name: 'New company' })).toBeInTheDocument();
  expect(screen.getByText('Client added successfully.')).toBeInTheDocument();
  expect(screen.getByText('No quotations linked yet.')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Custom One-time Payment' })).toHaveAttribute('aria-selected', 'true');
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/admin\/clients$/), expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer test-admin', 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'project', clientName: 'New company', clientEmail: 'client@example.com', contactPerson: 'Client Person', clientAddress: 'Makati City', isActive: true }) }));
});

test('duplicate client errors keep the add form and entered details available', async () => {
  HTMLDialogElement.prototype.showModal = jest.fn(function () { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = jest.fn(function () { this.removeAttribute('open'); });
  global.fetch = jest.fn(async (url, options = {}) => options.method === 'POST' ? { ok: false, status: 409, json: async () => ({ message: 'This client already exists for the selected payment type.' }) } : { ok: true, json: async () => ({ clients: [], total: 0 }) });
  render(<ClientRecordsPanel token="test-admin" initialAdd />);
  fireEvent.change(screen.getByLabelText('Client / company name'), { target: { value: 'Existing company' } });
  fireEvent.change(screen.getByLabelText('Client email'), { target: { value: 'client@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Client' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('This client already exists');
  expect(screen.getByLabelText('Client / company name')).toHaveValue('Existing company');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('Client Records searches and filters by status without an Add Client button', async () => {
  let active = true;
  const record = () => ({ ...client, isActive: active, quotations: [] });
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'PATCH') { active = JSON.parse(options.body).isActive; return { ok: true, json: async () => ({ client: record(), message: 'Client marked Inactive.' }) }; }
    if (url.includes('/record-id?')) return { ok: true, json: async () => ({ client: record(), statements: [] }) };
    const status = new URL(url, 'http://localhost').searchParams.get('status');
    const matches = status === 'all' || (status === 'active') === active;
    return { ok: true, json: async () => ({ clients: matches ? [record()] : [], total: matches ? 1 : 0 }) };
  });
  render(<ClientRecordsPanel token="test-admin" />);
  expect(screen.queryByRole('button', { name: /Add Client/ })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Client status')).toHaveValue('active');
  fireEvent.click(await screen.findByRole('button', { name: 'View record for Example Client' }));
  expect(await screen.findByRole('button', { name: 'Deactivate Client' })).toBeInTheDocument();
  expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate Client' }));
  await screen.findByRole('button', { name: 'Reactivate Client' });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/clients/record-id/status'), expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ type: 'subscription', isActive: false }) }));
  fireEvent.change(screen.getByLabelText('Client status'), { target: { value: 'inactive' } });
  await screen.findByRole('button', { name: 'View record for Example Client' });
  expect(screen.getByText('Inactive', { selector: 'span' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search clients'), { target: { value: 'Example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('search=Example&status=inactive'), expect.anything()));
});

test('clients can be deactivated and reactivated directly from the directory', async () => {
  let active = true;
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'PATCH') {
      active = JSON.parse(options.body).isActive;
      return { ok: true, json: async () => ({ client: { ...client, isActive: active }, message: active ? 'Client reactivated.' : 'Client deactivated.' }) };
    }
    const status = new URL(url, 'http://localhost').searchParams.get('status');
    const matches = status === 'all' || (status === 'active') === active;
    return { ok: true, json: async () => ({ clients: matches ? [{ ...client, isActive: active }] : [], total: matches ? 1 : 0 }) };
  });
  render(<ClientRecordsPanel token="test-admin" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Deactivate Example Client' }));
  await screen.findByText('Client deactivated.');
  await screen.findByText(/No custom subscription client records found/);
  expect(screen.queryByRole('button', { name: 'View record for Example Client' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Client status'), { target: { value: 'inactive' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Reactivate Example Client' }));
  await screen.findByText('Client reactivated.');
  fireEvent.change(screen.getByLabelText('Client status'), { target: { value: 'active' } });
  expect(await screen.findByRole('button', { name: 'Deactivate Example Client' })).toBeInTheDocument();
});
