import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
export default function QuotationPaymentProofs({ token, quotationId, updatedAt }) {
  const [proofs, setProofs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState('');
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const base = `${getApiBaseUrl()}/api/admin/quotations/${quotationId}/payment-proofs`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setProofs([]);
    fetch(base, { signal: controller.signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
      .then(async result => { const data = await result.json(); if (!result.ok || !Array.isArray(data.proofs)) throw new Error(data.message || 'Unable to load payment proofs.'); if (!controller.signal.aborted) setProofs(data.proofs); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, token, updatedAt, revision]);
  async function download(proof) {
    setDownloading(proof.id); setError('');
    try {
      const result = await fetch(`${base}/${proof.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!result.ok) throw new Error('Unable to download payment proof.');
      const url = URL.createObjectURL(await result.blob());
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = proof.fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure.message); } finally { setDownloading(''); }
  }
  async function recordReview(event) {
    event.preventDefault(); setReviewing(true); setError('');
    try {
      const result = await fetch(`${base}/${review.id}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(review) });
      const payload = await result.json(); if (!result.ok) throw new Error(payload.message || 'Unable to record payment review.');
      setReview(null); setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); } finally { setReviewing(false); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Payment proof submissions">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Payment Proof Submissions</h3><button type="button" className="text-sm font-bold text-[#514568] underline" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh proofs</button></div>
    <p className="mt-2 text-xs leading-6 text-slate-500">Review uploaded receipts here. Use Verify Payment in Payment verification to record received funds and mark the agreement as paid.</p>
    {loading ? <p className="mt-3 text-sm">Loading payment proofs…</p> : !proofs.length && !error ? <p className="mt-3 text-sm text-slate-500">No proof of payment submitted yet.</p> : <ul className="mt-4 grid gap-4">{proofs.map(proof => <li key={proof.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: proof.currency }).format(proof.amountPaid)} · {proof.status === 'verified' ? 'Receipt reviewed' : proof.status === 'rejected' ? 'Proof rejected' : 'Awaiting verification'}</p><p className="mt-2">{proof.clientName} · {proof.clientEmail}</p><p className="mt-2">Payment date: {proof.paidOn} · Transaction: {proof.transactionReference}</p><p className="mt-1 text-xs text-slate-500">Submitted: {new Date(proof.submittedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>{proof.note && <p className="mt-2 whitespace-pre-wrap">{proof.note}</p>}<button type="button" disabled={Boolean(downloading)} onClick={() => download(proof)} className="mt-3 font-bold text-[#514568] underline">{downloading === proof.id ? 'Downloading…' : 'Download Payment Proof'}</button>{proof.verification ? <div className="mt-3 border-t border-slate-200 pt-3"><p>Reviewed by {proof.verification.name} · {new Date(proof.verification.reviewedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>{proof.status === 'verified' && <p className="mt-1 font-bold">Confirmed amount received: {new Intl.NumberFormat('en-PH', { style: 'currency', currency: proof.currency }).format(proof.verification.confirmedAmount)}</p>}{proof.verification.note && <p className="mt-2">{proof.verification.note}</p>}</div> : <button type="button" className="ml-4 mt-3 font-bold text-[#514568] underline" onClick={() => setReview({ id: proof.id, documentHash: proof.documentHash, status: 'verified', confirmedAmount: '', note: '' })}>Review Receipt</button>}</li>)}</ul>}
    {review && <div role="group" className="mt-4 grid gap-3 rounded-lg border border-slate-200 p-4" aria-label="Receipt review"><h4 className="font-bold">Record receipt review</h4><label className="grid gap-2 text-sm">Review result<select className="rounded border p-2" value={review.status} onChange={event => setReview({ ...review, status: event.target.value })}><option value="verified">Receipt checked</option><option value="rejected">Reject proof</option></select></label>{review.status === 'verified' && <label className="grid gap-2 text-sm">Confirmed amount received<input className="rounded border p-2" type="number" min="0.01" max="99999999.99" step="0.01" value={review.confirmedAmount} onChange={event => setReview({ ...review, confirmedAmount: event.target.value })} /></label>}<label className="grid gap-2 text-sm">Review note<textarea className="rounded border p-2" maxLength={1000} value={review.note} onChange={event => setReview({ ...review, note: event.target.value })} /></label><div className="flex gap-3"><button type="button" onClick={recordReview} disabled={reviewing} className="admin-brand-surface rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-40">{reviewing ? 'Recording…' : 'Confirm Receipt Review'}</button><button type="button" disabled={reviewing} onClick={() => setReview(null)}>Cancel</button></div></div>}
    {error && <p className="mt-3 text-sm text-rose-800" role="alert">{error}</p>}
  </section>;
}
