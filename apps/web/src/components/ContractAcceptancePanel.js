import { useEffect, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
export default function ContractAcceptancePanel({ quotation, token, dirty, onUpdated }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [review, setReview] = useState(null);
  const state = quotation.contractState || {};
  const locked = state.locked || (quotation.clientResponse?.current && quotation.clientResponse.signedAt);
  const policy = quotation.document.acceptancePolicy;
  const reviewKey = `${quotation.id}:${quotation.documentVersion}:${state.clientPdfSha256 || ''}`;
  const reviewed = Boolean(state.clientPdfSha256 && review?.key === reviewKey);
  const canConfirm = Boolean(locked && reviewed && !dirty && !busy && !downloading);
  useEffect(() => { setConfirm(false); }, [reviewKey]);
  useEffect(() => () => { if (review?.url) URL.revokeObjectURL(review.url); }, [review]);
  if (!policy && !locked) return null;
  const time = value => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  async function confirmAcceptance() {
    if (!canConfirm) return;
    setBusy(true); setError(''); setConfirm(false);
    try {
      const result = await fetch(`${getApiBaseUrl()}/api/admin/quotations/${quotation.id}/confirm-contract`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ documentVersion: quotation.documentVersion, reviewedClientPdfSha256: state.clientPdfSha256 }) });
      const payload = await result.json(); if (!result.ok) throw new Error(payload.message || 'Unable to confirm the agreement.');
      onUpdated(payload.quotation);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function download(copy, forReview = false) {
    setDownloading(true); setError('');
    try {
      const result = await fetch(`${getApiBaseUrl()}/api/admin/contracts/signed-copy`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ quotationId: quotation.id, documentHash: quotation.documentVersion, copy }) });
      if (!result.ok) { const payload = await result.json(); throw new Error(payload.message || 'Unable to download the recorded contract.'); }
      const url = URL.createObjectURL(await result.blob());
      if (forReview) { setReview({ key: reviewKey, url }); }
      else { const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${quotation.reference}-${copy === 'client' ? 'client-signed-original' : state.status === 'finalized' ? 'final' : 'signed'}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    } catch (failure) { setError(failure.message); } finally { setDownloading(false); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm" aria-label="Contract acceptance and status">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Contract acceptance</h3><span className={`rounded-full px-3 py-1 font-bold ${state.status === 'finalized' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{state.status === 'finalized' ? 'Finalized and locked' : locked ? policy ? 'Pending Admin Confirmation' : 'Signed and locked' : state.providerAcceptance ? 'ZeroOne confirmed · Awaiting client signature' : 'Awaiting client signature'}</span></div>
    <p className="mt-3">Provider: {quotation.document.providerProfile?.name || 'Zero One Information Technology Inc.'}</p><p className="mt-1">Client: {quotation.document.clientName}</p>
    {state.clientSignedAt && <p className="mt-2">Client signed: {time(state.clientSignedAt)} (Manila)</p>}
    {state.providerAcceptance && <p className="mt-2">ZeroOne confirmed: {state.providerAcceptance.name} · {time(state.providerAcceptance.confirmedAt)} (Manila)</p>}
    {locked && <p className="mt-3 font-bold text-slate-600">The signed agreement is locked. Create a separate quotation or upgrade addendum for changes.</p>}
    {policy && !state.providerAcceptance && <><div className="mt-4 flex flex-wrap gap-3">{locked && <button type="button" className="rounded-lg border border-slate-200 px-4 py-2.5 font-bold text-[#514568] disabled:opacity-40" disabled={downloading || dirty} onClick={() => download('client', true)}>{downloading ? 'Preparing PDF…' : 'Review Signed Contract'}</button>}<button type="button" className="admin-brand-surface rounded-lg px-4 py-2.5 font-bold disabled:opacity-40" disabled={!canConfirm} onClick={() => setConfirm(true)}>{busy ? 'Confirming…' : 'Confirm Agreement'}</button></div><p className="mt-2 text-xs text-slate-500">{!locked ? 'The client must sign before you can review and confirm the agreement.' : dirty ? 'Save and review the agreement before confirming.' : reviewed ? 'The original client-signed PDF is open below. Confirm after reviewing it.' : 'Review the original client-signed PDF before confirming the agreement.'}</p></>}
    {review?.key === reviewKey && <div className="mt-4 rounded-lg border border-slate-200 p-3"><h4 className="mb-3 font-bold">Original client-signed agreement</h4><iframe title="Client-signed contract review" src={review.url} className="h-[36rem] w-full border-0" /><a href={review.url} target="_blank" rel="noreferrer" className="mt-3 inline-block font-bold text-[#514568] underline">Open signed contract in a separate tab</a></div>}
    {locked && <button type="button" className="ml-3 mt-4 rounded-lg border border-slate-200 px-4 py-2.5 font-bold text-[#514568] disabled:opacity-40" disabled={downloading} onClick={() => download()}>{downloading ? 'Downloading…' : state.status === 'finalized' ? 'Download Final Contract PDF' : 'Download Signed Contract PDF'}</button>}
    {state.status === 'finalized' && <button type="button" className="ml-3 mt-4 text-sm font-bold text-[#514568] underline" disabled={downloading} onClick={() => download('client')}>Download client-signed original</button>}
    {state.pdfSha256 && <p className="mt-3 break-all text-xs text-slate-500">Recorded PDF SHA-256: {state.pdfSha256}</p>}
    {error && <p className="mt-3 text-rose-800" role="alert">{error}</p>}
    <ConfirmModal isOpen={confirm} title="Confirm agreement?" message={`Confirm that you reviewed the original client-signed agreement for ${quotation.document.clientName}. Your name and confirmation date will be recorded separately, the agreement will be finalized and locked, and the client will be notified. Payment verification is separate.`} confirmLabel="Confirm Agreement" onConfirm={confirmAcceptance} onCancel={() => setConfirm(false)} />
  </section>;
}
