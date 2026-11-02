import { useEffect, useId, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

export default function BillingDeleteDialog({ token, statements, onClose, onDeleted }) {
  const dialogRef = useRef(null), titleId = useId();
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = statements.map(row => row.id);
  useEffect(() => {
    const element = dialogRef.current, focus = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; if (focus?.isConnected) focus.focus(); };
  }, []);
  async function request(path, body) {
    const response = await fetch(`${getApiBaseUrl()}/api/admin/billing/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to verify billing deletion.');
    return payload;
  }
  async function requestCode() {
    if (busy) return;
    setBusy(true); setError('');
    try { setChallenge(await request('delete-verification', { ids })); setCode(''); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function confirm(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { onDeleted(await request('delete', { ids, challengeId: challenge.challengeId, code })); }
    catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[94vw] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl backdrop:bg-slate-950/55">
    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Billing statements</p>
    <h2 id={titleId} className="mt-2 text-2xl font-bold">{statements.length === 1 ? 'Delete billing statement?' : `Delete ${statements.length} billing statements?`}</h2>
    <p className="mt-4 text-sm text-slate-600">This permanently removes the selected statements and disables their client links. Previously emailed or downloaded copies remain.</p>
    <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm">{statements.map(row => <li key={row.id}><strong>{row.reference}</strong> · {row.document.clientName} · {row.document.title}</li>)}</ul>
    <p className="mt-4 text-sm text-slate-600">Confirm with an OTP sent from and to <strong>billing@zerooneitinc.com</strong>.</p>
    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {challenge ? <form className="mt-5 grid gap-4" onSubmit={confirm}>
      <p role="status" className="text-sm text-emerald-800">Code sent to billing@zerooneitinc.com. Valid for 10 minutes, with up to five attempts.</p>
      <label className="grid gap-2 text-sm font-bold">Deletion verification code<input autoFocus className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg tracking-widest" value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /></label>
      <div className="flex flex-wrap gap-3"><button className="rounded-lg bg-rose-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-40" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Deleting…' : 'Confirm Delete'}</button><button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-40" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="text-sm font-bold text-[#514568] disabled:opacity-40" type="button" disabled={busy} onClick={requestCode}>Resend code</button></div>
    </form> : <div className="mt-5 flex gap-3"><button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-40" type="button" disabled={busy} onClick={requestCode}>{busy ? 'Sending…' : 'Send Deletion Code'}</button><button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-40" type="button" disabled={busy} onClick={onClose}>Cancel</button></div>}
  </dialog>;
}
