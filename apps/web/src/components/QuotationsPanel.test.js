import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QuotationsPanel from './QuotationsPanel';
import { defaultHardwareTerms, quotationTotals, newQuotation } from '../utils/quotation';
import QuotationDocument from './QuotationDocument';
import ContractDocument from './ContractDocument';

const originalFetch = global.fetch;
const originalClipboard = navigator.clipboard;
afterEach(() => { global.fetch = originalFetch; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard }); });

test('quotation preview uses rounded line totals and tax after discount', () => {
  expect(quotationTotals({ items: [{ quantity: 2, unitPrice: 12500.25 }], discount: 1000, taxRate: 12 }))
    .toMatchObject({ subtotal: 25000.5, tax: 2880.06, total: 26880.56 });
  expect(quotationTotals({ items: [{ quantity: 1.5, unitPrice: 10.01 }], discount: 0, taxRate: 0 }).total).toBe(15.02);
});

test('mixed POS pricing keeps setup and add-ons separate from the subscription', () => {
  const doc = { quoteType: 'pos', billingPeriod: 'monthly', items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 10000 }, { description: 'Extra reports', chargeType: 'addon', quantity: 1, unitPrice: 2000 }, { description: 'POS plan', chargeType: 'recurring', quantity: 1, unitPrice: 1500 }], discount: 500, taxRate: 12, currency: 'PHP' };
  expect(quotationTotals(doc)).toMatchObject({ total: 12880, recurringTotal: 1680, subtotal: 12000, recurringTax: 180 });
  render(<QuotationDocument document={doc} reference="POS-TEST" />);
  expect(screen.getByText('Setup fee · one-time')).toBeInTheDocument();
  expect(screen.getByText('Additional feature · one-time')).toBeInTheDocument();
  expect(screen.getByText('One-time total:')).toBeInTheDocument();
  expect(screen.getByText('₱1,680/month')).toBeInTheDocument();
});

test('choosing a payment type automatically loads its own saved contract', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], total: 0, defaultContractText: 'One-time payment agreement', defaultContractTexts: { project: 'One-time payment agreement', subscription: 'Subscription agreement', pos: 'POS agreement' } }) }));
  render(<QuotationsPanel token="test-session" />);
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  await waitFor(() => expect(screen.getByLabelText('Contract terms (optional override)')).toHaveValue('One-time payment agreement'));
  expect(screen.getByText('Saved one-time payment contract loaded.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'subscription' } });
  expect(screen.getByLabelText('Contract terms (optional override)')).toHaveValue('Subscription agreement');
  expect(screen.getByText('Saved subscription contract loaded.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'pos' } });
  expect(screen.getByLabelText('Contract terms (optional override)')).toHaveValue('POS agreement');
});

test('a subscription starts with separate setup and recurring prices', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], total: 0, defaultContractTexts: { project: 'Project terms', subscription: 'Subscription terms' } }) }));
  render(<QuotationsPanel token="test-session" />);
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  await screen.findByText(/No quotations yet/);
  fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'subscription' } });
  expect(screen.getByLabelText('Item 1 description')).toHaveValue('One-time setup fee');
  expect(screen.getByLabelText('Item 1 charge type')).toHaveValue('setup');
  expect(screen.getByLabelText('Item 2 description')).toHaveValue('Subscription plan');
  expect(screen.getByLabelText('Item 2 charge type')).toHaveValue('recurring');
  expect(screen.getByLabelText('Subscription payment commencement')).toHaveValue('After the official system go-live date.');
  fireEvent.change(screen.getAllByLabelText('Unit price')[0], { target: { value: '5000' } });
  fireEvent.change(screen.getAllByLabelText('Unit price')[1], { target: { value: '1500' } });
  expect(screen.getByLabelText('Quotation total')).toHaveTextContent('₱5,000.00');
  expect(screen.getByLabelText('Recurring total')).toHaveTextContent('₱1,500.00 / month');
  fireEvent.change(screen.getByLabelText('Subscription billing'), { target: { value: 'yearly' } });
  expect(screen.getByLabelText('Quotation total')).toHaveTextContent('₱5,000.00');
  expect(screen.getByLabelText('Recurring total')).toHaveTextContent('₱1,500.00 / year');
});

test('new save resets the form, opens a copy-link popup, and keeps edits on later updates', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  let stored;
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith('/history')) return { ok: true, json: async () => ({ history: [] }) };
    if (options.method) {
      stored = { id: 1, reference: 'ZO-2026-00001', sharePath: '/quotation/saved-client-link', document: JSON.parse(options.body).document };
      stored.document.total = quotationTotals(stored.document).total;
      return { ok: true, json: async () => ({ quotation: stored }) };
    }
    return { ok: true, json: async () => ({ quotations: stored ? [stored] : [], total: stored ? 1 : 0 }) };
  });
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  expect(screen.getByRole('button', { name: 'Print / Save PDF' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Project / quotation title'), { target: { value: 'Business website' } });
  fireEvent.change(screen.getByLabelText('Client / company name'), { target: { value: 'Example client' } });
  fireEvent.change(screen.getByLabelText('Item 1 description'), { target: { value: 'Development' } });
  fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '5000' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Add Scope Section' }));
  fireEvent.change(screen.getByLabelText('Item 1 scope 1 heading'), { target: { value: 'Customer pages' } });
  fireEvent.change(screen.getByLabelText('Item 1 scope 1 details'), { target: { value: 'Home, About us, Contact' } });
  fireEvent.change(screen.getByLabelText('Project timeline'), { target: { value: '10–12 weeks' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Quotation' }));
  await screen.findByText('ZO-2026-00001 saved successfully.');
  expect(screen.getByRole('dialog', { name: 'Your client link is ready' })).toBeInTheDocument();
  expect(screen.getByLabelText('Client quotation link')).toHaveValue(`${window.location.origin}/quotation/saved-client-link`);
  fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }));
  await screen.findByText('Client link copied.');
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/quotation/saved-client-link`);
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByLabelText('Client / company name')).toHaveValue('');
  expect(screen.getByLabelText('Project / quotation title')).toHaveValue('');
  expect(screen.getByLabelText('Unit price')).toHaveValue(0);
  const list = screen.getByRole('complementary', { name: 'Saved quotations' });
  fireEvent.click(await within(list).findByRole('button', { name: /ZO-2026-00001/ }));
  expect(screen.getByLabelText('Client / company name')).toHaveValue('Example client');
  expect(screen.getByLabelText('Item 1 scope 1 details')).toHaveValue('Home, About us, Contact');
  expect(screen.getByLabelText('Project timeline')).toHaveValue('10–12 weeks');
  fireEvent.change(screen.getByLabelText('Client / company name'), { target: { value: 'Updated client' } });
  expect(screen.getByRole('button', { name: 'Print / Save PDF' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quotations/1'), expect.objectContaining({ method: 'PUT' })));
  await screen.findByText('ZO-2026-00001 saved successfully.');
  expect(stored.document.clientName).toBe('Updated client');
  expect(stored.document.clientFlow).toBe('quotation_only');
  expect(screen.getByLabelText('Client / company name')).toHaveValue('Updated client');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('print document follows the branded two-column quotation layout', () => {
  render(<QuotationDocument reference="ZO-2026-00012" document={{
    title: 'Custom E-Commerce Platform', clientName: 'Grip Hub Ph',
    issuedOn: '2026-07-03', validUntil: '2026-08-03', currency: 'PHP',
    items: [{ description: 'Custom E-Commerce Platform', quantity: 1, unitPrice: 218000,
      scope: [{ title: 'Customer Website Pages', details: 'Home page, About us, Shop' }] }],
    discount: 0, taxRate: 0, timeline: '10–12 weeks', notes: ''
  }} />);
  expect(screen.getByRole('img', { name: 'ZeroOne Information Technology Inc.' })).toBeInTheDocument();
  expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Description', 'Amount']);
  expect(screen.getByText('July 03, 2026', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('Customer Website Pages')).toBeInTheDocument();
  expect(screen.getByText('Home page, About us, Shop')).toBeInTheDocument();
  expect(screen.getAllByText('PHP 218,000')).toHaveLength(2);
  expect(screen.getByText(/10–12 weeks/)).toBeInTheDocument();
  expect(screen.getByText('*** NOTHING FOLLOWS ***')).toBeInTheDocument();
});

test('reports save failures without claiming the quotation was saved', async () => {
  global.fetch = jest.fn(async (url, options = {}) => options.method ?
    { ok: false, json: async () => ({ message: 'Please sign in again.' }) } :
    { ok: true, json: async () => ({ quotations: [], total: 0 }) });
  render(<QuotationsPanel token="expired" />);
  await screen.findByText(/No quotations yet/);
  fireEvent.submit(screen.getByRole('button', { name: 'Save Quotation' }).closest('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please sign in again.');
  expect(screen.getByRole('button', { name: 'Print / Save PDF' })).toBeDisabled();
});

test.each([
  { editing: false, clientFlow: 'quotation_only' }, { editing: true, clientFlow: 'quotation_only' },
  { editing: false, clientFlow: 'full' }, { editing: true, clientFlow: 'full' }
])('POS $clientFlow save clears the form and opens the client-link popup (editing: $editing)', async ({ editing, clientFlow }) => {
  const before = window.location.pathname + window.location.search;
  window.history.replaceState({}, '', editing ? '/admin/quotations?id=197' : '/admin/quotations');
  let stored = editing ? { id: 197, reference: 'ZO-2026-00197', documentVersion: 'saved-pos', sharePath: '/quotation/saved-pos-link', document: { ...newQuotation(), quoteType: 'pos', posPurpose: 'new', clientFlow, title: 'Saved POS', clientName: 'Existing client', clientAddress: 'Old address', items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }], acceptancePolicy: clientFlow === 'full' ? { version: 2 } : undefined } } : null;
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith('/history')) return { ok: true, json: async () => ({ history: [] }) };
    if (url.endsWith('/payments')) return { ok: true, json: async () => ({ payments: [], paymentStatus: 'unpaid' }) };
    if (url.endsWith('/payment-proofs')) return { ok: true, json: async () => ({ proofs: [] }) };
    if (options.method === 'POST' || options.method === 'PUT') {
      const document = JSON.parse(options.body).document;
      stored = { id: 197, reference: 'ZO-2026-00197', documentVersion: 'saved-pos', sharePath: '/quotation/saved-pos-link', document: { ...document, ...quotationTotals(document), acceptancePolicy: clientFlow === 'full' ? { version: 2 } : undefined } };
      return { ok: true, json: async () => ({ quotation: stored }) };
    }
    if (url.endsWith('/197')) return { ok: true, json: async () => ({ quotation: stored }) };
    return { ok: true, json: async () => ({ quotations: stored ? [stored] : [], defaultContractTexts: { pos: 'POS template terms' }, defaultPaymentInstructions: 'Default bank instructions' }) };
  });
  try {
    render(<QuotationsPanel token="admin-token" />);
    if (editing) await screen.findByDisplayValue('Saved POS');
    else { await screen.findByText(/No quotations yet/); fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'pos' } }); }
    fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: clientFlow } });
    fireEvent.change(screen.getByLabelText('Project / quotation title'), { target: { value: 'POS for next client' } });
    fireEvent.change(screen.getByLabelText('Client / company name'), { target: { value: 'New POS client' } });
    fireEvent.change(screen.getByLabelText('Client address'), { target: { value: '123 Client Street' } });
    fireEvent.change(screen.getByLabelText('Item 1 description'), { target: { value: 'Client-specific setup' } });
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '38000' } });
    fireEvent.submit(screen.getByRole('button', { name: editing ? 'Save Changes' : 'Save Quotation' }).closest('form'));
    await screen.findByText('ZO-2026-00197 saved successfully.');
    expect(stored.document.clientName).toBe('New POS client');
    expect(stored.document.clientFlow).toBe(clientFlow);
    expect(stored.document.items[0].unitPrice).toBe('38000');
    expect(screen.getByLabelText('Quotation type')).toHaveValue('pos');
    expect(screen.getByLabelText('Client / company name')).toHaveValue('');
    expect(screen.getByLabelText('Client address')).toHaveValue('');
    expect(screen.getByLabelText('Project / quotation title')).toHaveValue('');
    expect(screen.getByLabelText('Item 1 description')).toHaveValue('');
    expect(screen.getByLabelText('Unit price')).toHaveValue(0);
    expect(screen.getByRole('button', { name: 'Save Quotation' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Contract acceptance and status' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Your client link is ready' })).toBeInTheDocument();
    expect(screen.getByLabelText('Client quotation link')).toHaveValue(`${window.location.origin}/quotation/saved-pos-link`);
    expect(window.location.search).toBe('');
  } finally { window.history.replaceState({}, '', before); }
});

test('new quotations follow the selected PDF and can switch back to the kept default contract', async () => {
  const pdf = { id:'12345678-1234-4234-8234-123456789012', fileName:'Selected contract.pdf', pageCount:2, byteLength:1000, sha256:'a'.repeat(64) };
  global.fetch = jest.fn(async()=>({ok:true,json:async()=>({quotations:[],defaultContractText:'My saved default',defaultContractTexts:{project:'My saved default'},defaultContracts:{project:{source:'pdf',pdf}}})}));
  render(<QuotationsPanel token="admin-token" />);
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  await screen.findByText('Selected contract.pdf');
  expect(screen.getByLabelText('Contract source')).toHaveValue('pdf');
  expect(screen.queryByLabelText('Contract terms (optional override)')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Contract source'),{target:{value:'default'}});
  expect(screen.getByLabelText('Contract terms (optional override)')).toHaveValue('My saved default');
  fireEvent.change(screen.getByLabelText('Contract source'),{target:{value:'pdf'}});
  expect(screen.getByText('Selected contract.pdf')).toBeInTheDocument();
});

test('new quotations load editable default payment instructions and preserve edits', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], defaultPaymentInstructions: 'Bank: AUB\nAccount number: 310-11-003883-1' }) }));
  render(<QuotationsPanel token="test-session" />);
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  const field = screen.getByLabelText('Bank / payment instructions');
  await waitFor(() => expect(field).toHaveValue('Bank: AUB\nAccount number: 310-11-003883-1'));
  fireEvent.change(field, { target: { value: 'Client-specific instructions' } });
  expect(field).toHaveValue('Client-specific instructions');
});


test('milestone charge type is selectable and appears in the printable quotation', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [] }) }));
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  fireEvent.change(screen.getByLabelText('Item 1 charge type'), { target: { value: 'milestone' } });
  expect(screen.getByLabelText('Item 1 charge type')).toHaveValue('milestone');
  const doc = { items: [{ description: 'Development completion', chargeType: 'milestone', quantity: 1, unitPrice: 7000 }], currency: 'PHP', discount: 0, taxRate: 0 };
  expect(quotationTotals(doc)).toMatchObject({ total: 7000, recurringTotal: 0, hasRecurring: false });
  const preview = render(<QuotationDocument document={doc} reference="MILESTONE-TEST" />);
  expect(within(preview.container).getByText('Milestone payment')).toBeInTheDocument();
  expect(within(preview.container).queryByText('Additional feature · one-time')).not.toBeInTheDocument();
});

test('quotation tabs preserve the draft and keep billing in its own workspace', async () => {
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes('/billing') ? { subscriptions: [], statements: [], total: 0 } : { quotations: [], total: 0 } }));
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  fireEvent.change(screen.getByLabelText('Project / quotation title'), { target: { value: 'Keep my quotation draft' } });
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Create Quotation' }), { key: 'End' });
  expect(screen.queryByRole('tab', { name: 'Billing' })).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Quotation List' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Quotation List' }), { key: 'ArrowRight' });
  expect(screen.getByLabelText('Project / quotation title')).toHaveValue('Keep my quotation draft');
});

test('POS monthly Go-Live option combines current and additional subscription charges for the client', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], total: 0, defaultContractText: 'Project agreement', defaultContractTexts: { project: 'Project agreement', pos: 'POS agreement' } }) }));
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'pos' } });
  expect(screen.getByLabelText('Project / quotation title')).toHaveValue('Cloud-Based POS System');
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  expect(screen.getByLabelText('Initial payment (%)')).toHaveValue(100);
  expect(screen.getByLabelText('Payment due date / terms').value).toContain('payable in full (100%)');
  expect(screen.getByLabelText('Item 1 description')).toHaveValue('');
  fireEvent.click(screen.getByLabelText('Show monthly subscription after Go-Live'));
  expect(screen.getByLabelText('Current monthly subscription')).not.toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('Current monthly subscription'), { target: { value: '1699' } });
  expect(screen.getByLabelText('Current monthly subscription')).toHaveValue(1699);
  expect(screen.getByLabelText('Item 2 description')).toBeInTheDocument();
  expect(screen.queryByLabelText('Item 3 description')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Additional monthly charge'), { target: { value: '2000' } });
  expect(screen.getByLabelText('Item 3 description')).toHaveValue('Additional monthly subscription charge');
  const preview = screen.getByRole('region', { name: 'Quotation preview' });
  expect(within(preview).getByRole('region', { name: 'Monthly subscription after Go-Live' })).toHaveTextContent('additional monthly charge of ₱2,000.00, adjusting your subscription from ₱1,699.00 to ₱3,699.00 per month');
  expect(within(preview).getByRole('region', { name: 'Monthly subscription after Go-Live' })).toHaveTextContent('only commence after the official Go-Live of your POS System');
  expect(screen.getByLabelText('Recurring total')).toHaveTextContent('3,699');
  expect(screen.getByLabelText('Subscription billing')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Additional monthly charge'), { target: { value: '2500' } });
  expect(screen.getByLabelText('Recurring total')).toHaveTextContent('4,199');
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  expect(screen.getByLabelText('Subscription payment commencement')).toHaveValue('The revised monthly subscription will only commence after the official Go-Live of your POS System.');
  fireEvent.change(screen.getByLabelText('Additional monthly charge'), { target: { value: '0' } });
  expect(screen.queryByLabelText('Item 3 description')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Subscription payment commencement')).toHaveValue('The monthly subscription will only commence after the official Go-Live of your POS System.');
  expect(within(preview).getByRole('region', { name: 'Monthly subscription after Go-Live' })).not.toHaveTextContent('revised');
  fireEvent.change(screen.getByLabelText('Additional monthly charge'), { target: { value: '2500' } });
  fireEvent.click(screen.getByLabelText('Show monthly subscription after Go-Live'));
  expect(within(preview).queryByRole('region', { name: 'Monthly subscription after Go-Live' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Recurring total')).toHaveTextContent('4,199');
});

test('client flow selector hides contract and payment setup and restores it when enabled', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], defaultContractText: 'Saved terms', defaultPaymentInstructions: 'Bank details' }) }));
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  expect(screen.getByLabelText('After the client accepts')).toHaveValue('quotation_only');
  expect(screen.queryByRole('region', { name: 'Payment configuration' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Contract terms (optional override)')).not.toBeInTheDocument();
  expect(screen.getByText(/Send that follow-up separately when ready/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  expect(screen.getByLabelText('Bank / payment instructions')).toHaveValue('Bank details');
  expect(screen.getByLabelText('Contract terms (optional override)')).toHaveValue('Saved terms');
});

test.each(['project', 'pos'])('%s requote requires a saved edit and prompts the admin to generate a replacement link', async quoteType => {
  const { newQuotation } = require('../utils/quotation');
  window.history.replaceState({}, '', '/admin/quotations?id=24');
  let row = { id: 24, reference: 'ZO-2026-00024', sharePath: null, document: { ...newQuotation(), quoteType, posPurpose: quoteType === 'pos' ? 'new' : undefined, title: 'Original project', clientName: 'Client', items: [{ description: 'Service', quantity: 1, unitPrice: 100 }] }, clientResponse: { action: 'requote', current: true, name: 'Client', email: 'client@example.com', note: 'Add online ordering.', respondedAt: '2026-11-03T01:00:00Z' } };
  global.fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith('/counts')) return { ok: true, json: async () => ({ unreadCount: 1, quotations: { 24: 1 } }) };
    if (url.endsWith('/history')) return { ok: true, json: async () => ({ history: [] }) };
    if (options.method === 'PUT') row = { ...row, document: JSON.parse(options.body).document, clientResponse: { ...row.clientResponse, current: false } };
    if (options.method === 'POST') row = { ...row, sharePath: '/quotation/replacement-link' };
    return { ok: true, json: async () => url.includes('?page=') ? { quotations: [row] } : { quotation: row } };
  });
  render(<QuotationsPanel token="admin-token" />);
  await screen.findByRole('heading', { name: 'Requote requested' });
  expect(screen.getByRole('button', { name: 'Generate Client Link' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Project / quotation title'), { target: { value: 'Project with online ordering' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('dialog', { name: 'Generate a new client link?' })).toHaveTextContent('previous link is inactive');
  expect(global.fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Generate New Link' }));
  expect(await screen.findByRole('dialog', { name: 'Your client link is ready' })).toBeInTheDocument();
  expect(screen.getByLabelText('Client quotation link')).toHaveValue(`${window.location.origin}/quotation/replacement-link`);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/24/share'), expect.objectContaining({ method: 'POST' }));
  if (quoteType === 'pos') {
    expect(screen.getByLabelText('Client / company name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save Quotation' })).toBeInTheDocument();
  }
  window.history.replaceState({}, '', '/');
});


test('quotation hides zero subscription additions and shows a single monthly total without tax', () => {
  const doc = { currency: 'PHP', billingPeriod: 'monthly', items: [
    { description: 'Waived setup', chargeType: 'setup', quantity: 1, unitPrice: 0 },
    { description: 'Current subscription', chargeType: 'recurring', subscriptionRole: 'current', quantity: 1, unitPrice: 1699 },
    { description: 'Additional monthly subscription charge', chargeType: 'recurring', subscriptionRole: 'additional', quantity: 1, unitPrice: 0 }
  ], taxRate: 0, discount: 0 };
  const view = render(<QuotationDocument document={doc} />);
  expect(screen.queryByText('Additional monthly subscription charge')).not.toBeInTheDocument();
  expect(screen.getByText('Waived setup')).toBeInTheDocument();
  expect(screen.queryByText('Subscription subtotal:')).not.toBeInTheDocument();
  expect(screen.getByText('Monthly Subscription Total:')).toBeInTheDocument();
  expect(screen.getByText('Base Monthly Subscription')).toBeInTheDocument();
  expect(screen.getByText('Prepared For:')).toBeInTheDocument();
  expect(screen.getByText('Project:')).toBeInTheDocument();
  expect(screen.getByText('Quotation No.')).toBeInTheDocument();
  expect(screen.getByText('₱1,699/month')).toBeInTheDocument();
  view.rerender(<QuotationDocument document={{ ...doc, taxRate: 12, items: doc.items.map(item => item.subscriptionRole === 'additional' ? { ...item, unitPrice: 100 } : item) }} />);
  expect(screen.getByText('Additional monthly subscription charge')).toBeInTheDocument();
  expect(screen.getByText('Subscription subtotal:')).toBeInTheDocument();
  expect(screen.getByText('Subscription tax:')).toBeInTheDocument();
  expect(screen.getByText('₱2,014.88/month')).toBeInTheDocument();
});

test('Sync Court matches POS setup and subscription options and leaves its contract blank until upload', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], defaultContractTexts: { project: 'Project agreement', sync_court: '' } }) }));
  render(<QuotationsPanel token="admin-token" />);
  await screen.findByText(/No quotations yet/);
  fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'sync_court' } });
  expect(screen.getByLabelText('Project / quotation title')).toHaveValue('Sync Court Subscription');
  expect(screen.getByLabelText('Item 1 charge type')).toHaveValue('setup');
  expect(screen.getByLabelText('Item 1 description')).toHaveValue('');
  expect(screen.queryByLabelText('Item 2 description')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Show monthly subscription after Go-Live'));
  fireEvent.change(screen.getByLabelText('Current monthly subscription'), { target: { value: '2500' } });
  expect(screen.getByLabelText('Item 2 charge type')).toHaveValue('recurring');
  expect(screen.queryByLabelText('Item 3 description')).not.toBeInTheDocument();
  expect(screen.getByLabelText('System name')).toHaveValue('Sync Court');
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  expect(screen.getByLabelText('Contract terms (optional override)')).toHaveValue('');
  expect(screen.getByLabelText('Payment due date / terms')).toHaveValue('');
  expect(screen.getByLabelText('Initial payment (%)')).toHaveValue(100);
});


test('hardware can be selected or added and prints as a one-time purchase', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [] }) }));
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  fireEvent.change(screen.getByLabelText('Item 1 charge type'), { target: { value: 'hardware' } });
  expect(screen.getByLabelText('Item 1 charge type')).toHaveValue('hardware');
  fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'pos' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Add Hardware' }));
  const types = screen.getAllByLabelText(/Item \d+ charge type/);
  expect(types[types.length - 1]).toHaveValue('hardware');
  const doc = { quoteType: 'pos', billingPeriod: 'monthly', currency: 'PHP', discount: 500, taxRate: 12, items: [
    { description: 'Receipt printer', chargeType: 'hardware', quantity: 2, unitPrice: 3500 },
    { description: 'POS subscription', chargeType: 'recurring', quantity: 1, unitPrice: 1500 }
  ] };
  expect(quotationTotals(doc)).toMatchObject({ subtotal: 7000, total: 7280, recurringTotal: 1680 });
  const preview = render(<QuotationDocument document={doc} reference="HARDWARE-TEST" />);
  expect(within(preview.container).getByText('Hardware · one-time')).toBeInTheDocument();
  const contract = render(<ContractDocument document={doc} reference="HARDWARE-TEST" contractText="Agreed terms" />);
  expect(within(contract.container).getByText('Receipt printer — Hardware')).toBeInTheDocument();
});


test('hardware terms appear automatically, remain editable, and are included in quotation and contract previews', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [] }) }));
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  expect(screen.queryByLabelText('Hardware procurement and payment terms', { selector: 'textarea' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Item 1 charge type'), { target: { value: 'hardware' } });
  const field = screen.getByLabelText('Hardware procurement and payment terms', { selector: 'textarea' });
  expect(field).toHaveValue(defaultHardwareTerms);
  fireEvent.change(field, { target: { value: 'Client-specific hardware payment and delivery terms.' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Add Item' }));
  expect(field).toHaveValue('Client-specific hardware payment and delivery terms.');
  const doc = { quoteType: 'project', currency: 'PHP', discount: 0, taxRate: 0, items: [{ description: 'Printer', chargeType: 'hardware', quantity: 1, unitPrice: 3500 }], contractDetails: { hardwareTerms: field.value } };
  for (const Component of [QuotationDocument, ContractDocument]) {
    const view = render(<Component document={doc} reference="HW-TERMS" />);
    expect(within(view.container).getByText(field.value)).toBeInTheDocument();
    view.unmount();
  }
  fireEvent.change(screen.getByLabelText('Item 1 charge type'), { target: { value: 'one_time' } });
  expect(screen.queryByLabelText('Hardware procurement and payment terms', { selector: 'textarea' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Item 1 charge type'), { target: { value: 'hardware' } });
  expect(screen.getByLabelText('Hardware procurement and payment terms', { selector: 'textarea' })).toHaveValue(doc.contractDetails.hardwareTerms);
  fireEvent.click(screen.getByRole('button', { name: 'Use standard hardware terms' }));
  expect(screen.getByLabelText('Hardware procurement and payment terms', { selector: 'textarea' })).toHaveValue(defaultHardwareTerms);
});

test('POS agreements can take effect upon signing or use an explicitly agreed calendar date', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ quotations: [], total: 0, defaultContractTexts: { project: 'Project terms', pos: 'POS terms' } }) }));
  render(<QuotationsPanel token="test-session" />);
  await screen.findByText(/No quotations yet/);
  fireEvent.change(screen.getByLabelText('Quotation type'), { target: { value: 'pos' } });
  fireEvent.change(screen.getByLabelText('After the client accepts'), { target: { value: 'full' } });
  const rule = screen.getByLabelText(/Agreement effective date rule/);
  expect(rule).toHaveValue('signing');
  expect(screen.queryByLabelText('Agreement date')).not.toBeInTheDocument();
  fireEvent.change(rule, { target: { value: 'fixed' } });
  expect(screen.getByLabelText('Agreement date')).toHaveValue(screen.getByLabelText('Issue date').value);
  fireEvent.change(screen.getByLabelText('Agreement date'), { target: { value: '2026-12-01' } });
  expect(screen.getByLabelText('Agreement date')).toHaveValue('2026-12-01');
});

test('signed agreements disable editing while final downloads, payment reviews, and new quotations remain available', async () => {
  const before = window.location.pathname + window.location.search;
  window.history.replaceState({}, '', '/admin/quotations?id=991');
  const row = { id: 991, reference: 'ZO-LOCKED', documentVersion: 'locked-version', document: { ...newQuotation(), quoteType: 'pos', clientFlow: 'full', title: 'Locked signed agreement', clientName: 'Accepted Client', clientAddress: 'Accepted address', contractText: 'Frozen agreed terms', acceptancePolicy: { version: 1, title: 'Electronic Acceptance and Confirmation', terms: 'Recorded acceptance terms.' } }, contractState: { status: 'finalized', locked: true, providerAcceptance: { name: 'Authorized Staff', confirmedAt: '2026-11-05T01:00:00Z' } }, clientResponse: { action: 'accept', current: true, signedAt: '2026-11-05T00:00:00Z' } };
  global.fetch = jest.fn(async url => ({ ok: true, json: async () => url.endsWith('/991') ? { quotation: row } : url.endsWith('/payment-proofs') ? { proofs: [] } : url.endsWith('/payments') ? { payments: [], paymentStatus: 'unpaid' } : url.endsWith('/history') ? { history: [] } : { quotations: [row], total: 1, unreadCount: 0 } }));
  try {
    render(<QuotationsPanel token="admin-token" />);
    await screen.findByDisplayValue('Locked signed agreement');
    await screen.findByText('No proof of payment submitted yet.');
    expect(screen.getByLabelText('Project / quotation title')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download Final Contract PDF' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Refresh proofs' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Verify Payment' })).toBeEnabled();
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New Quotation' }));
    expect(screen.getByLabelText('Project / quotation title')).toBeEnabled();
  } finally { window.history.replaceState({}, '', before); }
});
