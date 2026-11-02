import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
export default function QuotationPaymentProofs({ token, quotationId, updatedAt }) {
  const [proofs, setProofs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState('');
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
  return <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Payment proof submissions">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Payment Proof Submissions</h3><button type="button" className="text-sm font-bold text-[#514568] underline" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh proofs</button></div>
    <p className="mt-2 text-xs leading-6 text-slate-500">Client-reported payments awaiting billing verification. Submissions do not confirm payment or reduce the outstanding balance.</p>
    {loading ? <p className="mt-3 text-sm">Loading payment proofs…</p> : !proofs.length && !error ? <p className="mt-3 text-sm text-slate-500">No proof of payment submitted yet.</p> : <ul className="mt-4 grid gap-4">{proofs.map(proof => <li key={proof.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: proof.currency }).format(proof.amountPaid)} · Awaiting verification</p><p className="mt-2">{proof.clientName} · {proof.clientEmail}</p><p className="mt-2">Payment date: {proof.paidOn} · Transaction: {proof.transactionReference}</p><p className="mt-1 text-xs text-slate-500">Submitted: {new Date(proof.submittedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>{proof.note && <p className="mt-2 whitespace-pre-wrap">{proof.note}</p>}<button type="button" disabled={Boolean(downloading)} onClick={() => download(proof)} className="mt-3 font-bold text-[#514568] underline">{downloading === proof.id ? 'Downloading…' : 'Download Payment Proof'}</button></li>)}</ul>}
    {error && <p className="mt-3 text-sm text-rose-800" role="alert">{error}</p>}
  </section>;
}
