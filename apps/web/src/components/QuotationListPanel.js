import useQuotationResponseCounts from '../hooks/useQuotationResponseCounts';
import ResponseCountBadge from './ResponseCountBadge';
import { copyText } from '../utils/copyText';
import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import Pagination from './Pagination';
import QuotationLinkDialog from './QuotationLinkDialog';
import QuotationDeleteDialog from './QuotationDeleteDialog';

function ActionIcon({ name }) {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {name === 'edit' ? <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z" /><path d="M13 20h7" /></> : name === 'copy' ? <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></> : <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>}
  </svg>;
}

export default function QuotationListPanel({ token, embedded = false, onDeleted, responseCounts }) {
  const liveCounts = useQuotationResponseCounts(token, !responseCounts);
  const counts = responseCounts || liveCounts;
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [copiedMessage, setCopiedMessage] = useState('');
  const [linkQuotation, setLinkQuotation] = useState(null);
  const [deleteQuotation, setDeleteQuotation] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const selectAllRef = useRef(null);
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = selectedRows.length > 0 && !allSelected; }, [selectedRows.length, allSelected, loading]);

  async function copyLink(row) {
    setCopiedMessage('');
    try {
      await copyText(`${window.location.origin}${row.sharePath}`);
      setCopiedMessage(`Client link copied for ${row.reference}.`);
    } catch { setLinkQuotation(row); }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSelectedIds([]);
    setError('');
    const params = new URLSearchParams({ page: String(page), search });
    fetch(`${getApiBaseUrl()}/api/admin/quotations?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load quotations.');
        if (!controller.signal.aborted) { setRows(payload.quotations); setTotal(payload.total); }
      }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, search, page, revision]);

  return (
    <div className="max-w-[90rem]">
      {embedded ? <p className="text-sm text-slate-600">Browse all saved quotations, check client responses, and copy their links.</p> : <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Sales workspace</p><h1 className="mt-3 text-4xl font-bold">Quotation List <ResponseCountBadge count={counts.unreadCount} /></h1><p className="mt-3 text-sm text-slate-600">Browse saved quotations, check validity, and open them to edit or share.</p></div>
        <a className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" href="/admin/quotations">Create Quotation</a>
      </header>}
      {copiedMessage && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{copiedMessage}</p>}
      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="All quotations">
        <form className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-5" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(input.trim()); setRevision((value) => value + 1); }}>
          <label className="grid flex-1 gap-2 text-sm font-bold text-slate-700">Search quotations
            <input className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal" value={input} maxLength={180} onChange={(event) => setInput(event.target.value)} placeholder="Reference, client, email, or project" />
          </label>
          <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" type="submit">Search</button>
          {search && <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600" type="button" onClick={() => { setInput(''); setSearch(''); setPage(1); }}>Clear</button>}
        </form>
        {loading ? <p className="p-6 text-sm text-slate-500" role="status">Loading quotations...</p> : error ? <div className="p-6 text-sm text-rose-700" role="alert">{error}<button className="ml-3 underline" type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></div> : <>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
            <span className="text-sm text-slate-600">{selectedRows.length ? `${selectedRows.length} selected` : 'Select quotations to delete together'}</span>
            {selectedRows.length > 0 && <>
              <button className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50" type="button" onClick={() => setDeleteQuotation(selectedRows)}><ActionIcon name="delete" />Delete selected ({selectedRows.length})</button>
              <button className="text-sm font-bold text-slate-600" type="button" onClick={() => setSelectedIds([])}>Clear selection</button>
            </>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4"><input ref={selectAllRef} className="h-4 w-4 accent-[#514568]" type="checkbox" aria-label="Select all quotations on this page" checked={allSelected} disabled={!rows.length} onChange={(event) => setSelectedIds(event.target.checked ? rows.map((row) => row.id) : [])} /></th>{['Reference', 'Client / Project', 'Total', 'Valid until', 'Client link', 'Response', 'Actions'].map((heading) => <th className="px-5 py-4" key={heading}>{heading}</th>)}</tr></thead>
              <tbody>{rows.map((row) => {
                const expired = row.expiresAt && Date.now() >= Date.parse(row.expiresAt);
                const signed = Boolean(row.contractState?.clientSignedAt || (row.clientResponse?.current && row.clientResponse.signedAt));
                const contractStatus = signed ? row.document.acceptancePolicy ? row.contractState?.status === 'finalized' ? 'Finalized and locked' : 'Pending Admin Confirmation' : 'Contract signed' : null;
                return <tr className={`border-b border-slate-100 ${selectedIds.includes(row.id) ? 'bg-[#f7f5fa]' : ''}`} key={row.id}>
                  <td className="px-5 py-4"><input className="h-4 w-4 accent-[#514568]" type="checkbox" aria-label={`Select ${row.reference}`} checked={selectedIds.includes(row.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></td>
                  <td className="px-5 py-4 font-bold text-[#514568]">{row.reference}</td>
                  <td className="max-w-xs px-5 py-4"><p className="break-words font-bold">{row.document.clientName}</p><p className="mt-1 break-words text-slate-500">{row.document.title}</p></td>
                  <td className="whitespace-nowrap px-5 py-4 font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: row.document.currency }).format(row.document.total)}{row.document.hasRecurring && <p className="mt-1 text-xs font-normal text-slate-600">One-time + {new Intl.NumberFormat('en-PH', { style: 'currency', currency: row.document.currency }).format(row.document.recurringTotal)} / {row.document.billingPeriod === 'yearly' ? 'year' : 'month'}</p>}</td>
                  <td className="px-5 py-4"><p>{row.document.validUntil}</p><span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs ${expired ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{expired ? 'Expired' : 'Valid'}</span></td>
                  <td className="px-5 py-4 text-slate-600">{row.sharePath ? expired ? 'Expired' : 'Shared' : 'Not shared'}</td>
                  <td className="px-5 py-4 text-xs font-bold text-[#514568]"><ResponseCountBadge count={counts.quotations[row.id] || 0} reference={row.reference} />{row.clientResponse ? row.clientResponse.current ? row.clientResponse.action === 'accept' ? 'Accepted' : 'Requote requested' : 'Changed since response' : 'Awaiting response'}
                    {contractStatus ? <p className={`mt-2 font-normal ${row.document.acceptancePolicy && row.contractState?.status !== 'finalized' ? 'text-amber-800' : 'text-emerald-700'}`}>{contractStatus}</p> : row.clientResponse?.current && row.clientResponse.action === 'accept' && <p className="mt-2 font-normal text-amber-800">{row.document.clientFlow === 'quotation_only' ? 'Contract and payment details to follow' : 'Contract pending signature'}</p>}
                    {signed && ['paid', 'unpaid'].includes(row.paymentStatus) && <p className={`mt-2 font-normal ${row.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-slate-600'}`}>Payment: {row.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</p>}
                  </td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
                    <a className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#514568] hover:bg-slate-50" href={`/admin/quotations?id=${row.id}`} title="Open / Edit" aria-label={`Open ${row.reference}`}><ActionIcon name="edit" /></a>
                    <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#514568] hover:bg-slate-50 disabled:opacity-40" type="button" disabled={!row.sharePath} title={row.sharePath ? 'Copy Link' : 'Open the quotation to generate a client link'} aria-label={`Copy link for ${row.reference}`} onClick={() => copyLink(row)}><ActionIcon name="copy" /></button>
                    <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50" type="button" title="Delete" aria-label={`Delete ${row.reference}`} onClick={() => setDeleteQuotation([row])}><ActionIcon name="delete" /></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {!rows.length && <p className="p-8 text-center text-sm text-slate-500">{search ? 'No quotations match your search.' : 'No saved quotations yet. Create your first quotation to get started.'}</p>}
          <div className="p-5"><Pagination currentPage={page} pageSize={20} totalItems={total} itemLabel="quotations" onPageChange={setPage} /></div>
        </>}
      </section>
      {linkQuotation && <QuotationLinkDialog quotation={linkQuotation} onClose={() => setLinkQuotation(null)} />}
      {deleteQuotation && <QuotationDeleteDialog token={token} quotations={deleteQuotation} onClose={() => setDeleteQuotation(null)} onDeleted={(deleted) => {
        setDeleteQuotation(null); setSelectedIds([]); setCopiedMessage(`${deleted.length === 1 ? deleted[0].reference : `${deleted.length} quotations`} deleted. Client links are no longer available.`);
        setPage((value) => rows.length === deleted.length && value > 1 ? value - 1 : value); setRevision((value) => value + 1); deleted.forEach((row) => onDeleted?.(row));
      }} />}
    </div>
  );
}
