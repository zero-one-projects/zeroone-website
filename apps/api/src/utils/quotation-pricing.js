function recurringChargeText(payload) {
  if (!payload.hasRecurring) return '';
  const amount = new Intl.NumberFormat('en-PH', { style: 'currency', currency: payload.currency }).format(payload.recurringTotal);
  return `${amount} / ${payload.billingPeriod === 'yearly' ? 'year' : 'month'}`;
}
module.exports = { recurringChargeText };

function monthlySubscriptionSummary(document) {
  const config = document.monthlySubscription;
  if (!config) return null;
  const currentCents = Math.round(Number(config.currentAmount || 0) * 100);
  const additionalCents = Math.round(Number(config.additionalAmount || 0) * 100);
  const taxRate = Number(document.taxRate || 0);
  const current = currentCents + Math.round(currentCents * taxRate / 100);
  const revised = currentCents + additionalCents + Math.round((currentCents + additionalCents) * taxRate / 100);
  const money = amount => new Intl.NumberFormat('en-PH', { style: 'currency', currency: document.currency || 'PHP' }).format(amount / 100);
  const systemName = config.systemName || (document.quoteType === 'pos' ? 'POS System' : document.quoteType === 'sync_court' ? 'Sync Court' : 'System');
  const notice = additionalCents > 0
    ? `This will require an additional monthly charge of ${money(revised - current)}, adjusting your subscription from ${money(current)} to ${money(revised)} per month. Please note that the revised monthly subscription will only commence after the official Go-Live of your ${systemName}.`
    : `Your monthly subscription of ${money(revised)} will only commence after the official Go-Live of your ${systemName}.`;
  return { currentAmount: current / 100, additionalAmount: (revised - current) / 100, revisedAmount: revised / 100, systemName, notice };
}
module.exports.monthlySubscriptionSummary = monthlySubscriptionSummary;
