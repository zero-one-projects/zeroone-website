import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { configureMonthlySubscription } from '../utils/quotation';
import { posPurposeLabels, posUpgradeTerms } from '../utils/posUpgrade';

export default function PosQuotationPurpose({ document, token, onChange }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const linked = ['upgrade', 'customization'].includes(document.posPurpose);
  const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm';
  useEffect(() => {
    if (!linked) return undefined;
    const controller = new AbortController(); setLoading(true); setError('');
    fetch(`${getApiBaseUrl()}/api/admin/quotations/pos-subscriptions`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Unable to load signed POS subscriptions.'); return payload; })
      .then(payload => { if (!controller.signal.aborted) setSubscriptions(payload.subscriptions || []); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [linked, token, revision]);
  const selected = subscriptions.find(row => row.id === Number(document.baseQuotationId));
  const money = (amount, currency) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency || document.currency }).format(amount);
  function purpose(value) {
    let next = { ...document, posPurpose: value, baseQuotationId: undefined, baseQuotationReference: undefined, posUpgradeTerms: value === 'customization' ? undefined : posUpgradeTerms, monthlySubscription: undefined };
    if (value === 'customization') {
      next.items = document.items.filter(item => item.chargeType !== 'recurring');
      if (!next.items.length) next.items = [{ description: '', chargeType: 'addon', quantity: 1, unitPrice: 0 }];
    } else if (value === 'upgrade') next = configureMonthlySubscription({ ...next, clientFlow: 'full' }, { currentAmount: 0, additionalAmount: 0 });
    else if (document.monthlySubscription) next = configureMonthlySubscription(next, { currentAmount: 0, additionalAmount: Number(document.monthlySubscription.currentAmount) + Number(document.monthlySubscription.additionalAmount) });
    onChange(next);
  }
  function select(id) {
    const row = subscriptions.find(item => item.id === Number(id));
    if (!row) { onChange({ ...document, baseQuotationId: undefined }); return; }
    let next = { ...document, baseQuotationId: row.id, baseQuotationReference: row.reference, clientName: row.clientName, clientEmail: row.clientEmail, clientAddress: row.clientAddress, currency: row.currency, taxRate: row.taxRate };
    if (document.posPurpose === 'upgrade') next = configureMonthlySubscription(next, { currentAmount: row.currentAmount, additionalAmount: document.monthlySubscription?.additionalAmount || 0 });
    onChange(next);
  }
  async function download(event) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/contracts/signed-copy`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ quotationId: event.quotationId, documentHash: event.documentHash }) });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.message || 'Unable to download the signed agreement.'); }
      const url = URL.createObjectURL(await response.blob()); const a = window.document.createElement('a'); a.href = url; a.download = `${event.reference}-signed.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (failure) { setError(failure.message); }
  }
  return <section className="grid gap-4 rounded-xl border border-slate-200 p-4" aria-label="POS quotation purpose">
    <h3 className="font-bold">Quotation purpose</h3>
    {Object.entries(posPurposeLabels).map(([value, label]) => <label key={value} className="flex items-center gap-3 text-sm"><input type="radio" name="pos-purpose" value={value} checked={document.posPurpose === value} onChange={() => purpose(value)} />{label}</label>)}
    {!document.posPurpose && <p className="text-xs text-slate-500">Existing quotation. Choose a purpose to use the new subscription or upgrade workflow.</p>}
    {document.posPurpose === 'new' && <p className="text-sm text-slate-600">{document.billingPeriod === 'yearly' ? 'Enter the agreed setup fee, yearly plan price, and included features.' : 'Enter the base monthly subscription in Current monthly subscription. Enter any extra recurring fee in Additional monthly charge, or leave it at zero. The two amounts form the initial monthly total.'} Billing starts at official Go-Live.</p>}
    {document.posPurpose === 'customization' && <p className="text-sm text-slate-600">One-time fees only. This quotation does not change the client's existing monthly subscription.</p>}
    {linked && <>
      <label className="grid gap-2 text-sm font-bold">Existing signed POS subscription<select className={field} required disabled={loading} value={document.baseQuotationId || ''} onChange={event => select(event.target.value)}><option value="">{loading ? 'Loading subscriptions…' : 'Select a subscription'}</option>{subscriptions.map(row => <option value={row.id} key={row.id}>{row.reference} · {row.clientName} · {money(row.latestRecurringTotal, row.currency)} / month</option>)}</select></label>
      <button type="button" className="justify-self-start text-sm font-bold text-[#514568]" onClick={() => setRevision(value => value + 1)}>Refresh subscriptions</button>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!loading && !error && !subscriptions.length && <p className="text-sm text-slate-500">No signed monthly POS subscriptions are available yet.</p>}
      {document.posPurpose === 'upgrade' && <label className="grid gap-2 text-sm font-bold">Agreed upgrade effective date<input className={field} type="date" required min={selected?.effectiveOn} value={document.contractDetails?.effectiveDate || ''} onChange={event => onChange(configureMonthlySubscription({ ...document, contractDetails: { ...document.contractDetails, effectiveDate: event.target.value } }))} /></label>}
      {selected && <div className="grid gap-2 border-t border-slate-200 pt-4 text-sm"><h4 className="font-bold">Signed subscription and rate history</h4>{selected.rateHistory.map(event => <div key={`${event.quotationId}-${event.documentHash}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2"><span>{event.reference} · {event.kind === 'customization' ? 'One-time customization' : `${money(event.recurringTotal, selected.currency)} / month`} · Effective {event.effectiveOn}</span><button type="button" className="font-bold text-[#514568]" onClick={() => download(event)}>Download signed {event.kind === 'upgrade' ? 'addendum' : 'agreement'}</button></div>)}</div>}
    </>}
  </section>;
}
