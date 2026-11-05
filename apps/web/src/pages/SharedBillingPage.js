import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import BillingPaymentDetailsButton from '../components/BillingPaymentDetailsButton';

export default function SharedBillingPage({ token }) {
  const [bill, setBill] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const endpoint = `${getApiBaseUrl()}/api/billing/${token}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal, cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load billing statement.');
        setBill(payload);
      }).catch(reason => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [endpoint]);
  useEffect(() => {
    if (!bill) return undefined;
    const controller = new AbortController();
    let objectUrl;
    fetch(`${endpoint}/pdf`, { signal: controller.signal, cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(response => { if (!response.ok) throw new Error('PDF unavailable'); return response.blob(); })
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setPdfUrl(objectUrl); } })
      .catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [bill, endpoint]);
  useEffect(() => {
    const tags = ['robots', 'referrer'].map(name => {
      const tag = document.createElement('meta'); tag.name = name;
      tag.content = name === 'robots' ? 'noindex, nofollow, noarchive' : 'no-referrer';
      document.head.appendChild(tag); return tag;
    });
    return () => tags.forEach(tag => tag.remove());
  }, []);
  const button = 'rounded-lg border border-violet-200 px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50';
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><div className="mx-auto grid max-w-5xl gap-6">
    <h1 className="text-2xl font-bold">Billing statement</h1>
    {error ? <p role="alert">{error}</p> : !bill ? <p role="status">Loading billing statement…</p> : <>
      <div className="flex flex-wrap items-center gap-3"><a className={`${button} justify-self-start`} href={`${endpoint}/pdf`} target="_blank" rel="noreferrer">Open / download billing PDF</a><BillingPaymentDetailsButton instructions={bill.paymentInstructions} reference={bill.reference} /></div>
      {pdfUrl && <iframe title="Billing statement PDF" src={pdfUrl} referrerPolicy="no-referrer" className="h-[80dvh] w-full rounded-xl border bg-white" />}
    </>}
  </div></main>;
}
