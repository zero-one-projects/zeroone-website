import { quotationTotals } from '../utils/quotation';

export default function PosContractSummary({ document, reference, templatePreview = false }) {
  const details = document.contractDetails || {};
  const totals = quotationTotals(document);
  const money = amount => templatePreview ? '' : `${document.currency} ${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const setupCents = document.items.reduce((sum, item, index) => sum + (item.chargeType === 'setup' ? Math.round(totals.amounts[index] * 100) : 0), 0);
  const addons = document.items.flatMap((item, index) => item.chargeType === 'addon' ? [`${item.description} — ${money(totals.amounts[index])}`] : []);
  const rows = [
    ['Client / Business Name', templatePreview ? '' : document.clientName],
    ['Quotation Reference', templatePreview ? '' : reference],
    ['Subscription Package', templatePreview ? '' : document.title],
    ['One-Time Setup & Implementation Fee', money(setupCents / 100)],
    [document.billingPeriod === 'yearly' ? 'Yearly Subscription Fee' : 'Monthly Subscription Fee', templatePreview ? '' : totals.hasRecurring ? money(totals.recurringTotal) : 'No recurring subscription quoted'],
    ['Additional Features', templatePreview ? '' : addons.join('\n') || 'No additional features quoted'],
    ['Subscription Effective Date', templatePreview ? '' : details.effectiveDate || details.billingCommencement || 'As specified in the approved quotation'],
    ['Minimum Subscription Period', templatePreview ? '' : details.minimumPeriod || 'Based on agreed terms']
  ];
  return <section aria-label="POS subscription order details">
    <table className="contract-data my-4 w-full border-collapse text-left text-sm"><thead><tr><th className="border border-slate-200 bg-slate-50 p-3">Particulars</th><th className="border border-slate-200 bg-slate-50 p-3">Details</th></tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><td className="border border-slate-200 p-3 align-top">{label}</td><td className="whitespace-pre-line break-words border border-slate-200 p-3 align-top">{value || ''}</td></tr>)}</tbody></table>
    {!templatePreview && <p className="contract-small mb-4 text-xs leading-5 text-slate-500">Amounts are taken from quotation {reference || 'DRAFT'}. Setup and additional feature fees are shown before quotation-level discounts and tax. The subscription fee includes any quoted recurring tax. See the approved quotation for the total one-time charges.</p>}
  </section>;
}
