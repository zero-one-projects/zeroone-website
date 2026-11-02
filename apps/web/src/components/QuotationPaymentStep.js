import { useState } from 'react';
import { quotationPaymentSummary } from '../utils/quotation';
import PaymentProofForm from './PaymentProofForm';
export default function QuotationPaymentStep({ quotation, onDownload, downloading, error, token, session, onVerified }) {
  const document = quotation.document;
  const [showProofForm, setShowProofForm] = useState(false);
  const paymentInstructions = document.paymentInstructions?.trim() || quotation.paymentInstructions;
  const summary = quotationPaymentSummary(quotation);
  const pos = document.quoteType === 'pos';
  const hasOtherOneTimeCharges = document.items?.some(item => item.chargeType !== 'setup' && item.chargeType !== 'recurring' && Number(item.unitPrice) > 0);
  const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: document.currency || 'PHP' }).format(value);
  return <section aria-label="Payment details" className="grid gap-5">
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="font-bold text-emerald-900">Contract Signed Successfully</h3><p className="mt-3 text-sm leading-6 text-emerald-900">Your contract has been signed successfully. A PDF copy of the signed agreement will be sent to your verified email address, with copies provided to Zero One’s Billing and Sales teams.</p><p className="mt-3 text-sm leading-6 text-emerald-900">You may now proceed with payment according to the terms outlined in your agreement.</p></div>
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Project details</p><p className="mt-3 font-bold">{quotation.reference}</p><p className="mt-2 font-bold">{document.title}</p>
      <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 border-t border-slate-200 pt-5">
        <dt>{pos ? hasOtherOneTimeCharges ? 'Total One-Time Setup & Add-on Fees' : 'Total One-Time Setup Fee' : document.hasRecurring ? 'Total One-Time Charges' : 'Total Contract Amount'}</dt><dd className="font-bold">{money(summary.contractTotal)}</dd>
        <dt className="font-bold text-[#514568]">Amount Currently Due{summary.initialPercent !== null ? ` (${summary.initialPercent}%)` : ''}</dt><dd className="text-lg font-bold text-[#514568]">{summary.amountDue === null ? 'See signed agreement' : money(summary.amountDue)}</dd>
        <dt>{pos ? 'Remaining Setup Balance After This Payment' : 'Balance Scheduled After This Payment'}</dt><dd className="font-bold">{summary.scheduledRemaining === null ? 'See signed agreement' : money(summary.scheduledRemaining)}</dd>
        {document.hasRecurring && <><dt>{document.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Subscription</dt><dd className="font-bold">{money(document.recurringTotal)}/{document.billingPeriod === 'yearly' ? 'year' : 'month'}</dd></>}
      </dl>
      {pos && document.hasRecurring && <p className="mt-4 text-sm leading-6 text-slate-600">{document.contractDetails?.billingCommencement || `${document.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} subscription billing will begin upon the official go-live of the POS system.`}</p>}
      {pos && document.contractDetails?.paymentTerms && <div className="mt-5 border-t border-slate-200 pt-5"><h3 className="font-bold">Payment Terms</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{document.contractDetails.paymentTerms}</p></div>}
      <p className="mt-4 text-xs leading-6 text-slate-500">These amounts describe the payment schedule, not a record of confirmed payments. Follow the payment milestones in your signed agreement. Signing alone does not confirm payment.</p>
    </div>
    <div><h3 className="font-bold">Payment Instructions</h3>{paymentInstructions?.trim() ? <><p className="mt-3 text-sm leading-6 text-slate-600">Please make your payment using the bank details below, following the payment schedule in your signed agreement.</p><p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-7 text-slate-700">{paymentInstructions}</p></> : <p className="mt-3 text-sm leading-7 text-slate-600">Please contact Zero One’s billing team for the bank or payment details before making your payment.</p>}<p className="mt-3 text-sm leading-6 text-slate-600">Once payment is complete, submit your proof of payment for review by our Sales and Billing teams. Payments are subject to confirmation by Zero One Information Technology Inc.</p></div>
    <div className="flex flex-wrap gap-3">{token && <button type="button" className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" onClick={() => setShowProofForm(true)}>Submit Proof of Payment</button>}{onDownload && <button className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-[#514568] disabled:opacity-50" type="button" disabled={downloading} onClick={onDownload}>{downloading ? 'Preparing PDF…' : 'Download Signed Contract'}</button>}</div>
    {showProofForm && <PaymentProofForm quotation={quotation} token={token} session={session} onVerified={onVerified} onClose={() => setShowProofForm(false)} />}
    <p className="text-sm leading-6 text-slate-600">For payment assistance, contact <a className="font-bold text-[#514568] underline" href="mailto:billing@zerooneitinc.com">billing@zerooneitinc.com</a>. You can also email your proof of payment to <a className="font-bold text-[#514568] underline" href="mailto:billing@zerooneitinc.com?cc=sales%40zerooneitinc.com">billing@zerooneitinc.com</a> with a copy to sales@zerooneitinc.com.</p>
    {error && <p className="text-sm text-rose-800" role="alert">{error}</p>}
  </section>;
}
