import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BillingPanel from './BillingPanel';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });
const subscription = { id: 7, reference: 'ZO-2026-00007', clientName: 'Example Client', title: 'Custom platform', clientEmail: 'client@example.test', currency: 'PHP', recurringTotal: 1500, goLiveOn: '2026-01-01' };
test('monthly billing saves selected dates and client, then offers PDF download', async () => {
  let bill;
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  URL.createObjectURL = jest.fn(() => 'blob:bill'); URL.revokeObjectURL = jest.fn();
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith('/pdf')) return { ok: true, blob: async () => new Blob(['%PDF']) };
    if (options.method === 'POST') { bill = { id: 1, reference: 'BILL-2026-00001', period: '2026-10', document: { ...subscription, total: 1500, dueOn: '2026-10-31' } }; return { ok: true, json: async () => ({ statement: bill, message: 'Billing statement saved.' }) }; }
    return { ok: true, json: async () => url.endsWith('/subscriptions') ? { subscriptions: [subscription] } : { statements: bill ? [bill] : [], total: bill ? 1 : 0 } };
  });
  render(<BillingPanel token="test-admin" />);
  fireEvent.change(screen.getByLabelText('Billing type'), { target: { value: 'subscription' } });
  await screen.findByText('No billing statements found.');
  fireEvent.change(screen.getByLabelText('Subscription client'), { target: { value: '7' } });
  expect(screen.getByLabelText('System go-live date')).toHaveValue('2026-01-01');
  expect(screen.getByLabelText('System go-live date')).toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('Billing month'), { target: { value: '2026-10' } });
  fireEvent.change(screen.getByLabelText('Payment due date'), { target: { value: '2026-10-31' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Billing' }));
  expect(await screen.findByText('Billing statement saved.')).toBeInTheDocument();
  const sent = JSON.parse(fetch.mock.calls.find(([, options]) => options.method === 'POST')[1].body);
  expect(sent).toMatchObject({ quotationId: '7', period: '2026-10', goLiveOn: '2026-01-01', dueOn: '2026-10-31' });
  fireEvent.click(screen.getByRole('button', { name: 'Download Latest Bill' }));
  await waitFor(() => expect(click).toHaveBeenCalled());
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/billing/1/pdf'), expect.objectContaining({ headers: { Authorization: 'Bearer test-admin' } }));
});
test('billing is disabled without eligible signed subscriptions', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ subscriptions: [], statements: [], total: 0 }) }));
  render(<BillingPanel token="test-admin" />);
  fireEvent.change(screen.getByLabelText('Billing type'), { target: { value: 'subscription' } });
  expect(await screen.findByText(/No eligible subscriptions yet/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate Billing' })).toBeDisabled();
});
test('duplicate billing errors are shown without reporting a successful save', async () => {
  global.fetch = jest.fn(async (url, options = {}) => options.method === 'POST' ? { ok: false, status: 409, json: async () => ({ message: 'A bill already exists for this subscription and month.' }) } : { ok: true, json: async () => ({ subscriptions: [subscription], statements: [], total: 0 }) });
  render(<BillingPanel token="test-admin" />);
  fireEvent.change(screen.getByLabelText('Billing type'), { target: { value: 'subscription' } });
  await screen.findByText('No billing statements found.');
  fireEvent.change(screen.getByLabelText('Subscription client'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Billing' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('A bill already exists');
  expect(screen.queryByText('Download Latest Bill')).not.toBeInTheDocument();
});

test('manual billing saves client charges and creates a copyable PDF link', async () => {
  let saved;
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith('/share')) return { ok: true, json: async () => ({ statement: { ...saved, sharePath: '/api/billing/abc/pdf' } }) };
    if (options.method === 'POST') {
      const document = JSON.parse(options.body);
      saved = { id: 8, reference: 'BILL-2026-00008', period: document.period, document: { ...document, total: 5000 } };
      return { ok: true, json: async () => ({ statement: saved, message: 'Manual billing statement saved.' }) };
    }
    return { ok: true, json: async () => url.endsWith('/subscriptions') ? { subscriptions: [] } : { statements: saved ? [saved] : [], total: saved ? 1 : 0 } };
  });
  render(<BillingPanel token="test-admin" />);
  await screen.findByText('No billing statements found.');
  expect(screen.queryByLabelText('Subscription client')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Client name'), { target: { value: 'My client' } });
  fireEvent.change(screen.getByLabelText('Statement title / project'), { target: { value: 'Website payment' } });
  fireEvent.change(screen.getByLabelText('Description 1'), { target: { value: 'Development' } });
  fireEvent.change(screen.getByLabelText('Unit price 1'), { target: { value: '5000' } });
  expect(screen.getByLabelText('Billing total')).toHaveTextContent('5,000.00');
  expect(screen.queryByLabelText('Tax rate (%)')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Advance payment / deduction'), { target: { value: '500' } });
  expect(screen.getByLabelText('Billing total')).toHaveTextContent('4,500.00');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Billing' }));
  await screen.findByText('Manual billing statement saved.');
  expect(JSON.parse(fetch.mock.calls.find(([, options]) => options.method === 'POST')[1].body)).toMatchObject({ kind: 'manual', clientName: 'My client', taxTreatment: 'non_vat', advancePayment: '500', items: [{ description: 'Development', quantity: 1, unitPrice: '5000' }] });
  fireEvent.click(screen.getAllByRole('button', { name: 'Copy Client Link' })[0]);
  expect(await screen.findByLabelText('Client billing link')).toHaveValue('http://localhost/billing/abc');
  expect(screen.getByRole('link', { name: 'Open client billing' })).toHaveAttribute('href', 'http://localhost/billing/abc');
});

test('sending a saved statement reviews the client email and submits only on Send Email', async () => {
  const bill = { id: 9, reference: 'BILL-2026-00009', period: '2026-10', document: { clientName: 'Example client', clientEmail: 'client@example.com', title: 'Website', total: 100, currency: 'PHP', dueOn: '2026-11-06' } };
  HTMLDialogElement.prototype.showModal = jest.fn(function () { this.setAttribute('open', ''); }); HTMLDialogElement.prototype.close = jest.fn(function () { this.removeAttribute('open'); });
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'POST') return { ok: true, json: async () => ({ statement: { ...bill, emailSentAt: '2026-10-30T08:00:00.000Z', emailSentTo: 'client@example.com' }, message: 'Billing statement submitted to Microsoft 365.' }) };
    return { ok: true, json: async () => url.endsWith('/subscriptions') ? { subscriptions: [] } : { statements: [bill], total: 1 } };
  });
  render(<BillingPanel token="test-admin" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Send to Client' }));
  expect(screen.getByRole('dialog', { name: 'Send billing statement' })).toHaveTextContent('billing@zerooneitinc.com');
  expect(screen.getByLabelText('Client email')).toHaveValue('client@example.com');
  expect(fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Additional CC (optional)'), { target: { value: 'accounts@example.com, manager@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));
  await screen.findByText('Billing statement submitted to Microsoft 365.');
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/billing/9/send'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ recipient: 'client@example.com', cc: 'accounts@example.com, manager@example.com', note: '', previousSentAt: null }) }));
  expect(screen.queryByRole('dialog', { name: 'Send billing statement' })).not.toBeInTheDocument();
});

test('bulk billing deletion waits for an OTP and deletes only the selected statements', async () => {
  HTMLDialogElement.prototype.showModal = jest.fn(function () { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = jest.fn(function () { this.removeAttribute('open'); });
  let rows = [1, 2, 3].map(id => ({ id, reference: `BILL-TEST-${id}`, period: '2026-10', document: { clientName: `Client ${id}`, title: `Project ${id}`, total: 100, currency: 'PHP', dueOn: '2026-11-06' } }));
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith('/delete-verification')) return { ok: true, json: async () => ({ challengeId: 'billing-challenge', email: 'billing@zerooneitinc.com' }) };
    if (url.endsWith('/delete')) {
      const body = JSON.parse(options.body);
      if (body.code !== '123456') return { ok: false, json: async () => ({ message: 'Incorrect deletion code.' }) };
      rows = rows.filter(row => !body.ids.includes(row.id));
      return { ok: true, json: async () => ({ deletedIds: body.ids, message: '2 billing statements deleted.' }) };
    }
    return { ok: true, json: async () => url.endsWith('/subscriptions') ? { subscriptions: [] } : { statements: rows, total: rows.length } };
  });
  render(<BillingPanel token="test-admin" />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select BILL-TEST-1' }));
  expect(screen.getByRole('checkbox', { name: 'Select all billing statements on this page' }).indeterminate).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select BILL-TEST-2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));
  expect(screen.getByRole('dialog', { name: 'Delete 2 billing statements?' })).toHaveTextContent('billing@zerooneitinc.com');
  expect(screen.queryByRole('button', { name: 'Confirm Delete' })).not.toBeInTheDocument();
  expect(fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Send Deletion Code' }));
  await screen.findByLabelText('Deletion verification code');
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/billing/delete-verification'), expect.objectContaining({ body: JSON.stringify({ ids: [1, 2] }) }));
  fireEvent.change(screen.getByLabelText('Deletion verification code'), { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect deletion code.');
  expect(screen.getByRole('dialog', { name: 'Delete 2 billing statements?' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Deletion verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));
  await screen.findByText('2 billing statements deleted.');
  await screen.findByRole('checkbox', { name: 'Select BILL-TEST-3' });
  expect(screen.queryByRole('checkbox', { name: 'Select BILL-TEST-1' })).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: 'Select BILL-TEST-2' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete BILL-TEST-3' }));
  expect(screen.getByRole('dialog', { name: 'Delete billing statement?' })).toHaveTextContent('BILL-TEST-3');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('PDF preview offers copying the saved payment details and individual account number', async () => {
  const instructions = 'Account number: 310-19-000104-1\nSwift code: AUBKPHMM';
  const bill = { id: 10, reference: 'BILL-COPY', period: '2026-11', document: { clientName: 'Client', title: 'Website', currency: 'USD', total: 100, paymentInstructions: instructions } };
  const originalClipboard = navigator.clipboard;
  const writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  HTMLDialogElement.prototype.showModal = jest.fn(function () { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = jest.fn(function () { this.removeAttribute('open'); });
  URL.createObjectURL = jest.fn(() => 'blob:bill'); URL.revokeObjectURL = jest.fn();
  global.fetch = jest.fn(async url => url.endsWith('/pdf') ? { ok: true, blob: async () => new Blob(['%PDF']) } : { ok: true, json: async () => url.endsWith('/subscriptions') ? { subscriptions: [] } : { statements: [bill], total: 1 } });
  try {
    render(<BillingPanel token="test-admin" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Preview' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Payment details' }));
    const copyAll = await screen.findByRole('button', { name: 'Copy payment details' });
    fireEvent.click(copyAll);
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(instructions));
    fireEvent.click(screen.getByRole('button', { name: 'Copy account number' }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith('310-19-000104-1'));
    expect(await screen.findByText('Account number copied.')).toBeInTheDocument();
  } finally { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard }); }
});
