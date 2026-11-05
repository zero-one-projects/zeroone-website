function posContractRows(document, reference, template = false) {
  const details = document.contractDetails || {};
  const items = document.items || [];
  const amounts = items.map(item => Math.round((Math.round(Number(item.quantity || 0) * 1000) / 1000) * Math.round(Number(item.unitPrice || 0) * 100)));
  const setup = amounts.reduce((sum, amount, index) => sum + (items[index].chargeType === 'setup' ? amount : 0), 0);
  const recurring = amounts.reduce((sum, amount, index) => sum + (items[index].chargeType === 'recurring' ? amount : 0), 0);
  const recurringTax = Math.round(recurring * (Math.round(Number(document.taxRate || 0) * 100) / 100) / 100);
  const money = cents => `${document.currency} ${(cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const addons = items.flatMap((item, index) => item.chargeType === 'addon' ? [`${item.description} — ${money(amounts[index])}`] : []);
  const rows = [
    ['Client / Business Name', document.clientName],
    ['Quotation Reference', reference],
    ['Subscription Package', document.title],
    ['One-Time Setup & Implementation Fee', money(setup)],
    [document.billingPeriod === 'yearly' ? 'Yearly Subscription Fee' : 'Monthly Subscription Fee', items.some(item => item.chargeType === 'recurring') ? money(recurring + recurringTax) : 'No recurring subscription quoted'],
    ['Additional Features', addons.join('\n') || 'No additional features quoted'],
    ['Subscription Effective Date', details.effectiveDate || details.billingCommencement || 'As specified in the approved quotation'],
    ['Minimum Subscription Period', details.minimumPeriod || 'Based on agreed terms']
  ];
  return rows.map(([label, value]) => [label, template ? '' : value || '']);
}

module.exports = { posContractRows };
