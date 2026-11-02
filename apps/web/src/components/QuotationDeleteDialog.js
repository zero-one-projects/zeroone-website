import { useEffect, useId, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

export default function QuotationDeleteDialog({ token, quotation, quotations, onClose, onDeleted }) {
  const selection = quotations || [quotation];
  const bulk = selection.length > 1;
  const ids = selection.map((row) => row.id);
  const base = `${getApiBaseUrl()}/api/admin/quotations`;
  const dialogRef = useRef(null);
  const titleId = useId();
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    const focus = window.document.activeElement;
    const overflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); window.document.body.style.overflow = overflow; if (focus?.isConnected) focus.focus(); };
  }, []);

  async function requestCode() {
    setBusy(true); setError('');
    try {
      const response = await fetch(bulk ? `${base}/bulk-delete-verification` : `${base}/${selection[0].id}/delete-verification`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, ...(bulk ? { 'Content-Type': 'application/json' } : {}) },
        ...(bulk ? { body: JSON.stringify({ ids }) } : {})
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to send deletion code.');
      setChallenge(payload); setCode('');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function confirm(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(bulk ? `${base}/bulk-delete` : `${base}/${selection[0].id}`, {
        method: bulk ? 'POST' : 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(bulk ? { ids } : {}), challengeId: challenge.challengeId, code })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to delete quotation.');
      window.dispatchEvent(new Event('quotations-deleted'));
      onDeleted(quotations ? selection : quotation);
    } catch (failure) { setError(failure.message); setBusy(false); }
  }

  return <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="quotation-controls fixed inset-0 m-auto max-h-[90dvh] w-[92vw] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm">
    <p className="text-xs font-bold uppercase tracking-widest text-[#6b617a]">{bulk ? `${selection.length} selected quotations` : selection[0].reference}</p>
    <h2 id={titleId} className="mt-2 text-2xl font-bold">{bulk ? `Delete ${selection.length} quotations?` : 'Delete quotation?'}</h2>
    <p className="mt-4 text-sm text-slate-600">{bulk ? 'These quotations will be removed from the list and their client links will stop working.' : `${selection[0].document.title} will be removed from the quotation list and its client link will stop working.`} Response history will be retained internally.</p>
    {bulk && <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm">{selection.map((row) => <li key={row.id}><strong>{row.reference}</strong> · {row.document.title}</li>)}</ul>}
    <p className="mt-3 text-sm text-slate-600">Confirm with a verification code sent to <strong>info@zerooneitinc.com</strong>.</p>
    {challenge ? <form className="mt-5 grid gap-4" onSubmit={confirm}>
      <p className="text-sm text-emerald-800" role="status">Code sent to info@zerooneitinc.com. Valid for 10 minutes.</p>
      <label className="grid gap-2 text-sm font-bold">Deletion verification code
        <input autoFocus className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg tracking-widest" value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-rose-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-40" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Deleting…' : 'Confirm Delete'}</button>
        <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold" type="button" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="text-sm font-bold text-[#514568]" type="button" disabled={busy} onClick={requestCode}>Resend code</button>
      </div>
    </form> : <div className="mt-6 flex gap-3">
      <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-40" type="button" disabled={busy} onClick={requestCode}>{busy ? 'Sending…' : 'Send Deletion Code'}</button>
      <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold" type="button" disabled={busy} onClick={onClose}>Cancel</button>
    </div>}
    {error && <p className="mt-4 text-sm text-rose-700" role="alert">{error}</p>}
  </dialog>;
}
