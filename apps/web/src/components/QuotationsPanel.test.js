import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QuotationsPanel from './QuotationsPanel';
import { quotationTotals } from '../utils/quotation';
import QuotationDocument from './QuotationDocument';

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
  fireEvent.change(screen.getByLabelText('Current monthly subscription'), { target: { value: '1699' } });
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

test('requote requires a saved edit and prompts the admin to generate a replacement link', async () => {
  const { newQuotation } = require('../utils/quotation');
  window.history.replaceState({}, '', '/admin/quotations?id=24');
  let row = { id: 24, reference: 'ZO-2026-00024', sharePath: null, document: { ...newQuotation(), title: 'Original project', clientName: 'Client', items: [{ description: 'Service', quantity: 1, unitPrice: 100 }] }, clientResponse: { action: 'requote', current: true, name: 'Client', email: 'client@example.com', note: 'Add online ordering.', respondedAt: '2026-11-03T01:00:00Z' } };
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
