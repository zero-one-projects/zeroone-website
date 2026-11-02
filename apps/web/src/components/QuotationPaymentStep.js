export default function QuotationPaymentStep({ quotation, onDownload, downloading, error }) {
  const document = quotation.document;
  const paymentInstructions = document.paymentInstructions?.trim() || quotation.paymentInstructions;
  const quotedPercent = (!document.quoteType || document.quoteType === 'project') ? quotation.contractText?.replace(/\*\*/g, '').match(/\b(\d+(?:\.\d+)?)%\s*(?:[-–—]\s*)?(?:Down Payment|Upfront payment)/i)?.[1] : null;
  const initialPercent = document.initialPaymentPercent ?? (quotedPercent != null && Number(quotedPercent) <= 100 ? Number(quotedPercent) : null);
  const amount = initialPercent == null ? null : Math.round(Number(document.total) * Number(initialPercent)) / 100;
  const money = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: document.currency || 'PHP' }).format(value);
  return <section aria-label="Payment details" className="grid gap-5">
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-bold text-emerald-900">Contract signed successfully</h3><p className="mt-2 text-sm leading-6 text-emerald-900">A signed PDF copy is queued for your verified email and Zero One’s billing and sales teams. You can now proceed to payment.</p></div>
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-bold">{quotation.reference} · {document.title}</p><p className="mt-2">{document.hasRecurring ? 'One-time charges' : 'Agreed project total'}: <strong>{money(document.total)}</strong></p>{amount != null && <p className="mt-2 text-base">Initial payment ({initialPercent}%): <strong>{money(amount)}</strong></p>}<p className="mt-2 text-xs leading-5 text-slate-500">Follow the payment milestones in your signed contract. Signing alone does not confirm payment.</p></div>
    <div><h3 className="font-bold">Payment instructions</h3>{paymentInstructions?.trim() ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{paymentInstructions}</p> : <p className="mt-3 text-sm leading-7 text-slate-600">Please contact Zero One’s billing team for the bank or payment details before making your payment.</p>}</div>
    <div className="flex flex-wrap gap-3">{onDownload && <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-50" type="button" disabled={downloading} onClick={onDownload}>{downloading ? 'Preparing PDF…' : 'Download Signed Contract'}</button>}<a className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#514568]" href={`mailto:billing@zerooneitinc.com?subject=${encodeURIComponent(`Payment for ${quotation.reference}`)}`}>Contact Billing</a></div>
    {error && <p className="text-sm text-rose-800" role="alert">{error}</p>}
  </section>;
}
