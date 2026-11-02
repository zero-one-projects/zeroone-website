const { documentHash } = require('./quotation-response');
const { defaultPaymentInstructions } = require('./quotation-payment');
const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
function date(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(`Choose a valid ${label}.`);
  return value;
}
function subscriptionDocument(quotation) {
  const response = quotation.clientResponse;
  if (response?.action !== 'accept' || !response.signature?.signedAt || response.documentHash !== documentHash(quotation.document)) fail('Select a subscription with a current accepted quotation and signed contract.');
  const document = response.document || quotation.document;
  if (!['subscription', 'sync_court'].includes(document.quoteType) || (document.billingPeriod || 'monthly') !== 'monthly' || !document.items?.some(item => item.chargeType === 'recurring')) fail('Select a custom subscription with monthly recurring charges.');
  return document;
}
function applyBillingDeduction(input, total) {
  const value = input.advancePayment ?? 0;
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) fail('Enter a valid advance payment / deduction.');
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) fail('Advance payment / deduction cannot be negative.');
  const cents = Math.round(amount * 100), totalCents = Math.round(total * 100);
  if (!Number.isSafeInteger(cents) || cents > totalCents) fail('Advance payment / deduction cannot exceed the statement total.');
  if (input.deductionNote !== undefined && (typeof input.deductionNote !== 'string' || input.deductionNote.length > 500)) fail('Deduction details must be up to 500 characters.');
  return { advancePayment: cents / 100, deductionNote: (input.deductionNote || '').trim(), amountDue: (totalCents - cents) / 100 };
}
function isNonVatBilling(document) {
  return document.taxTreatment ? document.taxTreatment === 'non_vat' : Number(document.taxRate || 0) === 0 && Number(document.tax || 0) === 0;
}
const nonVatBillingNote = 'Non-VAT registered. This billing statement is issued for payment notification purposes only and is not a BIR-registered Sales Invoice. A duly authorized Sales Invoice will be issued in accordance with applicable BIR requirements.';
function createBillingDocument(quotation, input) {
  const source = subscriptionDocument(quotation);
  const period = input?.period;
  if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period.startsWith('0000')) fail('Choose a valid billing month.');
  const issuedOn = date(input.issuedOn, 'issue date');
  const dueOn = date(input.dueOn, 'due date');
  const goLiveOn = date(input.goLiveOn, 'system go-live date');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  if (goLiveOn > today) fail('Monthly billing can begin only after the system goes live.');
  if (period < goLiveOn.slice(0, 7)) fail('The billing month cannot be before system go-live.');
  if (dueOn < issuedOn) fail('The due date cannot be before the issue date.');
  if (typeof input.notes !== 'undefined' && (typeof input.notes !== 'string' || input.notes.length > 5000)) fail('Notes must be up to 5,000 characters.');
  const items = source.items.filter(item => item.chargeType === 'recurring').map(item => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, amount: Math.round(Number(item.quantity) * Math.round(Number(item.unitPrice) * 100)) / 100 }));
  const cents = items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const taxRate = Number(source.taxRate || 0);
  const taxCents = Math.round(cents * taxRate / 100);
  const total = (cents + taxCents) / 100;
  if (!Number.isFinite(total) || total <= 0) fail('This subscription must have a positive monthly charge.');
  const quoteReference = `ZO-${new Date(quotation.createdAt).getUTCFullYear()}-${String(quotation.id).padStart(5, '0')}`;
  return { clientName: source.clientName, clientEmail: source.clientEmail || '', clientAddress: source.clientAddress || '', title: source.title,
    quotationReference: quoteReference, quotationVersion: documentHash(quotation.document), currency: source.currency || 'PHP', period, issuedOn, dueOn, goLiveOn,
    items, subtotal: cents / 100, taxRate, tax: taxCents / 100, total, taxTreatment: taxRate > 0 ? 'vat' : 'non_vat', ...applyBillingDeduction(input, total), notes: (input.notes || '').trim(),
    paymentInstructions: source.paymentInstructions?.trim() || defaultPaymentInstructions };
}
function createManualBillingDocument(input) {
  const text = (key, max, required = false) => {
    const value = input?.[key];
    if (value !== undefined && typeof value !== 'string') fail(`Invalid ${key}.`);
    const result = (value || '').trim();
    if (result.length > max || (required && !result)) fail(`Enter ${key} (up to ${max} characters).`);
    return result;
  };
  const clientName = text('clientName', 180, true), title = text('title', 240, true);
  const issuedOn = date(input.issuedOn, 'issue date'), dueOn = date(input.dueOn, 'due date');
  if (dueOn < issuedOn) fail('The due date cannot be before the issue date.');
  const period = input.period || issuedOn.slice(0, 7);
  if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period.startsWith('0000')) fail('Choose a valid billing month.');
  const currency = input.currency || 'PHP';
  if (!['PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'].includes(currency)) fail('Choose a supported currency.');
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) fail('Add between 1 and 50 billing items.');
  const items = input.items.map(item => {
    if (!item || typeof item.description !== 'string' || !item.description.trim() || item.description.length > 1000) fail('Enter an item description (up to 1,000 characters).');
    const quantity = Number(item.quantity), unitPrice = Number(item.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000 || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000000) fail('Enter a positive quantity and a valid non-negative price.');
    return { description: item.description.trim(), quantity, unitPrice: Math.round(unitPrice * 100) / 100, amount: Math.round(quantity * Math.round(unitPrice * 100)) / 100 };
  });
  const cents = items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const taxRate = Number(input.taxRate || 0);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) fail('Enter a tax rate between 0 and 100.');
  const taxTreatment = input.taxTreatment || (taxRate > 0 ? 'vat' : 'non_vat');
  if (!['vat', 'non_vat'].includes(taxTreatment)) fail('Choose a valid tax treatment.');
  if (taxTreatment === 'non_vat' && taxRate !== 0) fail('Non-VAT statements cannot include VAT.');
  const taxCents = Math.round(cents * taxRate / 100);
  if (!Number.isSafeInteger(cents + taxCents) || cents <= 0 || cents + taxCents > 100000000000) fail('Enter a positive total up to 1 billion.');
  return { kind: 'manual', clientName, clientCompany: text('clientCompany', 180), clientEmail: text('clientEmail', 180), clientAddress: text('clientAddress', 1000), title,
    currency, period, issuedOn, dueOn, items, subtotal: cents / 100, taxRate, tax: taxCents / 100, total: (cents + taxCents) / 100, taxTreatment, ...applyBillingDeduction(input, (cents + taxCents) / 100),
    notes: text('notes', 5000), paymentInstructions: text('paymentInstructions', 5000) || defaultPaymentInstructions };
}
function serializeBill(row) {
  const createdOn = new Date(row.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
  return { id: row.id, quotationId: row.quotationId, reference: `BILL-${createdOn.slice(0, 4)}-Z01-${createdOn.replaceAll('-', '')}-${row.id}`, period: row.period, document: row.document, createdAt: row.createdAt, emailSentAt: row.emailSentAt || null, emailSentTo: row.emailSentTo || null, sharePath: row.shareToken ? `/api/billing/${row.shareToken}/pdf` : null }; }
module.exports = { subscriptionDocument, createBillingDocument, createManualBillingDocument, serializeBill, isNonVatBilling, nonVatBillingNote };
