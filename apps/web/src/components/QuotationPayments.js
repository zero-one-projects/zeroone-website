import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950';
const paymentMethods = [['bank_transfer', 'Bank transfer'], ['cash', 'Cash'], ['gcash', 'GCash'], ['maya', 'Maya'], ['cheque', 'Cheque'], ['other', 'Other']];
const manilaToday = () => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(value => value.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const methodLabel = value => paymentMethods.find(([key]) => key === value)?.[1] || value;

export default function QuotationPayments({ token, quotation, dirty }) {
  const [payments, setPayments] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const signed = Boolean(quotation.contractState?.clientSignedAt || (quotation.clientResponse?.current && quotation.clientResponse.signedAt));
  const base = `${getApiBaseUrl()}/api/admin/quotations/${quotation.id}`;
  const currency = quotation.document.currency || 'PHP';
  const money = (value, code = currency) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: code }).format(value);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setPaymentStatus(null); setPayments([]);
    fetch(`${base}/payments`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async result => {
        const payload = await result.json();
        if (!result.ok || !Array.isArray(payload.payments)) throw new Error(payload.message || 'Unable to load payment records.');
        if (!controller.signal.aborted) { setPayments(payload.payments); setPaymentStatus(payload.paymentStatus === 'paid' ? 'paid' : 'unpaid'); }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, token, quotation.documentVersion, quotation.updatedAt, revision]);
  useEffect(() => { setDraft(null); setNotice(''); setError(''); }, [quotation.id, quotation.documentVersion]);
  function update(key, value) { setDraft(current => ({ ...current, [key]: value, idempotencyKey: window.crypto.randomUUID() })); }
  function startVerification() {
    setDraft({ paymentDate: manilaToday(), amount: '', referenceNumber: '', paymentMethod: 'bank_transfer', note: '', idempotencyKey: window.crypto.randomUUID() });
    setError(''); setNotice('');
  }
  async function verifyPayment() {
    if (!signed || dirty || saving) return;
    if (!draft.paymentDate || draft.paymentDate > manilaToday()) { setError('Enter a payment date that is not in the future.'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(draft.amount) || Number(draft.amount) <= 0 || Number(draft.amount) > 99999999.99) { setError('Enter a positive payment amount with up to two decimal places.'); return; }
    if (!draft.referenceNumber.trim() || !draft.paymentMethod.trim()) { setError('Enter the payment reference number and method.'); return; }
    setSaving(true); setError('');
    try {
      const result = await fetch(`${base}/verify-payment`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, documentHash: quotation.documentVersion, amount: Number(draft.amount), referenceNumber: draft.referenceNumber.trim() }) });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.message || 'Unable to verify the payment.');
      setDraft(null); setNotice('Payment verified and recorded.'); setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); } finally { setSaving(false); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm" aria-label="Payment verification and records">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Payment verification</h3><span className={`rounded-full px-3 py-1 font-bold ${paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{loading ? 'Loading payments…' : paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'unpaid' ? 'Unpaid' : 'Payment status unavailable'}</span></div>
    <p className="mt-3 text-slate-600">Confirm the funds in your bank or payment records, then record the payment here. Signing, agreement confirmation, and uploaded receipts do not mark the agreement as paid.</p>
    <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="admin-brand-surface rounded-lg px-4 py-2.5 font-bold disabled:opacity-40" disabled={!signed || dirty || saving || Boolean(draft)} onClick={startVerification}>Verify Payment</button><button type="button" className="font-bold text-[#514568] underline disabled:opacity-40" disabled={loading || saving} onClick={() => setRevision(value => value + 1)}>Refresh payments</button></div>
    {!signed && <p className="mt-2 text-xs text-slate-500">The client must sign the agreement before a payment can be verified.</p>}
    {draft && <div role="group" aria-label="Verify payment details" className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
      <label className="grid gap-2 font-bold">Payment date<input className={fieldClass} type="date" max={manilaToday()} value={draft.paymentDate} onChange={event => update('paymentDate', event.target.value)} disabled={saving} /></label>
      <label className="grid gap-2 font-bold">Amount received ({currency})<input className={fieldClass} type="number" min="0.01" max="99999999.99" step="0.01" value={draft.amount} onChange={event => update('amount', event.target.value)} disabled={saving} /></label>
      <label className="grid gap-2 font-bold">Reference number<input className={fieldClass} maxLength={180} value={draft.referenceNumber} onChange={event => update('referenceNumber', event.target.value)} disabled={saving} /></label>
      <label className="grid gap-2 font-bold">Payment method<select className={fieldClass} value={draft.paymentMethod} onChange={event => update('paymentMethod', event.target.value)} disabled={saving}>{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-2 font-bold sm:col-span-2">Verification note (optional)<textarea className={fieldClass} maxLength={1000} value={draft.note} onChange={event => update('note', event.target.value)} disabled={saving} /></label>
      <p className="text-xs text-slate-600 sm:col-span-2">Your administrator identity and verification time will be recorded with this payment.</p>
      <div className="flex gap-3 sm:col-span-2"><button type="button" className="admin-brand-surface rounded-lg px-4 py-2.5 font-bold disabled:opacity-40" disabled={saving || dirty} onClick={verifyPayment}>{saving ? 'Verifying…' : 'Confirm Payment Verification'}</button><button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancel</button></div>
    </div>}
    {!loading && !payments.length && !error && <p className="mt-4 text-slate-500">No verified payments recorded.</p>}
    {!!payments.length && <ul className="mt-4 grid gap-3">{payments.map(payment => <li key={payment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="font-bold">{money(payment.amount, payment.currency)} · {payment.status === 'paid' ? 'Paid' : payment.status}</p><p className="mt-2">Payment date: {payment.paymentDate} · {methodLabel(payment.paymentMethod)}</p><p className="mt-1">Reference: {payment.referenceNumber}</p><p className="mt-2 text-xs text-slate-600">Verified by {payment.verifiedBy?.name || 'ZeroOne'} · {new Date(payment.verifiedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>{payment.note && <p className="mt-2 whitespace-pre-wrap">{payment.note}</p>}</li>)}</ul>}
    {notice && <p className="mt-3 font-bold text-emerald-800" role="status">{notice}</p>}
    {error && <p className="mt-3 text-rose-800" role="alert">{error}</p>}
  </section>;
}
