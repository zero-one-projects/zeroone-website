import { useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { quotationPaymentSummary } from '../utils/quotation';
const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950';
export default function PaymentProofForm({ quotation, token, session, onVerified, onClose }) {
  const summary = quotationPaymentSummary(quotation);
  const [email, setEmail] = useState(quotation.document.clientEmail || '');
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [values, setValues] = useState({ amountPaid: summary.amountDue || '', paidOn: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10), transactionReference: '', note: '' });
  const [file, setFile] = useState(null);
  const [submissionId, setSubmissionId] = useState(() => window.crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const base = `${getApiBaseUrl()}/api/quotations/${encodeURIComponent(token)}`;
  function update(key, value) { setValues(current => ({ ...current, [key]: value })); setSubmissionId(window.crypto.randomUUID()); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      let result;
      if (!session) {
        result = await fetch(`${base}/${challenge ? 'verify' : 'verification'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(challenge ? { challengeId: challenge, code } : { email, action: 'payment', documentVersion: quotation.documentVersion }) });
      } else {
        if (!file || file.size > 2 * 1024 * 1024) throw new Error('Choose one PDF, JPG, or PNG file up to 2 MB.');
        const body = new FormData();
        for (const [key, value] of Object.entries({ ...values, id: submissionId, challengeId: session.challengeId, verificationProof: session.verificationProof })) body.append(key, value);
        body.append('proof', file);
        result = await fetch(`${base}/payment-proofs`, { method: 'POST', body });
      }
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.message || 'Unable to submit proof of payment.');
      if (session) setSubmitted(payload.proof);
      else if (challenge) {
        if (!payload.signingSession) throw new Error('Unable to verify this payment session. Request a new code.');
        onVerified(payload.signingSession);
      } else setChallenge(payload.challengeId);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  if (submitted) return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status"><h3 className="font-bold text-emerald-900">Proof of payment submitted</h3><p className="mt-2 text-sm leading-6">Your receipt and the client and contract details have been queued for our Sales and Billing teams. Payment remains subject to verification.</p><p className="mt-2 text-xs">Submission reference: {submitted.id}</p><button type="button" className="mt-3 text-sm font-bold underline" onClick={onClose}>Done</button></div>;
  return <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Submit proof of payment">
    <fieldset disabled={busy} className="grid gap-4 disabled:opacity-60"><legend className="px-2 font-bold">Submit Proof of Payment</legend>
      {!session ? <>
        <p className="text-sm leading-6 text-slate-600">Verify the email address that signed this contract before uploading your receipt.</p>
        <label className="grid gap-2 text-sm font-bold">Email address<input className={field} type="email" required maxLength={180} value={email} readOnly={Boolean(challenge)} onChange={event => setEmail(event.target.value)} /></label>
        {challenge && <label className="grid gap-2 text-sm font-bold">Payment verification code<input className={field} inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /></label>}
      </> : <>
        <p className="text-sm leading-6 text-slate-600">Upload your bank receipt or payment confirmation. Your verified client identity and signed contract reference will be included automatically.</p>
        <label className="grid gap-2 text-sm font-bold">Amount paid ({quotation.document.currency})<input className={field} type="number" min="0.01" max="99999999.99" step="0.01" required value={values.amountPaid} onChange={event => update('amountPaid', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-bold">Payment date<input className={field} type="date" required max={new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)} value={values.paidOn} onChange={event => update('paidOn', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-bold">Transaction reference<input className={field} required maxLength={180} value={values.transactionReference} onChange={event => update('transactionReference', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-bold">Receipt or payment confirmation<input className={field} type="file" required accept="application/pdf,image/jpeg,image/png" onChange={event => { setFile(event.target.files?.[0] || null); setSubmissionId(window.crypto.randomUUID()); }} /><span className="text-xs font-normal text-slate-500">PDF, JPG, or PNG · Maximum 2 MB</span></label>
        <label className="grid gap-2 text-sm font-bold">Payment notes (optional)<textarea className={field} maxLength={2000} rows={3} value={values.note} onChange={event => update('note', event.target.value)} /></label>
      </>}
      <div className="flex flex-wrap gap-3"><button type="submit" className="admin-brand-surface rounded-lg px-4 py-3 text-sm font-bold">{busy ? 'Please wait…' : session ? 'Send Proof to Sales & Billing' : challenge ? 'Verify Email' : 'Send Verification Code'}</button><button type="button" className="text-sm font-bold text-slate-600" onClick={onClose}>Cancel</button></div>
    </fieldset>
    {error && <p className="mt-4 text-sm text-rose-800" role="alert">{error}</p>}
  </form>;
}
