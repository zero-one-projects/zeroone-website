const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBillingDocument, subscriptionDocument } = require('./billing');
const { documentHash } = require('./quotation-response');
function subscription(overrides = {}) {
  const document = { quoteType: 'subscription', billingPeriod: 'monthly', title: 'Custom software', clientName: 'Example client', currency: 'PHP', taxRate: 12, items: [
    { description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 20000 },
    { description: 'Additional feature', chargeType: 'addon', quantity: 1, unitPrice: 5000 },
    { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 1500 }
  ], ...overrides };
  return { id: 1, createdAt: '2026-01-01', document, clientResponse: { action: 'accept', documentHash: documentHash(document), document: JSON.parse(JSON.stringify(document)), signature: { signedAt: '2026-01-01' } } };
}
const input = { period: '2026-10', issuedOn: '2026-10-01', dueOn: '2026-10-08', goLiveOn: '2026-09-15' };
test('monthly billing snapshots only recurring charges and their tax, excluding setup and features', () => {
  const row = subscription(); const bill = createBillingDocument(row, input);
  assert.equal(bill.items.length, 1); assert.equal(bill.subtotal, 1500); assert.equal(bill.tax, 180); assert.equal(bill.total, 1680);
  assert.match(bill.paymentInstructions, /310-11-003883-1/);
  row.document.clientName = 'Changed';
  assert.equal(bill.clientName, 'Example client');
});
test('billing requires a current signed monthly subscription and rejects upgrade quotations as separate billing accounts', () => {
  assert.throws(() => subscriptionDocument(subscription({ quoteType: 'project' })), /custom subscription/);
  assert.equal(subscriptionDocument(subscription({ quoteType: 'pos' })).quoteType, 'pos');
  for (const posPurpose of ['upgrade', 'customization']) assert.throws(() => subscriptionDocument(subscription({ quoteType: 'pos', posPurpose })), /original POS/);
  assert.throws(() => subscriptionDocument(subscription({ billingPeriod: 'yearly' })), /monthly/);
  const row = subscription(); row.clientResponse.signature = null;
  assert.throws(() => subscriptionDocument(row), /signed contract/);
  const changed = subscription(); changed.document.title = 'Modified agreement';
  assert.throws(() => subscriptionDocument(changed), /current accepted/);
});
test('billing starts at go-live and validates month and date boundaries', () => {
  const row = subscription();
  for (const value of [{ period: '2026-08' }, { period: '2026-13' }, { period: '../x' }, { goLiveOn: '2099-01-01' }, { dueOn: '2026-09-30' }, { issuedOn: '2026-02-30' }, { goLiveOn: '' }]) assert.throws(() => createBillingDocument(row, { ...input, ...value }));
  assert.equal(createBillingDocument(row, { ...input, period: '2026-09' }).total, 1680);
});
test('saved payment instructions and rounded monthly quantities are retained', () => {
  const row = subscription({ paymentInstructions: 'My billing instructions', taxRate: 0, items: [{ description: 'Plan', chargeType: 'recurring', quantity: 1.5, unitPrice: 10.01 }] });
  const bill = createBillingDocument(row, input);
  assert.equal(bill.total, 15.02); assert.equal(bill.paymentInstructions, 'My billing instructions');
  assert.throws(() => createBillingDocument(subscription({ items: [{ description: 'Free plan', chargeType: 'recurring', quantity: 1, unitPrice: 0 }] }), input), /positive/);
});
test('billing statement PDF is a real readable PDF with its billing reference', async () => {
  const { renderBillingPdf } = require('./billing-pdf');
  const bytes = await renderBillingPdf({ reference: 'BILL-2026-00001', document: createBillingDocument(subscription(), input) });
  const pdf = await require('pdf-lib').PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), 'BILL-2026-00001'); assert(pdf.getPageCount() >= 1);
});

test('manual billing calculates rounded charges and tax without a quotation', async () => {
  const { createManualBillingDocument } = require('./billing');
  const input = { clientName: 'Example client', title: 'Project payment', issuedOn: '2026-10-30', dueOn: '2026-11-06', items: [{ description: 'Development', quantity: 1.5, unitPrice: 100.01 }], taxRate: 12, paymentInstructions: 'Pay by bank transfer' };
  const bill = createManualBillingDocument(input);
  assert.equal(bill.kind, 'manual'); assert.equal(bill.subtotal, 150.02); assert.equal(bill.tax, 18); assert.equal(bill.total, 168.02);
  assert.equal(bill.period, '2026-10'); assert.equal(bill.paymentInstructions, input.paymentInstructions);
  const bytes = await require('./billing-pdf').renderBillingPdf({ reference: 'BILL-2026-12345', document: bill });
  const pdf = await require('pdf-lib').PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), 'BILL-2026-12345');
  assert(pdf.getPages()[0].node.Resources().lookup(require('pdf-lib').PDFName.of('XObject')).keys().length > 0, 'company logo is embedded');
  for (const changes of [{ clientName: '' }, { items: [] }, { items: [{ description: 'Invalid', quantity: -1, unitPrice: 100 }] }, { taxRate: 101 }, { currency: 'INVALID' }, { dueOn: '2026-10-01' }, { issuedOn: '2026-02-30' }]) assert.throws(() => createManualBillingDocument({ ...input, ...changes }));
});

test('reference-style PDF fits a typical bill on one page and paginates long item tables', async () => {
  const { createManualBillingDocument } = require('./billing');
  const { renderBillingPdf } = require('./billing-pdf');
  const { PDFDocument } = require('pdf-lib');
  const input = { clientName: 'Sample Client', clientCompany: 'Example Company', clientAddress: 'Makati City', clientEmail: 'client@example.com', title: 'Assist and Shield Web Application', issuedOn: '2026-10-01', dueOn: '2026-10-08', taxRate: 12, items: [{ description: 'Assist and Shield Web Application – basic plan', quantity: 1, unitPrice: 1699 }] };
  const document = createManualBillingDocument(input);
  assert.equal(document.clientCompany, 'Example Company');
  assert.equal(document.total, 1902.88);
  const single = await PDFDocument.load(await renderBillingPdf({ reference: 'BILL-2026-00101', document }));
  assert.equal(single.getPageCount(), 1);
  const long = createManualBillingDocument({ ...input, items: Array.from({ length: 35 }, (_, index) => ({ description: `Service ${index + 1}: ` + 'Detailed service coverage and support. '.repeat(8), quantity: 1, unitPrice: 100 })) });
  const multiple = await PDFDocument.load(await renderBillingPdf({ reference: 'BILL-2026-00102', document: long }));
  assert(multiple.getPageCount() > 1); assert(multiple.getPageCount() < 15);
});

test('billing numbers use the creation date in Manila and an unpadded record number', () => {
  const { serializeBill } = require('./billing');
  const row = { id: 7, createdAt: '2026-10-29T16:30:00.000Z', document: {} };
  assert.equal(serializeBill(row).reference, 'BILL-2026-Z01-20261030-7');
  assert.equal(serializeBill({ ...row, id: 1, createdAt: '2026-12-31T16:01:00.000Z' }).reference, 'BILL-2027-Z01-20270101-1');
});

test('non-VAT manual statements apply advances after subtotal without changing charges', async () => {
  const { createManualBillingDocument, isNonVatBilling } = require('./billing');
  const input = { clientName: 'Client', title: 'Monthly service', issuedOn: '2026-10-30', dueOn: '2026-11-06', taxTreatment: 'non_vat', items: [{ description: 'Plan', quantity: 1, unitPrice: 4500 }], advancePayment: '1000', deductionNote: 'Advance received' };
  const d = createManualBillingDocument(input);
  assert(isNonVatBilling(d)); assert.equal(d.tax, 0); assert.equal(d.total, 4500); assert.equal(d.advancePayment, 1000); assert.equal(d.amountDue, 3500); assert.equal(d.deductionNote, 'Advance received');
  assert.equal(createManualBillingDocument({ ...input, advancePayment: 4500 }).amountDue, 0);
  assert.equal(createManualBillingDocument({ ...input, advancePayment: '0.01' }).amountDue, 4499.99);
  for (const advancePayment of [-1, 4500.01, 'invalid', true, '']) assert.throws(() => createManualBillingDocument({ ...input, advancePayment }));
  assert.throws(() => createManualBillingDocument({ ...input, taxRate: 12 }), /Non-VAT statements cannot include VAT/);
  assert.throws(() => createManualBillingDocument({ ...input, deductionNote: 'x'.repeat(501) }), /Deduction details/);
  assert(isNonVatBilling({ taxRate: 0, tax: 0 })); assert(!isNonVatBilling({ taxRate: 12, tax: 540 }));
  const bytes = await require('./billing-pdf').renderBillingPdf({ reference: 'BILL-2026-Z01-20261030-1', document: d });
  assert.equal((await require('pdf-lib').PDFDocument.load(bytes)).getPageCount(), 1);
});

test('subscription advances reduce the amount due while preserving agreed recurring tax and charges', () => {
  const bill = createBillingDocument(subscription(), { ...input, advancePayment: 500 });
  assert.equal(bill.subtotal, 1500); assert.equal(bill.tax, 180); assert.equal(bill.total, 1680); assert.equal(bill.amountDue, 1180); assert.equal(bill.taxTreatment, 'vat');
  assert.throws(() => createBillingDocument(subscription(), { ...input, advancePayment: 1680.01 }), /cannot exceed/);
});

test('Sync Court uses the signed monthly subscription billing flow and excludes one-time setup charges', () => {
  const row = subscription({ quoteType: 'sync_court', title: 'Sync Court Subscription' });
  assert.equal(subscriptionDocument(row).quoteType, 'sync_court');
  const bill = createBillingDocument(row, input);
  assert.equal(bill.items.length, 1); assert.equal(bill.total, 1680);
});

test('USD billing uses the dollar account for defaults and retains custom instructions', async () => {
  const { createManualBillingDocument, billingPaymentInstructions, serializeBill, usdPaymentInstructions } = require('./billing');
  const { defaultPaymentInstructions } = require('./quotation-payment');
  const manual = createManualBillingDocument({ clientName: 'USD Client', title: 'IT Support', currency: 'USD', issuedOn: '2026-11-04', dueOn: '2026-11-11', items: [{ description: 'Email support', quantity: 1, unitPrice: 23.60 }] });
  assert.equal(manual.paymentInstructions, usdPaymentInstructions);
  assert.match(manual.paymentInstructions, /310-19-000104-1/);
  assert.match(manual.paymentInstructions, /Swift code: AUBKPHMM/);
  assert.match(manual.paymentInstructions, /Dollar Savings Account/);
  assert.equal(createBillingDocument(subscription({ currency: 'USD', paymentInstructions: defaultPaymentInstructions }), input).paymentInstructions, usdPaymentInstructions);
  assert.equal(billingPaymentInstructions('PHP', ''), defaultPaymentInstructions);
  assert.equal(billingPaymentInstructions('USD', 'Custom bank'), 'Custom bank');
  const row = { id: 1, createdAt: '2026-11-04', document: { ...manual, paymentInstructions: defaultPaymentInstructions } };
  assert.equal(serializeBill(row).document.paymentInstructions, usdPaymentInstructions);
  assert.equal(row.document.paymentInstructions, defaultPaymentInstructions);
  const pdf = await require('pdf-lib').PDFDocument.load(await require('./billing-pdf').renderBillingPdf({ reference: 'USD-BILL', document: manual }));
  assert(pdf.getPageCount() >= 1 && pdf.getPageCount() <= 2);
});
