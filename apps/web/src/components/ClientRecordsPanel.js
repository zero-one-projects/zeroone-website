import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
const primary = 'admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-40';
const secondary = 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#514568] disabled:opacity-40';
function responseText(response) {
  if (!response) return 'Awaiting response';
  if (!response.current) return 'Quotation updated · review required';
  if (response.action === 'requote') return 'Requote requested';
  return response.signedAt ? 'Contract signed' : 'Accepted · signature pending';
}
const newClientDraft = type => ({ type, clientName: '', clientEmail: '', contactPerson: '', clientAddress: '', isActive: true });
export default function ClientRecordsPanel({ token, initialAdd = false }) {
  const [type, setType] = useState('subscription');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('active');
  const [statusSaving, setStatusSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState(() => initialAdd ? newClientDraft('subscription') : null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const addDialog = useRef(null);
  const isAdding = Boolean(draft);
  useEffect(() => { if (initialAdd) { setDraft(newClientDraft('subscription')); setSaveError(''); } }, [initialAdd]);
  useEffect(() => {
    if (!isAdding) return undefined;
    const element = addDialog.current, focus = document.activeElement; element.showModal();
    return () => { element.close(); if (focus?.isConnected) focus.focus(); };
  }, [isAdding]);
  const money = (amount, currency) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency || 'PHP' }).format(amount || 0);
  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${getApiBaseUrl()}/api/admin/${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(response.status === 401 ? 'Your admin session has expired. Please sign in again.' : payload.message || 'Unable to load client records.'); }
    return response;
  }, [token]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    request(`clients?type=${type}&page=${page}&search=${encodeURIComponent(query)}&status=${statusFilter}`, { signal: controller.signal }).then(res => res.json())
      .then(payload => { if (!controller.signal.aborted) { setClients(payload.clients); setTotal(payload.total); } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, type, query, statusFilter, page, revision]);
  useEffect(() => {
    if (!selected) return undefined;
    const controller = new AbortController(); setOpening(true); setProfile(null); setError('');
    request(`clients/${selected}?type=${type}`, { signal: controller.signal }).then(res => res.json())
      .then(payload => { if (!controller.signal.aborted) setProfile(payload); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setOpening(false); });
    return () => controller.abort();
  }, [request, selected, type, revision]);
  function closeAddClient() {
    setDraft(null);
    if (window.location.pathname === '/admin/clients/add') {
      window.history.replaceState({}, '', '/admin/clients');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }
  async function saveClient(event) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setSaveError('');
    try {
      const response = await request('clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const payload = await response.json();
      setType(draft.type); setPage(1); setQuery(''); setSearch(''); setProfile(null); setSelected(payload.client.id);
      closeAddClient(); setNotice(payload.message || 'Client added successfully.'); setRevision(value => value + 1);
    } catch (failure) { setSaveError(failure.message); }
    finally { setSaving(false); }
  }
  async function updateStatus(client) {
    if (!client || statusSaving) return;
    setStatusSaving(true); setError(''); setNotice('');
    try {
      const response = await request(`clients/${client.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, isActive: client.isActive === false }) });
      const payload = await response.json();
      setProfile(current => current && current.client.id === client.id ? { ...current, client: payload.client } : current);
      setClients(current => current.map(row => row.id === client.id ? { ...row, isActive: payload.client.isActive } : row));
      setNotice(payload.message);
      if (!selected && page > 1 && clients.length === 1 && statusFilter !== 'all' && (statusFilter === 'active') !== payload.client.isActive) setPage(value => value - 1);
      else setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setStatusSaving(false); }
  }
  async function download(bill) {
    setDownloading(true); setError('');
    try {
      const response = await request(`billing/${bill.id}/pdf`); const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = `${bill.reference}.pdf`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (failure) { setError(failure.message); } finally { setDownloading(false); }
  }
  return <section className="max-w-7xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sales workspace</p><h1 className="mt-3 text-4xl font-bold">Client Record</h1></div></div>
    <p className="mt-3 text-sm leading-7 text-slate-600">Search clients, check their Active or Inactive status, and view quotations, contracts, and subscription billing history.</p>
    <div className="my-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist" aria-label="Client payment type" onKeyDown={event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
      const button = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons[1] : buttons[buttons.indexOf(event.target) === 0 ? 1 : 0]; button.click(); button.focus();
    }}>{[['subscription', 'Custom Subscriptions'], ['project', 'Custom One-time Payment']].map(([value, label]) => <button key={value} type="button" id={`client-tab-${value}`} role="tab" aria-selected={type === value} aria-controls="client-records-panel" tabIndex={type === value ? 0 : -1} className={type === value ? primary : secondary} onClick={() => { setType(value); setSelected(null); setProfile(null); setPage(1); setQuery(''); setSearch(''); }}>{label}</button>)}</div>
    {notice && <p role="status" className="mb-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {error && <div className="mb-5 rounded-lg bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}{error.includes('session has expired') ? <a href="/admin/login" className="ml-3 underline">Sign in again</a> : <button className="ml-3 underline" type="button" onClick={() => setRevision(value => value + 1)}>Retry</button>}</div>}
    <div role="tabpanel" id="client-records-panel" aria-labelledby={`client-tab-${type}`}>
      <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setQuery(search); setPage(1); setSelected(null); setProfile(null); setNotice(''); }}><label className="grid min-w-[200px] flex-1 gap-2 text-sm font-bold" htmlFor="client-search">Search clients<input id="client-search" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal" placeholder="Client, email, contact person, project, or reference" maxLength={180} value={search} onChange={event => setSearch(event.target.value)} /></label><label className="grid gap-2 text-sm font-bold">Client status<select className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); setSelected(null); setProfile(null); setNotice(''); }}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All clients</option></select></label><button className={primary}>Search</button></form>
      {!selected ? <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        {loading ? <p role="status">Loading client records…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Client / contact', 'Status', 'Latest project', 'Quotations', 'Contracts', 'Actions'].map(label => <th className="px-3 py-4" key={label}>{label}</th>)}</tr></thead><tbody>{clients.map(client => <tr key={client.id} className="border-b border-slate-100"><td className="px-3 py-4"><p className="font-bold">{client.clientName}</p><p className="mt-1 text-slate-500">{client.clientEmail || 'No email recorded'}</p>{client.contactPerson && <p className="mt-1 text-xs text-slate-500">{client.contactPerson}</p>}</td><td className="px-3 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${client.isActive === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-800'}`}>{client.isActive === false ? 'Inactive' : 'Active'}</span></td><td className="px-3 py-4">{client.latestProject || 'No quotations yet'}</td><td className="px-3 py-4">{client.quotationCount}</td><td className="px-3 py-4"><p>{client.signedCount} signed</p><p className="mt-1 text-xs text-slate-500">{client.acceptedCount} accepted quotations</p></td><td className="px-3 py-4"><div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={() => setSelected(client.id)} aria-label={`View record for ${client.clientName}`}>View Record</button><button type="button" className={secondary} disabled={statusSaving} onClick={() => updateStatus(client)} aria-label={`${client.isActive === false ? 'Reactivate' : 'Deactivate'} ${client.clientName}`}>{client.isActive === false ? 'Reactivate Client' : 'Deactivate Client'}</button></div></td></tr>)}{!clients.length && !error && <tr><td colSpan={6} className="py-10 text-center text-slate-500">No {type === 'subscription' ? 'custom subscription' : 'custom one-time payment'} client records found for this search and status filter.</td></tr>}</tbody></table></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{total} clients · Page {page}</span><div className="flex gap-2"><button className={secondary} type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={secondary} type="button" disabled={loading || page * 20 >= total} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
      </section> : <div className="grid gap-5">
        <button className={`${secondary} justify-self-start`} type="button" onClick={() => { setSelected(null); setProfile(null); }}>← Back to clients</button>
        {opening && <p role="status">Opening client record…</p>}
        {profile && <><section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{profile.client.clientName}</h2><span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${profile.client.isActive === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-800'}`}>{profile.client.isActive === false ? 'Inactive' : 'Active'}</span></div><button type="button" className={secondary} disabled={statusSaving || opening} onClick={() => updateStatus(profile.client)}>{statusSaving ? 'Updating…' : profile.client.isActive === false ? 'Reactivate Client' : 'Deactivate Client'}</button></div><p className="mt-2 text-sm font-bold text-[#514568]">{type === 'subscription' ? 'Custom Subscriptions' : 'Custom One-time Payment'}</p><dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="font-bold text-slate-500">Email</dt><dd className="mt-1 break-words">{profile.client.clientEmail || 'Not recorded'}</dd></div><div><dt className="font-bold text-slate-500">Contact person</dt><dd className="mt-1">{profile.client.contactPerson || 'Not recorded'}</dd></div><div className="sm:col-span-2"><dt className="font-bold text-slate-500">Address</dt><dd className="mt-1 whitespace-pre-wrap">{profile.client.clientAddress || 'Not recorded'}</dd></div></dl></section>
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-lg font-bold">Quotations & contracts</h3><p className="mt-2 text-sm text-slate-500">Open a quotation to review its contract, response history, and client details.</p><div className="mt-4 grid gap-3">{!profile.client.quotations.length && <p className="text-sm text-slate-500">No quotations linked yet.</p>}{profile.client.quotations.map(q => <article key={q.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 p-4"><div><p className="text-xs font-bold text-[#514568]">{q.reference}</p><h4 className="mt-1 font-bold">{q.title}</h4><p className="mt-2 text-sm">{type === 'subscription' ? `One-time charges: ${money(q.total, q.currency)}` : money(q.total, q.currency)}</p>{type === 'subscription' && <p className="mt-1 text-sm font-bold">{money(q.recurringTotal, q.currency)} / {q.billingPeriod === 'yearly' ? 'year' : 'month'}</p>}<p className="mt-2 text-xs font-bold text-slate-500">{responseText(q.response)}</p></div><a className={secondary} href={`/admin/quotations?id=${q.id}`}>Open Quotation</a></article>)}</div></section>
          {type === 'subscription' && <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Billing history</h3><a className={secondary} href="/admin/billing">Generate Billing</a></div>{profile.statements.length ? <div className="mt-4 grid gap-3">{profile.statements.map(bill => <div key={bill.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-bold text-[#514568]">{bill.reference}</p><p className="mt-1 text-sm">{bill.period} · {money(bill.document.amountDue ?? bill.document.total, bill.document.currency)}</p><p className="mt-1 text-xs text-slate-500">Due {bill.document.dueOn}</p></div><button type="button" className={secondary} disabled={downloading} onClick={() => download(bill)}>Download Bill PDF</button></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No billing statements saved for this client.</p>}</section>}
        </>}
      </div>}
    </div>
    {draft && <dialog ref={addDialog} aria-labelledby="add-client-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[94vw] max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-xl backdrop:bg-slate-950/60" onCancel={event => { event.preventDefault(); if (!saving) closeAddClient(); }}>
      <form className="grid gap-5" onSubmit={saveClient}>
        <h2 id="add-client-title" className="text-2xl font-bold">Add Client</h2>
        <p className="text-sm text-slate-600">Register a client now. Matching quotations will appear in their record when saved.</p>
        {saveError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{saveError}</p>}
        <fieldset disabled={saving} className="grid gap-4 disabled:opacity-60">
          <label className="grid gap-2 text-sm font-bold">Client status<select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal" value={draft.isActive ? 'active' : 'inactive'} onChange={event => setDraft(current => ({ ...current, isActive: event.target.value === 'active' }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Payment type<select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal" value={draft.type} onChange={event => setDraft(current => ({ ...current, type: event.target.value }))}><option value="subscription">Custom Subscriptions</option><option value="project">Custom One-time Payment</option></select></label>
          {[['clientName', 'Client / company name', true], ['clientEmail', 'Client email', true], ['contactPerson', 'Contact person (optional)', false]].map(([key, label, required]) => <label key={key} className="grid gap-2 text-sm font-bold">{label}<input autoFocus={key === 'clientName'} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal" type={key === 'clientEmail' ? 'email' : 'text'} required={required} maxLength={180} value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} /></label>)}
          <label className="grid gap-2 text-sm font-bold">Client address (optional)<textarea className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal" rows={3} maxLength={2000} value={draft.clientAddress} onChange={event => setDraft(current => ({ ...current, clientAddress: event.target.value }))} /></label>
        </fieldset>
        <div className="flex justify-end gap-3"><button className={secondary} type="button" disabled={saving} onClick={closeAddClient}>Cancel</button><button className={primary} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Client'}</button></div>
      </form>
    </dialog>}
  </section>;
}
