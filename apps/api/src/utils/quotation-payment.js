const defaultPaymentInstructions = 'Bank: AUB (ASIA UNITED BANK)\nAccount name: Zero One Information Technology Inc.\nAccount number: 310-11-003883-1';

const defaultPosPaymentTerms = 'The one-time POS setup fee is payable in full (100%) upon signing the agreement and before the commencement of system setup and configuration.\n\nThe monthly subscription fee will commence only upon the official Go-Live of the POS system, in accordance with the signed agreement.\n\nPayment is subject to verification and confirmation by Zero One Information Technology Inc.';

module.exports = { defaultPaymentInstructions, defaultPosPaymentTerms };


function paymentSummary(document, contractText = '') {
  const totalCents = Math.round(Number(document.total) * 100);
  const match = (!document.quoteType || document.quoteType === 'project') ? contractText.replace(/\*\*/g, '').match(/\b(\d+(?:\.\d+)?)%\s*(?:[-–—]\s*)?(?:Down Payment|Upfront payment)/i) : null;
  const raw = document.initialPaymentPercent ?? match?.[1];
  const percent = raw === undefined || raw === null || raw === '' ? null : Number(raw);
  const initialPercent = percent !== null && Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : null;
  const dueCents = initialPercent === null ? null : Math.round(totalCents * initialPercent / 100);
  return { contractTotal: totalCents / 100, initialPercent, amountDue: dueCents === null ? null : dueCents / 100,
    scheduledRemaining: dueCents === null ? null : (totalCents - dueCents) / 100 };
}
module.exports.paymentSummary = paymentSummary;
