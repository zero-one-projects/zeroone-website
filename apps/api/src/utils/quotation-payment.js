const defaultPaymentInstructions = 'Bank: AUB (ASIA UNITED BANK)\nAccount name: Zero One Information Technology Inc.\nAccount number: 310-11-003883-1';

module.exports = { defaultPaymentInstructions };


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
