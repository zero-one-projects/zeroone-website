import { useEffect, useState } from 'react';
import QuotationDocument from '../components/QuotationDocument';
import QuotationResponsePanel from '../components/QuotationResponsePanel';
import Seo from '../components/Seo';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import '../admin-theme.css';
import '../quotations.css';

export default function SharedQuotationPage({ token }) {
  const [quotation, setQuotation] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setQuotation(null);
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

  async function print() {
    try {
      await Promise.all(Array.from(window.document.querySelectorAll('.quotation-paper img')).map((image) => image.decode()));
      await window.document.fonts.ready;
      window.print();
    } catch { setError('The logo could not load. Please refresh before printing.'); }
  }

  return (
    <main className="admin-theme shared-quotation-page min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-8">
      <Seo title="Your Quotation | Zero One IT Inc." description="View your quotation from Zero One IT Inc." noindex canonicalPath="/quotation" />
      <div className="mx-auto max-w-5xl">
        <header className="quotation-controls flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Your quotation</h1><p className="mt-2 text-sm text-slate-600">Prepared for you by Zero One Information Technology Inc.</p></div>
          {quotation && <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" type="button" onClick={print}>Print / Save PDF</button>}
        </header>
        {loading && <p className="mt-8 rounded-lg bg-white p-6" role="status">Loading your quotation...</p>}
        {error && <p className="quotation-controls mt-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-700" role="alert">{error}</p>}
        {quotation && <QuotationDocument document={quotation.document} reference={quotation.reference} />}
        {quotation && <QuotationResponsePanel key={quotation.documentVersion} quotation={quotation} token={token} onResponse={setQuotation} />}
      </div>
    </main>
  );
}
