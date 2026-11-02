const { defaultPosPaymentTerms } = require('./quotation-payment');
const { monthlySubscriptionSummary } = require('./quotation-pricing');
const { normalizeContractStyle } = require('./contract-formatting');
const { quotationContract } = require('./quotation-contract');
const defaultBillingCommencement = 'After the official system go-live date.';

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function text(value, label, max, required = false) {
  if (value !== undefined && typeof value !== 'string') invalid(`${label} must be text.`);
  const result = (value || '').trim();
  if (required && !result) invalid(`${label} is required.`);
  if (result.length > max) invalid(`${label} is too long.`);
  return result;
}

function number(value, label, max, positive = false) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') invalid(`${label} is required.`);
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || result > max || (positive && result === 0)) {
    invalid(`${label} must be ${positive ? 'greater than zero' : 'zero or more'} and at most ${max}.`);
  }
  return result;
}

function date(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    invalid(`${label} must be a valid date.`);
  }
  return value;
}

function normalizeQuotation(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Quotation is required.');
  const clientName = text(input.clientName, 'Client name', 180, true);
  const clientEmail = text(input.clientEmail, 'Client email', 180);
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) invalid('Client email is invalid.');
  const issuedOn = date(input.issuedOn, 'Issue date');
  const validUntil = date(input.validUntil, 'Valid until');
  if (validUntil < issuedOn) invalid('Valid until must be on or after the issue date.');
  if (!['PHP', 'USD'].includes(input.currency)) invalid('Choose PHP or USD.');
  const quoteType = input.quoteType || 'project';
  if (!['project', 'subscription', 'pos'].includes(quoteType)) invalid('Choose a valid quotation type.');
  const billingPeriod = input.billingPeriod || 'monthly';
  if (!['monthly', 'yearly'].includes(billingPeriod)) invalid('Choose monthly or yearly subscription billing.');
  const clientFlow = input.clientFlow ?? 'full';
  if (!['full', 'quotation_only'].includes(clientFlow)) invalid('Choose a valid client response flow.');
  const contractSource = input.contractSource || 'default';
  if (!['default', 'pdf'].includes(contractSource)) invalid('Choose a valid contract source.');
  let contractPdf;
  if (contractSource === 'pdf') {
    const file = input.contractPdf;
    if (!file || !/^[a-f0-9-]{36}$/i.test(file.id) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isInteger(file.byteLength) || file.byteLength < 1 || file.byteLength > 2 * 1024 * 1024 || !Number.isInteger(file.pageCount) || file.pageCount < 1 || file.pageCount > 100) invalid('Choose a valid uploaded PDF contract.');
    contractPdf = { id: file.id, sha256: file.sha256, fileName: text(file.fileName, 'PDF name', 180, true), byteLength: file.byteLength, pageCount: file.pageCount };
  }
  const contractText = text(input.contractText, 'Contract terms', 30000);
  if (clientFlow !== 'quotation_only' && !quotationContract({ quoteType, contractText, contractSource, contractPdf })) invalid('Enter the contract terms for this subscription or POS quotation before saving.');
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) invalid('Add between 1 and 100 line items.');
  const items = input.items.map((item) => {
    if (!item || typeof item !== 'object') invalid('Invalid line item.');
    const description = text(item.description, 'Item description', 2000, true);
    const quantity = Math.round(number(item.quantity, 'Quantity', 100000, true) * 1000) / 1000;
    if (!quantity) invalid('Quantity must be at least 0.001.');
    const unitPrice = Math.round(number(item.unitPrice, 'Unit price', 100000000) * 100) / 100;
    const chargeType = item.chargeType || 'one_time';
    if (!['one_time', 'setup', 'addon', 'milestone', 'recurring'].includes(chargeType)) invalid('Choose a valid charge type for each item.');
    if (quoteType === 'project' && chargeType === 'recurring') invalid('Choose subscription or POS to include recurring charges.');
    if (item.scope !== undefined && (!Array.isArray(item.scope) || item.scope.length > 30)) invalid('Use at most 30 scope sections per item.');
    const scope = (item.scope || []).map((group) => {
      if (!group || typeof group !== 'object' || Array.isArray(group)) invalid('Invalid scope section.');
      return { title: text(group.title, 'Scope heading', 300, true), details: text(group.details, 'Scope details', 5000) };
    });
    if (item.subscriptionRole !== undefined && !['current', 'additional'].includes(item.subscriptionRole)) invalid('Invalid subscription component.');
    return { description, quantity, unitPrice, scope, chargeType, ...(item.subscriptionRole ? { subscriptionRole: item.subscriptionRole } : {}), amount: Math.round(quantity * Math.round(unitPrice * 100)) / 100 };
  });
  if (quoteType === 'subscription' && !items.some((item) => item.chargeType === 'recurring')) invalid('Add a recurring plan item for this subscription quotation.');
  if (quoteType === 'subscription' && !items.some((item) => item.chargeType === 'setup')) invalid('Add a one-time setup fee for this subscription quotation. Enter zero if the setup fee is waived.');
  const subtotalCents = items.filter((item) => item.chargeType !== 'recurring').reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const recurringSubtotalCents = items.filter((item) => item.chargeType === 'recurring').reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const discountCents = Math.round(number(input.discount ?? 0, 'Discount', subtotalCents / 100) * 100);
  const taxRate = Math.round(number(input.taxRate ?? 0, 'Tax rate', 100) * 100) / 100;
  const taxCents = Math.round((subtotalCents - discountCents) * taxRate / 100);
  const recurringTaxCents = Math.round(recurringSubtotalCents * taxRate / 100);
  if (input.contractDetails !== undefined && (!input.contractDetails || typeof input.contractDetails !== 'object' || Array.isArray(input.contractDetails))) invalid('Contract details must be an object.');
  const initialPaymentPercent = input.initialPaymentPercent !== undefined && input.initialPaymentPercent !== '' && input.initialPaymentPercent !== null ? number(input.initialPaymentPercent, 'Initial payment percentage', 100) : quoteType === 'pos' ? 100 : undefined;
  const contractDetails = Object.fromEntries(['agreementDate', 'authorizedRepresentative', 'clientPosition', 'providerRepresentative', 'providerPosition', 'branches', 'effectiveDate', 'minimumPeriod', 'billingCommencement', 'paymentTerms', 'gracePeriod', 'terminationTerms', 'initialBillingTerms'].map((key) => [key, text(input.contractDetails?.[key], 'Contract details', key === 'paymentTerms' || key === 'terminationTerms' ? 2000 : 500)]));
  if (quoteType === 'pos' && initialPaymentPercent === 100 && !contractDetails.paymentTerms) contractDetails.paymentTerms = billingPeriod === 'yearly' ? defaultPosPaymentTerms.replace('monthly subscription fee', 'yearly subscription fee') : defaultPosPaymentTerms;
  if (items.some((item) => item.chargeType === 'recurring') && !contractDetails.billingCommencement) contractDetails.billingCommencement = defaultBillingCommencement;
  let monthlySubscription;
  if (input.monthlySubscription != null) {
    const config = input.monthlySubscription;
    if (!config || typeof config !== 'object' || Array.isArray(config) || quoteType === 'project' || billingPeriod !== 'monthly') invalid('Monthly subscription adjustments require monthly POS or custom subscription billing.');
    const currentAmount = Math.round(number(config.currentAmount, 'Current monthly subscription', 100000000) * 100) / 100;
    const additionalAmount = Math.round(number(config.additionalAmount, 'Additional monthly charge', 100000000) * 100) / 100;
    const systemName = text(config.systemName, 'System name', 180, true);
    if (currentAmount + additionalAmount <= 0 || Math.round(currentAmount * 100) + Math.round(additionalAmount * 100) !== recurringSubtotalCents) invalid('Current subscription plus the additional monthly charge must match the recurring line items.');
    const components = items.filter(item => item.chargeType === 'recurring');
    const current = components.filter(item => item.subscriptionRole === 'current');
    const additional = components.filter(item => item.subscriptionRole === 'additional');
    if (current.length !== 1 || current[0].quantity !== 1 || current[0].unitPrice !== currentAmount || additional.length > 1 || (additionalAmount > 0 && additional.length !== 1) || additional.some(item => item.quantity !== 1 || item.unitPrice !== additionalAmount) || components.length !== current.length + additional.length) invalid('Use the monthly subscription fields to set the current and additional recurring charges.');
    monthlySubscription = { currentAmount, additionalAmount, systemName };
    const summary = monthlySubscriptionSummary({ monthlySubscription, taxRate, currency: input.currency, quoteType });
    monthlySubscription.notice = summary.notice;
    contractDetails.billingCommencement = `The ${additionalAmount > 0 ? 'revised monthly subscription' : 'monthly subscription'} will only commence after the official Go-Live of your ${systemName}.`;
  }
  return {
    title: text(input.title, 'Project title', 180, true), quoteType, billingPeriod, clientName, clientEmail,
    ...(input.clientFlow !== undefined ? { clientFlow } : {}),
    clientAddress: text(input.clientAddress, 'Client address', 1000),
    issuedOn, validUntil, currency: input.currency, items,
    discount: discountCents / 100, taxRate,
    notes: text(input.notes, 'Notes and terms', 10000),
    ...(input.paymentInstructions !== undefined ? { paymentInstructions: text(input.paymentInstructions, 'Payment instructions', 5000) } : {}),
    ...(initialPaymentPercent !== undefined ? { initialPaymentPercent } : {}),
    contractText,
    ...(input.contractSource !== undefined ? { contractSource } : {}),
    ...(contractPdf ? { contractPdf } : {}),
    ...(input.contractStyle != null ? { contractStyle: normalizeContractStyle(input.contractStyle) } : {}),
    contractDetails,
    ...(monthlySubscription ? { monthlySubscription } : {}),
    timeline: text(input.timeline, 'Project timeline', 180),
    subtotal: subtotalCents / 100, tax: taxCents / 100,
    total: (subtotalCents - discountCents + taxCents) / 100,
    hasRecurring: items.some((item) => item.chargeType === 'recurring'),
    recurringSubtotal: recurringSubtotalCents / 100, recurringTax: recurringTaxCents / 100,
    recurringTotal: (recurringSubtotalCents + recurringTaxCents) / 100
  };
}

module.exports = { normalizeQuotation };
