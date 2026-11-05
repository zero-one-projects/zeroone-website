const title = 'Subscription Fee Adjustments';
const terms = `Additional features, customizations, integrations, or server upgrades may result in increased one-time charges and monthly subscription fees.
All additional charges and revised fees require the Client's written approval through a quotation or addendum.
Once approved, the revised monthly fee shall become the new permanent subscription rate, including renewals, unless otherwise mutually agreed in writing.`;
const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
function normalizePosPurpose(input, document) {
  if (input.posPurpose === undefined) return {};
  if (document.quoteType !== 'pos' || !['new', 'upgrade', 'customization'].includes(input.posPurpose)) fail('Choose a valid POS quotation purpose.');
  const posPurpose = input.posPurpose;
  if (posPurpose === 'customization' && document.hasRecurring) fail('One-time customization cannot contain recurring charges.');
  if (posPurpose !== 'new' && (!Number.isSafeInteger(Number(input.baseQuotationId)) || Number(input.baseQuotationId) < 1)) fail('Select the existing signed POS subscription.');
  if (posPurpose === 'upgrade' && (document.billingPeriod !== 'monthly' || !document.monthlySubscription || Number(document.monthlySubscription.additionalAmount) <= 0)) fail('An upgrade needs a current monthly rate and a positive additional monthly charge.');
  if (posPurpose === 'upgrade' && document.clientFlow === 'quotation_only') fail('POS upgrades require contract signing after acceptance.');
  const effectiveOn = document.contractDetails.effectiveDate;
  if ((posPurpose === 'upgrade' || effectiveOn) && (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveOn) || !Number.isFinite(Date.parse(effectiveOn)) || new Date(effectiveOn).toISOString().slice(0, 10) !== effectiveOn)) fail('Choose a valid agreed subscription effective date.');
  return { posPurpose, ...(posPurpose !== 'new' ? { baseQuotationId: Number(input.baseQuotationId), ...(typeof input.baseQuotationReference === 'string' ? { baseQuotationReference: input.baseQuotationReference.slice(0, 80) } : {}) } : {}), ...(posPurpose !== 'customization' && document.billingPeriod === 'monthly' ? { posUpgradeTerms: terms } : {}) };
}
function latestRate(revisions, on) {
  return revisions.filter(revision => revision.kind !== 'customization' && (!on || revision.effectiveOn <= on)).sort((a, b) => a.effectiveOn.localeCompare(b.effectiveOn) || a.sequence - b.sequence).at(-1);
}
module.exports = { title, terms, normalizePosPurpose, latestRate, fail };
