export const defaultPosPaymentTerms = 'The one-time POS setup fee is payable in full (100%) upon signing the agreement and before the commencement of system setup and configuration.\n\nThe monthly subscription fee will commence only upon the official Go-Live of the POS system, in accordance with the signed agreement.\n\nPayment is subject to verification and confirmation by Zero One Information Technology Inc.';

export const defaultBillingCommencement = 'After the official system go-live date.';

export function quotationTotals(document) {
  const amounts = document.items.map((item) => {
    const quantity = Math.round((Number(item.quantity) || 0) * 1000) / 1000;
    const price = Math.round((Number(item.unitPrice) || 0) * 100);
    return Math.round(quantity * price);
  });
  const subtotal = amounts.reduce((sum, value, index) => sum + (document.items[index].chargeType === 'recurring' ? 0 : value), 0);
  const recurringSubtotal = amounts.reduce((sum, value, index) => sum + (document.items[index].chargeType === 'recurring' ? value : 0), 0);
  const discount = Math.round((Number(document.discount) || 0) * 100);
  const taxRate = Math.round((Number(document.taxRate) || 0) * 100) / 100;
  const tax = Math.round((subtotal - discount) * taxRate / 100);
  const recurringTax = Math.round(recurringSubtotal * taxRate / 100);
  return { amounts: amounts.map((value) => value / 100), subtotal: subtotal / 100,
    tax: tax / 100, total: (subtotal - discount + tax) / 100,
    hasRecurring: document.items.some((item) => item.chargeType === 'recurring'),
    recurringSubtotal: recurringSubtotal / 100, recurringTax: recurringTax / 100, recurringTotal: (recurringSubtotal + recurringTax) / 100 };
}

export function newQuotation() {
  const today = new Date();
  const later = new Date(today);
  later.setDate(later.getDate() + 15);
  const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { title: '', clientFlow: 'quotation_only', quoteType: 'project', billingPeriod: 'monthly', clientName: '', clientEmail: '', clientAddress: '',
    issuedOn: localDate(today), validUntil: localDate(later), currency: 'PHP',
    items: [{ description: '', quantity: 1, unitPrice: 0 }], discount: 0, taxRate: 0, notes: '', timeline: '', paymentInstructions: undefined, initialPaymentPercent: 20 };
}

export function monthlySubscriptionSummary(document) {
  const config = document.monthlySubscription;
  if (!config) return null;
  const currentCents = Math.round(Number(config.currentAmount || 0) * 100);
  const additionalCents = Math.round(Number(config.additionalAmount || 0) * 100);
  const taxRate = Number(document.taxRate || 0);
  const current = currentCents + Math.round(currentCents * taxRate / 100);
  const revised = currentCents + additionalCents + Math.round((currentCents + additionalCents) * taxRate / 100);
  return { currentAmount: current / 100, additionalAmount: (revised - current) / 100, revisedAmount: revised / 100, systemName: config.systemName || (document.quoteType === 'pos' ? 'POS System' : 'System') };
}

export function configureMonthlySubscription(document, changes = {}) {
  const recurring = document.items.filter(item => item.chargeType === 'recurring');
  const config = { currentAmount: quotationTotals(document).recurringSubtotal, additionalAmount: 0, systemName: document.quoteType === 'pos' ? 'POS System' : 'System', ...document.monthlySubscription, ...changes };
  let base = recurring.find(item => item.subscriptionRole === 'current');
  if (!base && recurring.length === 1) base = recurring[0];
  if (!base && recurring.length > 1) {
    const scope = recurring.map((item, index) => ({ title: `Existing subscription service ${index + 1}`, details: [item.description, ...(item.scope || []).map(group => `${group.title}\n${group.details || ''}`)].join('\n\n') }));
    if (scope.length > 30 || scope.some(group => group.details.length > 5000)) throw new Error('The existing recurring scope is too long to combine. Keep the line items and enter the Go-Live terms in Notes / payment terms instead.');
    base = { description: 'Base Monthly Subscription', scope };
  }
  const addition = recurring.find(item => item.subscriptionRole === 'additional');
  const keepAddition = Number(config.additionalAmount) > 0 || Boolean(addition?.scope?.length || (addition?.description?.trim() && addition.description !== 'Additional monthly subscription charge'));
  const items = [...document.items.filter(item => item.chargeType !== 'recurring'),
    { ...base, description: base?.description || 'Base Monthly Subscription', chargeType: 'recurring', subscriptionRole: 'current', quantity: 1, unitPrice: config.currentAmount },
    ...(keepAddition ? [{ ...addition, description: addition?.description || 'Additional monthly subscription charge', chargeType: 'recurring', subscriptionRole: 'additional', quantity: 1, unitPrice: config.additionalAmount }] : [])];
  if (items.length > 100) throw new Error('Remove a line item to make room for the current subscription and additional monthly charge.');
  return { ...document, billingPeriod: 'monthly', monthlySubscription: config, items, contractDetails: { ...document.contractDetails, billingCommencement: `The ${Number(config.additionalAmount) > 0 ? 'revised monthly subscription' : 'monthly subscription'} will only commence after the official Go-Live of your ${config.systemName || 'System'}.` } };
}


export function quotationPaymentSummary(quotation) {
  if (quotation.paymentSummary) return quotation.paymentSummary;
  const document = quotation.document;
  const totalCents = Math.round(Number(document.total) * 100);
  const match = (!document.quoteType || document.quoteType === 'project') ? quotation.contractText?.replace(/\*\*/g, '').match(/\b(\d+(?:\.\d+)?)%\s*(?:[-–—]\s*)?(?:Down Payment|Upfront payment)/i) : null;
  const raw = document.initialPaymentPercent ?? match?.[1];
  const value = raw === undefined || raw === null || raw === '' ? null : Number(raw);
  const initialPercent = value !== null && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  const dueCents = initialPercent === null ? null : Math.round(totalCents * initialPercent / 100);
  return { contractTotal: totalCents / 100, initialPercent, amountDue: dueCents === null ? null : dueCents / 100, scheduledRemaining: dueCents === null ? null : (totalCents - dueCents) / 100 };
}
