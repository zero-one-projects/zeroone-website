import { readSigningSession, storeSigningSession } from '../utils/quotationSigningSession';
import QuotationPaymentStep from './QuotationPaymentStep';
import ContractReview from './ContractReview';
import ContractRichText from './ContractRichText';
import { useEffect, useId, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import SignaturePad from './SignaturePad';

const field = 'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950';

export default function QuotationResponsePanel({ quotation, token, onResponse, onPrintQuotation, onDecideLater }) {
  const quotationOnly = quotation.document.clientFlow === 'quotation_only';
  const followUpMessage = 'You will receive another email from Zero One with your contract, payment details, and terms.';
  const [action, setAction] = useState(() => new URLSearchParams(window.location.search).get('sign') === '1' && !quotationOnly && quotation.clientResponse?.current && quotation.clientResponse.action === 'accept' && !quotation.clientResponse.signedAt ? 'sign' : '');
  const [signingSession, setSigningSession] = useState(() => readSigningSession(token, quotation.documentVersion));
  const [email, setEmail] = useState(signingSession?.email || quotation.document.clientEmail || '');
  const [name, setName] = useState(signingSession?.name || quotation.document.contractDetails?.authorizedRepresentative || quotation.document.clientName || '');
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(action === 'sign' ? signingSession?.challengeId || null : null);
  const [verified, setVerified] = useState(action === 'sign' ? signingSession : null);
  const [strokes, setStrokes] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRequote, setConfirmRequote] = useState(false);
  const [printingQuotation, setPrintingQuotation] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deferred, setDeferred] = useState(false);
  const response = quotation.clientResponse;
  const isSigning = action === 'sign';
  const isAcceptancePrompt = action === 'accepted';
  const isPayment = action === 'payment';
  const [downloading, setDownloading] = useState(false);
  const signaturePending = !quotationOnly && response?.current && response.action === 'accept' && !response.signedAt;
  const dialogRef = useRef(null);
  const signNowRef = useRef(null);
  const dialogTitleId = useId();

  useEffect(() => { storeSigningSession(token, signingSession); }, [token, signingSession]);

  useEffect(() => {
    if (!action) return undefined;
    const dialog = dialogRef.current;
    const previousFocus = window.document.activeElement;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector('input, [data-sign-now]')?.focus();
    return () => {
      dialog.close();
      window.document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [action]);

  useEffect(() => {
    if (!action && deferred) signNowRef.current?.focus();
  }, [action, deferred]);

  useEffect(() => {
    if (challenge) dialogRef.current?.querySelector('input:not([readonly])')?.focus();
  }, [challenge, verified]);

  useEffect(() => {
    if (confirmRequote) dialogRef.current?.querySelector('[data-requote-back]')?.focus();
  }, [confirmRequote]);

  function closeDialog() {
    if (busy || printingQuotation) return;
    if (confirmRequote) { setConfirmRequote(false); setError(''); return; }
    if (isAcceptancePrompt) setDeferred(true);
    setAction(''); setChallenge(null); setVerified(null); setStrokes([]); setAgreed(false); setCode(''); setMessage(''); setError('');
  }

  function decideLater() {
    setDeferred(true);
    onDecideLater?.();
  }

  function signLater() {
    setDeferred(true); setAction(''); setVerified(null); setChallenge(null); setCode('');
    setStrokes([]); setAgreed(false); setMessage(''); setError('');
  }

  function signNow() {
    if (signingSession && signingSession.documentVersion === quotation.documentVersion && Date.parse(signingSession.expiresAt) > Date.now()) {
      setVerified(signingSession); setChallenge(signingSession.challengeId); setEmail(signingSession.email); setName(signingSession.name || name);
    }
    setAction('sign'); setError(''); setMessage('');
  }

  async function request(path, body) {
    const result = await fetch(`${getApiBaseUrl()}/api/quotations/${encodeURIComponent(token)}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const payload = await result.json();
    if (!result.ok) throw new Error(payload.message || 'Unable to submit your response.');
    return payload;
  }

  async function sendCode(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = await request('verification', { email, action: isSigning ? 'accept' : action, documentVersion: quotation.documentVersion });
      setChallenge(payload.challengeId); setCode(''); setMessage(payload.message);
      setVerified(null); setAgreed(false); setStrokes([]);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function submit(event, confirmed = false) {
    event?.preventDefault();
    if (busy || printingQuotation) return;
    if (action === 'requote' && !confirmed) { setConfirmRequote(true); setError(''); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = await request(isSigning ? 'sign' : 'respond', { challengeId: challenge, ...(action !== 'requote' ? {
        verificationProof: verified.verificationProof,
        ...(isSigning ? { signature: { type: 'drawn', strokes, agreed } } : {})
      } : { code }), action: isSigning ? 'accept' : action, name, note });
      if (payload.signingSession) setSigningSession(payload.signingSession);
      setConfirmRequote(false);
      onResponse(payload.quotation); setAction(action === 'accept' ? quotationOnly ? 'confirmed' : 'accepted' : isSigning ? 'payment' : ''); setCode('');
      if (action !== 'accept') { setVerified(null); setChallenge(null); }
      setStrokes([]); setAgreed(false); setDeferred(false);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function printQuotationCopy() {
    setPrintingQuotation(true); setError('');
    try { await onPrintQuotation(); }
    catch (failure) { setError(failure.message || 'Unable to print the quotation. Please try again.'); }
    finally { setPrintingQuotation(false); }
  }

  async function verifyEmail(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = await request('verify', { challengeId: challenge, code });
      if (payload.signingSession) setSigningSession(payload.signingSession);
      setVerified(payload); setCode(''); setMessage(isSigning ? 'Email verified. Review the agreement and sign.' : quotationOnly ? 'Email verified. Confirm your quotation acceptance.' : 'Email verified. Confirm acceptance; you can sign the contract now or later.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function downloadSignedContract() {
    if (!signingSession) return;
    setDownloading(true); setError('');
    try {
      const result = await fetch(`${getApiBaseUrl()}/api/quotations/${encodeURIComponent(token)}/signed-contract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: signingSession.challengeId, verificationProof: signingSession.verificationProof }) });
      if (!result.ok) { const payload = await result.json(); throw new Error(payload.message || 'Unable to download your signed contract.'); }
      const url = URL.createObjectURL(await result.blob());
      const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `Signed-Contract-${quotation.reference}.pdf`; window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure.message); } finally { setDownloading(false); }
  }

  return (
    <section className="quotation-controls mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Respond to quotation">
      {response?.current ? <>
        <h2 className="text-lg font-bold text-emerald-900">{response.action === 'accept' ? 'Quotation accepted' : 'Revision requested'}</h2>
        <p className="mt-2 text-sm text-emerald-800">Your verified response has been recorded. {response.action === 'requote' ? 'Zero One will review the changes you requested. This link is now inactive; a new link will be shared for the updated quotation.' : 'Thank you for confirming this quotation.'}</p>
        {!quotationOnly && response.signedAt && <><p className="mt-2 text-sm text-emerald-800">Agreement electronically signed on {new Date(response.signedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila).</p><button type="button" className="admin-brand-surface mt-4 rounded-lg px-5 py-3 text-sm font-bold" onClick={() => { setAction('payment'); setError(''); }}>Continue to Payment</button></>}
        {quotationOnly && response.action === 'accept' && <p className="mt-4 text-sm text-slate-600">{followUpMessage}</p>}
        {signaturePending && !isAcceptancePrompt && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-amber-900">Contract pending signature</h3>
          <p className="mt-2 text-sm text-amber-900">{deferred ? 'You chose to sign later. Your quotation remains accepted.' : 'You can sign the contract now or choose to sign later. Your quotation is already accepted.'} Return using this link before it expires to sign.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button ref={signNowRef} type="button" disabled={busy} className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" onClick={signNow}>Sign Contract Now</button>
            {!deferred && <button type="button" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold" onClick={signLater}>Sign Later</button>}
          </div>
        </div>}
      </> : <>
      <h2 className="text-lg font-bold">Respond to this quotation</h2>
      <p className="mt-2 text-sm text-slate-600">Verify your email address using the code sent to your inbox before confirming your response.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-50" type="button" disabled={busy} onClick={() => { setAction('accept'); setChallenge(null); setError(''); setMessage(''); }}>Accept Quotation</button>
        <button className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-[#514568] disabled:opacity-50" type="button" disabled={busy} onClick={() => { setAction('requote'); setChallenge(null); setError(''); setMessage(''); }}>Request a Revision</button>
        <button className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600" type="button" onClick={decideLater}>Decide Later</button>
      </div>
      {deferred && <p className="mt-4 text-sm text-slate-600" role="status">You can return to this link before it expires to accept or request a revision. No response has been submitted.</p>}
      </>}
      {action && <dialog
        ref={dialogRef}
        className={`quotation-controls fixed inset-0 m-auto max-h-[90dvh] w-[92vw] ${isSigning ? 'max-w-5xl' : 'max-w-xl'} overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm sm:p-6`}
        aria-labelledby={dialogTitleId}
        onCancel={(event) => { event.preventDefault(); closeDialog(); }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6b617a]">{confirmRequote ? 'Quotation revision' : action === 'confirmed' ? 'Quotation accepted' : isPayment ? 'Contract signed' : isAcceptancePrompt ? 'Quotation accepted' : isSigning ? 'Sign contract' : action === 'accept' ? 'Accept quotation' : 'Request a revision'}</p>
            <h2 className="mt-2 text-2xl font-bold" id={dialogTitleId}>{confirmRequote ? 'Request a revised quotation?' : action === 'confirmed' ? 'Thank you for accepting' : isPayment ? 'Contract Signed – Payment Details' : isAcceptancePrompt ? 'Ready to sign your contract?' : verified ? isSigning ? 'Review and sign agreement' : 'Confirm quotation acceptance' : challenge ? 'Verify your email' : 'Verify your email address'}</h2>
          </div>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40" type="button" disabled={busy || printingQuotation} aria-label="Close response popup" onClick={closeDialog}>×</button>
        </div>
        {confirmRequote ? <section aria-label="Revision confirmation">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-bold">This link will no longer be available once your request is sent.</p>
            <p className="mt-2">You can download a copy of this quotation for your records before proceeding. Zero One will review your requested changes and send you a new link to the updated quotation.</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">For questions, contact <a className="font-bold text-[#514568] underline" href="mailto:sales@zerooneitinc.com">sales@zerooneitinc.com</a>.</p>
          {onPrintQuotation && <button type="button" className="mt-4 rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-[#514568] disabled:opacity-50" disabled={busy || printingQuotation} onClick={printQuotationCopy}>{printingQuotation ? 'Preparing quotation…' : 'Print / Save Quotation PDF'}</button>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button data-requote-back type="button" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50" disabled={busy || printingQuotation} onClick={() => { setConfirmRequote(false); setError(''); }}>Go Back</button>
            <button type="button" className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-50" disabled={busy || printingQuotation} onClick={() => submit(null, true)}>{busy ? 'Sending request…' : 'Confirm & Send Request'}</button>
          </div>
          {error && <p className="mt-4 text-sm text-rose-800" role="alert">{error}</p>}
        </section> : action === 'confirmed' ? <section aria-label="Quotation acceptance confirmation">
          <p className="text-sm leading-6 text-emerald-800">Your verified acceptance has been recorded.</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{followUpMessage}</p>
          <button type="button" className="admin-brand-surface mt-6 rounded-lg px-5 py-3 text-sm font-bold" onClick={closeDialog}>Done</button>
        </section> : isPayment ? <QuotationPaymentStep token={token} session={signingSession} onVerified={setSigningSession} quotation={quotation} onDownload={signingSession ? downloadSignedContract : null} downloading={downloading} error={error} /> : isAcceptancePrompt ? <section aria-label="Contract signing options">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></div>
          <p className="text-sm leading-6 text-slate-600">Your verified acceptance has been recorded. You can review and electronically sign your contract now, or choose to do it later. While this page stays open, you will not need another verification code.</p>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold text-amber-900">Contract pending signature</h3><p className="mt-2 text-sm leading-6 text-amber-900">Your quotation is already accepted. Signing the contract is a separate step. Please return before your quotation link expires.</p></div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button data-sign-now type="button" className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" onClick={signNow}>Sign Contract Now</button>
            <button type="button" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700" onClick={signLater}>Sign Later</button>
          </div>
        </section> : <>
        {isSigning && !verified && <section className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Contract preview">
          <h3 className="font-bold">Your accepted quotation · {quotation.reference}</h3>
          <p className="mt-2 text-sm text-slate-600">Review your agreement below. Verify the email that accepted this quotation before signing.</p>
          {quotation.document.contractSource === 'pdf' ? <div className="mt-3"><ContractReview document={quotation.document} reference={quotation.reference} shareToken={token} /></div> : <details className="mt-3 text-sm" open><summary className="cursor-pointer font-bold">Contract terms</summary><div className="mt-3 max-h-60 overflow-y-auto leading-6"><ContractRichText text={quotation.contractText} format={quotation.document.contractStyle} /></div></details>}
        </section>}
        <form onSubmit={!challenge ? sendCode : action !== 'requote' && !verified ? verifyEmail : submit}>
        <fieldset disabled={busy} className="grid gap-4 rounded-lg bg-slate-50 p-4 disabled:opacity-60">
          <legend className="px-2 text-sm font-bold">{verified ? isSigning ? 'Sign and agree' : 'Confirm acceptance' : challenge ? 'Verify your email' : 'Verify your email address'}</legend>
          <p className="text-sm text-slate-600">You are choosing to <strong>{isSigning ? 'sign the contract for your accepted quotation' : action === 'accept' ? 'accept this quotation' : 'request a revised quotation'}</strong>.</p>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Company email or Gmail
            <input className={field} type="email" autoComplete="email" required maxLength={180} value={email} readOnly={Boolean(challenge)} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {action === 'requote' && <p className="text-sm text-slate-600">Submitting a revision request will deactivate this link. Zero One will review your requested changes and share a new link for the updated quotation.</p>}
          {challenge && <>
            {(action === 'requote' || verified) && <>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Your full name
              <input className={field} required maxLength={180} autoComplete="name" readOnly={isSigning && Boolean(signingSession?.name || quotation.document.contractDetails?.authorizedRepresentative || quotation.document.clientName)} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            </>}
            {!verified && <label className="grid gap-2 text-sm font-bold text-slate-700">Verification code
              <input className={field} required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="Six-digit code from your inbox" />
            </label>}
            {verified && action === 'accept' && <p className="text-sm text-slate-600">{quotationOnly ? followUpMessage : 'After confirming acceptance, you can choose Sign Contract Now or Sign Later. Signing is a separate step.'}</p>}
            {verified && isSigning && <>
              <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Agreement terms">
                <h3 className="font-bold">{quotation.reference} · {quotation.document.title}</h3>
                {quotation.document.currency && <p className="mt-2 text-sm font-bold">{quotation.document.clientName} · {quotation.document.currency} {Number(quotation.document.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>}
                {quotation.document.hasRecurring && <p className="mt-2 text-sm font-bold">Subscription: {quotation.document.currency} {Number(quotation.document.recurringTotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })} / {quotation.document.billingPeriod === 'yearly' ? 'year' : 'month'}</p>}
                {quotation.document.hasRecurring && quotation.document.contractDetails?.billingCommencement && <p className="mt-2 text-sm">Subscription billing starts: {quotation.document.contractDetails.billingCommencement}</p>}
                <p className="mt-2 text-sm text-slate-600">Review the complete contract below, including the agreed scope and payment terms, then add your electronic signature. You can download and print the signed PDF after signing.</p>
                {quotation.document.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{quotation.document.notes}</p>}
                <div className="mt-4"><ContractReview document={{ ...quotation.document, contractText: verified.contractText }} reference={quotation.reference} shareToken={token} /></div>
              </section>
              <SignaturePad value={strokes} onChange={setStrokes} disabled={busy} />
              <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 h-4 w-4 shrink-0 accent-[#514568]" type="checkbox" required checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>{verified.consentText}</span></label>
            </>}
            {(action === 'requote' || verified) && <label className="grid gap-2 text-sm font-bold text-slate-700">{action === 'requote' ? 'What would you like changed or added?' : 'Message (optional)'}
              <textarea className={field} required={action === 'requote'} maxLength={5000} rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
            </label>}
            <p className="text-xs text-slate-500">{isSigning && verified ? 'Your verified session stays active while this page is open, until the quotation link expires. This signature applies to the contract version shown.' : 'Confirm only after reviewing the quotation. The verification code expires in 10 minutes.'}</p>
          </>}
          <div className="flex flex-wrap gap-3">
            <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-40" type="submit" disabled={Boolean(verified) && isSigning && (!agreed || !strokes.length)}>{busy ? 'Please wait...' : verified ? isSigning ? 'Agree & Sign Contract' : 'Confirm Acceptance' : challenge ? action !== 'requote' ? 'Verify & Continue' : 'Verify & Request a Revision' : 'Send Verification Code'}</button>
            {!challenge && <button className="text-sm font-bold text-slate-600" type="button" onClick={closeDialog}>Cancel</button>}
          </div>
        </fieldset>
      </form>
      {message && <p className="mt-4 text-sm text-emerald-800" role="status">{message}</p>}
      {error && <p className="mt-4 text-sm text-rose-800" role="alert">{error}</p>}
        </>}
      </dialog>}
    </section>
  );
}
