import { useEffect, useState } from 'react';
import QuotationDocument from '../components/QuotationDocument';
import QuotationResponsePanel from '../components/QuotationResponsePanel';
import Seo from '../components/Seo';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import '../admin-theme.css';
import '../quotations.css';

export default function SharedQuotationPage({ token }) {
  const [quotation, setQuotation] = useState(null);
  const [requoteRequested, setRequoteRequested] = useState(false);
  const [decidedLater, setDecidedLater] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setQuotation(null);
    setRequoteRequested(false);
    setDecidedLater(false);
    setError('');
    fetch(`${getApiBaseUrl()}/api/quotations/${encodeURIComponent(token)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'This quotation is unavailable.');
        if (!controller.signal.aborted) { setQuotation(payload.quotation); setExpiresAt(payload.expiresAt); }
      }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!expiresAt) return undefined;
    let timer;
    function checkExpiry() {
      const remaining = Date.parse(expiresAt) - Date.now();
      if (remaining <= 0) {
        setQuotation(null);
        setError('This quotation has expired. Please contact Zero One for an updated quotation.');
      } else timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
    }
    checkExpiry();
    return () => clearTimeout(timer);
  }, [expiresAt]);

  useEffect(() => {
    const previous = window.document.querySelector('meta[name="referrer"]');
    const meta = window.document.createElement('meta');
    meta.name = 'referrer'; meta.content = 'no-referrer';
    const original = previous?.content;
    if (previous) previous.content = 'no-referrer'; else window.document.head.appendChild(meta);
    return () => { if (previous) previous.content = original; else meta.remove(); };
  }, []);

  function handleResponse(updated) {
    if (updated.clientResponse?.current && updated.clientResponse.action === 'requote') {
      setRequoteRequested(true); setQuotation(null); setExpiresAt(null);
    } else setQuotation(updated);
  }

  async function print() {
    try {
      await Promise.all(Array.from(window.document.querySelectorAll('.quotation-paper img')).map((image) => image.decode()));
      await window.document.fonts.ready;
      window.print();
    } catch { throw new Error('The quotation could not load for printing. Please refresh and try again.'); }
  }

  return (
    <main className="admin-theme shared-quotation-page min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-8">
      <Seo title="Quotation Details | Zero One IT Inc." description="View your quotation from Zero One IT Inc." noindex canonicalPath="/quotation" />
      <div className="mx-auto max-w-5xl">
        {!decidedLater && <header className="quotation-controls flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Quotation Details</h1><p className="mt-2 text-sm text-slate-600">Prepared for you by Zero One Information Technology Inc.</p></div>
          {quotation && <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" type="button" onClick={() => print().catch(failure => setError(failure.message))}>Download Quotation</button>}
        </header>}
        {loading && <p className="mt-8 rounded-lg bg-white p-6" role="status">Loading your quotation...</p>}
        {error && <p className="quotation-controls mt-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-700" role="alert">{error}</p>}
        {decidedLater && <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 sm:p-8" role="status" aria-labelledby="decide-later-heading">
          <h1 id="decide-later-heading" className="flex flex-nowrap items-center gap-2 whitespace-nowrap text-base font-bold text-slate-950 sm:gap-3 sm:text-xl">
            <svg className="h-5 w-5 shrink-0 text-slate-500 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5h4" /></svg>
            No Response Submitted
          </h1>
          <p className="mt-5 text-sm leading-7 sm:text-base">You may return to this page anytime before the quotation expires to accept it or request a revision. No response has been submitted yet.</p>
          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-sm leading-7 sm:text-base">Have questions or need clarification? We’re happy to help. Feel free to contact us at <a className="break-words font-bold text-[#514568] underline underline-offset-4" href="mailto:sales@zerooneitinc.com">sales@zerooneitinc.com</a> or arrange a consultation with our team.</p>
            <p className="mt-5 text-sm leading-7 sm:text-base">We look forward to working with you!</p>
          </div>
        </section>}
        {requoteRequested && <section className="mt-8 rounded-xl border border-emerald-200 bg-white p-6" role="status"><h2 className="text-xl font-bold text-emerald-900">Revision requested</h2><p className="mt-3 text-sm leading-6 text-slate-700">Your requested changes have been sent to Zero One. This quotation link is now inactive. Zero One will review your request and share a new link for the updated quotation.</p></section>}
        {quotation && <QuotationDocument document={quotation.document} reference={quotation.reference} />}
        {quotation && <QuotationResponsePanel key={quotation.documentVersion} quotation={quotation} token={token} onResponse={handleResponse} onPrintQuotation={print} onDecideLater={() => { setDecidedLater(true); setQuotation(null); setExpiresAt(null); }} />}
      </div>
    </main>
  );
}
