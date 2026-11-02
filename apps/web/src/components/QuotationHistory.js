import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import SignedAgreement from './SignedAgreement';

export default function QuotationHistory({ token, quotationId, updatedAt, reference }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setHistory([]);
    fetch(`${getApiBaseUrl()}/api/admin/quotations/${quotationId}/history`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to load response history.');
      if (!Array.isArray(payload.history)) throw new Error('Unable to load response history. Please refresh history.');
      if (!controller.signal.aborted) setHistory(payload.history);
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, quotationId, updatedAt, retry]);

  return <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Response history">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-bold">Response history</h3>
      <button type="button" className="text-sm font-bold text-[#514568]" disabled={loading} onClick={() => setRetry((value) => value + 1)}>Refresh history</button>
    </div>
    <p className="mt-2 text-sm text-slate-600">Verified client responses are kept when you revise this quotation. Newest first.</p>
    {loading ? <p className="mt-3 text-sm" role="status">Loading history…</p> : error ? <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p> : !history.length ? <p className="mt-3 text-sm text-slate-500">No client responses yet.</p> :
      <ol className="mt-4 grid gap-4">{history.map((entry) => <li key={`${entry.documentHash}-${entry.respondedAt}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="font-bold text-[#514568]">{entry.action === 'accept' ? 'Quotation accepted' : 'Requote requested'}</h4>
        <p className="mt-2 text-sm">{entry.name} · {entry.email}</p>
        <p className="mt-1 text-xs text-slate-500">{new Date(entry.respondedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>
        {entry.note && <p className="mt-3 whitespace-pre-wrap text-sm">{entry.note}</p>}
        {entry.action === 'accept' && !entry.signature && entry.document?.clientFlow !== 'quotation_only' && <p className="mt-3 text-sm text-amber-800">Contract pending signature</p>}
        <SignedAgreement signature={entry.signature} document={entry.document} reference={reference} token={token} quotationId={quotationId} />
        {entry.document && <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-bold">View quotation at time of response</summary>
          <div className="mt-3 grid gap-3">
            <p className="font-bold">{entry.document.title}</p>
            <p>{entry.document.clientName} · {entry.document.currency} {Number(entry.document.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            {entry.document.hasRecurring && <p>Subscription: {entry.document.currency} {Number(entry.document.recurringTotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })} / {entry.document.billingPeriod === 'yearly' ? 'year' : 'month'}</p>}
            <p>Issued: {entry.document.issuedOn} · Valid until: {entry.document.validUntil}</p>
            {entry.document.items?.map((item, index) => <div key={index}>
              <p className="whitespace-pre-wrap font-bold">{item.description}</p>
              <p>Quantity: {item.quantity} · Unit price: {item.unitPrice}</p>
              {item.chargeType === 'recurring' && <p>Recurring · {entry.document.billingPeriod}</p>}
              {item.scope?.map((scope, scopeIndex) => <p key={scopeIndex} className="mt-2 whitespace-pre-wrap"><strong>{scope.title}</strong><br />{scope.details}</p>)}
            </div>)}
            {entry.document.timeline && <p>Timeline: {entry.document.timeline}</p>}
            {entry.document.notes && <p className="whitespace-pre-wrap">{entry.document.notes}</p>}
          </div>
        </details>}
      </li>)}</ol>}
  </section>;
}
