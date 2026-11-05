export const posUpgradeTitle = 'Subscription Fee Adjustments';
export const posUpgradeTerms = `Additional features, customizations, integrations, or server upgrades may result in increased one-time charges and monthly subscription fees.
All additional charges and revised fees require the Client's written approval through a quotation or addendum.
Once approved, the revised monthly fee shall become the new permanent subscription rate, including renewals, unless otherwise mutually agreed in writing.`;
export const posPurposeLabels = { new: 'POS Subscription', upgrade: 'Existing POS Subscription Upgrade', customization: 'Additional One-Time Customization Only' };
export function posBillingRate(subscription, period, issuedOn) {
  if (!subscription?.rateHistory || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return subscription?.recurringTotal || 0;
  const end = new Date(`${period}-01T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const cutoff = [issuedOn, `${period}-01`].sort().at(-1);
  const on = cutoff < end.toISOString().slice(0, 10) ? cutoff : end.toISOString().slice(0, 10);
  return subscription.rateHistory.filter(event => event.kind !== 'customization' && event.effectiveOn <= on).at(-1)?.recurringTotal || 0;
}
