import { useCallback, useEffect, useRef, useState } from 'react';
import BillingDeleteDialog from './BillingDeleteDialog';
import { posBillingRate } from '../utils/posUpgrade';
import BillingPaymentDetailsButton from './BillingPaymentDetailsButton';
import quotationLogo from '../assets/landing/Newlogo.png';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
const field = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-950';
const primary = 'admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-40';
const secondary = 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#514568] disabled:opacity-40';
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); }
function initialForm() { const issuedOn = today(); const due = new Date(`${issuedOn}T00:00:00Z`); due.setUTCDate(due.getUTCDate() + 7); return { kind: 'manual', clientName: '', clientCompany: '', clientEmail: '', clientAddress: '', title: '', currency: 'PHP', taxRate: 0, taxTreatment: 'non_vat', advancePayment: 0, deductionNote: '', paymentInstructions: '', items: [{ description: '', quantity: 1, unitPrice: '' }], quotationId: '', period: issuedOn.slice(0, 7), issuedOn, dueOn: due.toISOString().slice(0, 10), goLiveOn: '', notes: '' }; }
export default function BillingPanel({ token }) {
  const [form, setForm] = useState(initialForm);
  const [subscriptions, setSubscriptions] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [saved, setSaved] = useState(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteSelection, setDeleteSelection] = useState(null);
  const selectAll = useRef(null);
  const selectedStatements = statements.filter(row => selectedIds.includes(row.id));
  useEffect(() => { setSelectedIds([]); }, [page, query]);
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = selectedStatements.length > 0 && selectedStatements.length < statements.length; }, [selectedStatements.length, statements.length, loading]);
  const dialog = useRef(null);
  const [clientLink, setClientLink] = useState('');
  const [emailDraft, setEmailDraft] = useState(null);
  const emailDialog = useRef(null);
  const isEmailOpen = Boolean(emailDraft);
  const manual = form.kind === 'manual';
  const subtotal = form.items.reduce((sum, item) => sum + Math.round(Number(item.quantity) * Math.round(Number(item.unitPrice) * 100)), 0) / 100;
  const selected = subscriptions.find(row => String(row.id) === String(form.quotationId));
  const statementTotal = manual ? subtotal : Number(posBillingRate(selected, form.period, form.issuedOn));
  const totalDue = (Math.round(statementTotal * 100) - Math.round(Number(form.advancePayment || 0) * 100)) / 100;
  const money = (value, currency) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency || 'PHP' }).format(value);
  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${getApiBaseUrl()}/api/admin/billing${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(response.status === 401 ? 'Your admin session has expired. Please sign in again.' : payload.message || 'Unable to load billing.'); }
    return response;
  }, [token]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    Promise.all([request('/subscriptions', { signal: controller.signal }).then(res => res.json()), request(`?page=${page}&search=${encodeURIComponent(query)}`, { signal: controller.signal }).then(res => res.json())])
      .then(([clients, bills]) => { if (!controller.signal.aborted) { setSubscriptions(clients.subscriptions); setStatements(bills.statements); setTotal(bills.total); setSelectedIds(current => current.filter(id => bills.statements.some(row => row.id === id))); } })
      .catch(error => { if (!controller.signal.aborted) setNotice({ error: true, text: error.message }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, page, query, revision]);
  useEffect(() => {
    if (!preview) return undefined;
    const element = dialog.current; const focus = document.activeElement; element.showModal();
    return () => { element.close(); URL.revokeObjectURL(preview.url); if (focus?.isConnected) focus.focus(); };
  }, [preview]);
  useEffect(() => {
    if (!isEmailOpen) return undefined;
    const element = emailDialog.current, focus = document.activeElement;
    element.showModal();
    return () => { element.close(); if (focus?.isConnected) focus.focus(); };
  }, [isEmailOpen]);
  function composeEmail(bill) { setEmailDraft({ bill, recipient: bill.emailSentTo || bill.document.clientEmail || '', cc: '', note: '' }); }
  async function sendEmail(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setNotice(null);
    try {
      const response = await request(`/${emailDraft.bill.id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: emailDraft.recipient, cc: emailDraft.cc, note: emailDraft.note, previousSentAt: emailDraft.bill.emailSentAt || null }) });
      const payload = await response.json();
      setStatements(current => current.map(row => row.id === payload.statement.id ? payload.statement : row));
      if (saved?.id === payload.statement.id) setSaved(payload.statement);
      setEmailDraft(null); setNotice({ text: payload.message });
    } catch (error) { setNotice({ error: true, text: error.message }); setEmailDraft(current => ({ ...current, error: error.message })); }
    finally { setBusy(false); }
  }
  function onBillingDeleted(payload) {
    setDeleteSelection(null); setSelectedIds([]); setClientLink('');
    setStatements(current => current.filter(row => !payload.deletedIds.includes(row.id)));
    setTotal(current => Math.max(0, current - payload.deletedIds.length));
    if (saved && payload.deletedIds.includes(saved.id)) setSaved(null);
    setNotice({ text: payload.message });
    if (page > 1 && payload.deletedIds.length === statements.length) setPage(current => current - 1);
    else setRevision(current => current + 1);
  }
  function update(key, value) { setForm(current => ({ ...current, [key]: value })); }
  async function generate(event) {
    event.preventDefault(); setBusy(true); setNotice(null); setSaved(null);
    try {
      const response = await request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manual ? form : { ...form, kind: 'subscription' }) });
      const payload = await response.json(); setSaved(payload.statement); setNotice({ text: payload.message }); setRevision(value => value + 1);
    } catch (error) { setNotice({ error: true, text: error.message }); } finally { setBusy(false); }
  }
  async function share(bill, disable = false) {
    setBusy(true); setNotice(null);
    try {
      const response = await request(`/${bill.id}/share`, { method: disable ? 'DELETE' : 'POST' });
      const payload = await response.json();
      setStatements(current => current.map(row => row.id === bill.id ? payload.statement : row));
      if (saved?.id === bill.id) setSaved(payload.statement);
      if (disable) { setClientLink(''); setNotice({ text: 'Client link disabled.' }); }
      else {
        const url = new URL(payload.statement.sharePath.replace(/^\/api/, '').replace(/\/pdf$/, ''), window.location.origin).href;
        setClientLink(url);
        try { await navigator.clipboard.writeText(url); setNotice({ text: 'Client billing link copied. Anyone with this link can view the statement.' }); }
        catch { setNotice({ text: 'Client billing link ready. Copy the link below to send it to your client.' }); }
      }
    } catch (error) { setNotice({ error: true, text: error.message }); } finally { setBusy(false); }
  }
  async function pdf(bill, view = false) {
    setBusy(true); setNotice(null);
    try {
      const response = await request(`/${bill.id}/pdf`); const url = URL.createObjectURL(await response.blob());
      if (view) setPreview({ url, reference: bill.reference, paymentInstructions: bill.document?.paymentInstructions || '' });
      else { const link = document.createElement('a'); link.href = url; link.download = `${bill.reference}.pdf`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    } catch (error) { setNotice({ error: true, text: error.message }); } finally { setBusy(false); }
  }
  return <section className="grid gap-6" aria-label="Billing statements">
    <div><h2 className="text-2xl font-bold">Client billing statements</h2><p className="mt-2 text-sm leading-6 text-slate-600">Create a manual statement for your client, or bill an accepted monthly subscription. Preview the PDF and copy a client link to send it.</p></div>
    <label className="grid max-w-sm gap-2 text-sm font-bold text-slate-700">Billing type<select className={field} value={form.kind} onChange={event => update('kind', event.target.value)}><option value="manual">Manual billing statement</option><option value="subscription">Monthly subscription billing</option></select></label>
    {notice && <div role={notice.error ? 'alert' : 'status'} className={`rounded-lg p-4 text-sm ${notice.error ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{notice.text}{notice.text.includes('session has expired') && <a href="/admin/login" className="ml-3 underline">Sign in again</a>}</div>}
    {clientLink && <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><label className="text-sm font-bold" htmlFor="billing-client-link">Client billing link</label><input id="billing-client-link" className={field} readOnly value={clientLink} onFocus={event => event.target.select()} /><a className="text-sm font-bold text-[#514568] underline" href={clientLink} target="_blank" rel="noreferrer">Open client billing</a><p className="text-xs text-slate-500">Anyone with this link can view this statement without signing in.</p></div>}
    {saved && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><strong>{saved.reference}</strong><button className={secondary} type="button" disabled={busy} onClick={() => pdf(saved)}>Download Latest Bill</button><button className={secondary} type="button" disabled={busy} onClick={() => pdf(saved, true)}>Preview Latest Bill</button><button className={secondary} type="button" disabled={busy} onClick={() => share(saved)}>Copy Client Link</button><button className={primary} type="button" disabled={busy} onClick={() => composeEmail(saved)}>Send to Client</button></div>}
    <form className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={generate}><div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-lg font-bold">Generate billing statement</h3><img src={quotationLogo} alt="ZeroOne Information Technology Inc." className="h-14 w-auto object-contain" /></div>
      <fieldset disabled={busy || loading} className="mt-5 grid gap-5 disabled:opacity-60">
        {manual ? <>
          <div className="grid gap-4 sm:grid-cols-2">{[['clientName', 'Client name', true], ['clientCompany', 'Client company (optional)', false], ['clientEmail', 'Client email (optional)', false], ['title', 'Statement title / project', true], ['clientAddress', 'Client address (optional)', false]].map(([key, label, required]) => <label className="grid gap-2 text-sm font-bold text-slate-700" key={key}>{label}<input className={field} type={key === 'clientEmail' ? 'email' : 'text'} required={required} maxLength={key === 'clientAddress' ? 1000 : key === 'title' ? 240 : 180} value={form[key]} onChange={event => update(key, event.target.value)} /></label>)}</div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-slate-700">Currency<select className={field} value={form.currency} onChange={event => update('currency', event.target.value)}>{['PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'].map(code => <option key={code}>{code}</option>)}</select></label><p className="self-end rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Non-VAT billing · No VAT added</p></div>
          <div className="grid gap-4">{form.items.map((item, index) => <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">{[['description', 'Description', 'text'], ['quantity', 'Quantity', 'number'], ['unitPrice', 'Unit price', 'number']].map(([key, label, type]) => <label className="grid gap-2 text-sm font-bold text-slate-700" key={key}>{label} {index + 1}<input className={field} type={type} required maxLength={key === 'description' ? 1000 : undefined} min={key === 'quantity' ? '0.001' : key === 'unitPrice' ? '0' : undefined} step={key === 'quantity' ? '0.001' : key === 'unitPrice' ? '0.01' : undefined} value={item[key]} onChange={event => update('items', form.items.map((row, i) => i === index ? { ...row, [key]: event.target.value } : row))} /></label>)}<button className={`${secondary} self-end`} type="button" disabled={form.items.length === 1} onClick={() => update('items', form.items.filter((_, i) => i !== index))} aria-label={`Remove item ${index + 1}`}>Remove</button></div>)}</div>
          <button className={`${secondary} justify-self-start`} type="button" disabled={form.items.length >= 50} onClick={() => update('items', [...form.items, { description: '', quantity: 1, unitPrice: '' }])}>Add Item</button>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Payment instructions<textarea className={field} rows={4} maxLength={5000} placeholder={form.currency === 'USD' ? 'Leave blank to use the AUB Dollar Savings Account, 310-19-000104-1, Swift code AUBKPHMM' : 'Leave blank to use the standard company payment instructions'} value={form.paymentInstructions} onChange={event => update('paymentInstructions', event.target.value)} /></label>
        </> : <>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Subscription client<select className={field} required value={form.quotationId} onChange={event => { const client = subscriptions.find(row => String(row.id) === event.target.value); setForm(current => ({ ...current, quotationId: event.target.value, goLiveOn: client?.goLiveOn || '' })); }}><option value="">Choose an accepted subscription</option>{subscriptions.map(row => <option key={row.id} value={row.id}>{row.clientName} — {row.title} ({row.reference})</option>)}</select></label>
        {!loading && !subscriptions.length && <p className="text-sm text-slate-500">No eligible subscriptions yet. The subscription must have monthly recurring charges, an accepted quotation, and a signed contract.</p>}
        {selected && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-bold">{selected.clientName} · {money(statementTotal, selected.currency)} / month</p><p className="mt-1 text-slate-500">{selected.clientEmail || 'No client email recorded'}{selected.lastBilledPeriod ? ` · Last billed: ${selected.lastBilledPeriod}` : ' · Not yet billed'}</p></div>}
        </>}
        <div className="grid gap-4 sm:grid-cols-2">{!manual && <label className="grid gap-2 text-sm font-bold text-slate-700">System go-live date<input className={field} type="date" required max={today()} readOnly={Boolean(selected?.goLiveOn)} value={form.goLiveOn} onChange={event => update('goLiveOn', event.target.value)} /></label>}<label className="grid gap-2 text-sm font-bold text-slate-700">Billing month<input className={field} type="month" required min={!manual ? form.goLiveOn?.slice(0, 7) || undefined : undefined} value={form.period} onChange={event => update('period', event.target.value)} /></label><label className="grid gap-2 text-sm font-bold text-slate-700">Billing issue date<input className={field} type="date" required value={form.issuedOn} onChange={event => update('issuedOn', event.target.value)} /></label><label className="grid gap-2 text-sm font-bold text-slate-700">Payment due date<input className={field} type="date" required min={form.issuedOn} value={form.dueOn} onChange={event => update('dueOn', event.target.value)} /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-slate-700">Advance payment / deduction<input className={field} type="number" min="0" max={statementTotal} step="0.01" value={form.advancePayment} onChange={event => update('advancePayment', event.target.value)} /></label><label className="grid gap-2 text-sm font-bold text-slate-700">Deduction details (optional)<input className={field} maxLength={500} placeholder="e.g. Advance payment received" value={form.deductionNote} onChange={event => update('deductionNote', event.target.value)} /></label></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-bold text-slate-500">SUMMARY</p><div className="mt-3 flex justify-between gap-3 text-sm"><span>{manual ? 'Subtotal' : 'Statement total'}</span><span>{money(statementTotal, manual ? form.currency : selected?.currency)}</span></div>{Number(form.advancePayment) > 0 && <div className="mt-3 flex justify-between gap-3 text-sm"><span>Less: Advance payment / deduction</span><span>−{money(form.advancePayment, manual ? form.currency : selected?.currency)}</span></div>}<p className="mt-4 border-t border-slate-200 pt-4 text-lg font-bold">Total Amount Due: <output aria-label="Billing total">{money(totalDue, manual ? form.currency : selected?.currency)}</output></p></div>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Billing notes (optional)<textarea className={field} rows={3} maxLength={5000} value={form.notes} onChange={event => update('notes', event.target.value)} /></label>
        {!manual && <p className="text-xs leading-5 text-slate-500">Each statement bills the full agreed monthly amount; there is no automatic proration. Only one statement can be saved per subscription per month. The go-live date is kept after the first bill. POS statements use the signed rate effective in the selected billing month, as of the issue date (or the month boundary when issuing outside that month).</p>}
        <button className={`${primary} justify-self-start`} type="submit" disabled={!manual && !selected}>{busy ? 'Please wait…' : 'Generate Billing'}</button>
      </fieldset>
    </form>
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Saved billing statements"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Billing history</h3><button className="rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-40" type="button" disabled={busy || loading || !selectedStatements.length} onClick={() => setDeleteSelection(selectedStatements)}>Delete Selected{selectedStatements.length ? ` (${selectedStatements.length})` : ''}</button></div>
      <form className="my-4 flex gap-3" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search); }}><label className="sr-only" htmlFor="billing-search">Search billing</label><input id="billing-search" className={field} value={search} onChange={event => setSearch(event.target.value)} placeholder="Client, project, or billing month" maxLength={180} /><button className={secondary}>Search</button></form>
      {loading ? <p role="status">Loading billing…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-4"><input ref={selectAll} type="checkbox" aria-label="Select all billing statements on this page" disabled={busy || !statements.length} checked={Boolean(statements.length) && selectedStatements.length === statements.length} onChange={event => setSelectedIds(event.target.checked ? statements.map(row => row.id) : [])} /></th>{['Reference / client', 'Billing month', 'Due date', 'Amount due', 'Actions'].map(label => <th className="px-3 py-4" key={label}>{label}</th>)}</tr></thead><tbody>{statements.map(bill => <tr key={bill.id} className="border-b border-slate-100"><td className="px-3 py-4"><input type="checkbox" aria-label={`Select ${bill.reference}`} disabled={busy} checked={selectedIds.includes(bill.id)} onChange={event => setSelectedIds(current => event.target.checked ? [...current, bill.id] : current.filter(id => id !== bill.id))} /></td><td className="px-3 py-4"><p className="font-bold text-[#514568]">{bill.reference}</p><p className="mt-1">{bill.document.clientName}</p><p className="mt-1 text-xs text-slate-500">{bill.document.title}</p>{bill.emailSentAt && <p className="mt-2 text-xs text-slate-500">Email submitted to {bill.emailSentTo}<br />{new Date(bill.emailSentAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>}</td><td className="px-3 py-4">{bill.period}</td><td className="px-3 py-4">{bill.document.dueOn}</td><td className="whitespace-nowrap px-3 py-4 font-bold">{money(bill.document.amountDue ?? bill.document.total, bill.document.currency)}</td><td className="px-3 py-4"><div className="flex flex-wrap gap-2"><button className={secondary} type="button" disabled={busy} onClick={() => pdf(bill, true)}>Preview</button><button className={secondary} type="button" disabled={busy} onClick={() => pdf(bill)}>Download PDF</button><button className={secondary} type="button" disabled={busy} onClick={() => share(bill)}>Copy Client Link</button><button className={secondary} type="button" disabled={busy} onClick={() => composeEmail(bill)}>Send to Client</button><button className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-40" type="button" disabled={busy} onClick={() => setDeleteSelection([bill])} aria-label={`Delete ${bill.reference}`}>Delete</button>{bill.sharePath && <button className={secondary} type="button" disabled={busy} onClick={() => share(bill, true)}>Disable Link</button>}</div></td></tr>)}{!statements.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No billing statements found.</td></tr>}</tbody></table></div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{total} billing statements · Page {page}</span><div className="flex gap-2"><button className={secondary} type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={secondary} type="button" disabled={loading || page * 20 >= total} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
    </section>
    {deleteSelection && <BillingDeleteDialog token={token} statements={deleteSelection} onClose={() => setDeleteSelection(null)} onDeleted={onBillingDeleted} />}
    {emailDraft && <dialog ref={emailDialog} aria-label="Send billing statement" className="fixed inset-0 m-auto w-[94vw] max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-xl backdrop:bg-slate-950/60" onCancel={event => { event.preventDefault(); if (!busy) setEmailDraft(null); }}>
      <form onSubmit={sendEmail} className="grid gap-5"><h3 className="text-xl font-bold">Send billing statement</h3><p className="text-sm text-slate-600">{emailDraft.bill.reference} · {emailDraft.bill.document.clientName}</p>
        <p className="rounded-lg bg-slate-50 p-3 text-sm"><strong>From:</strong> ZeroOne Billing &lt;billing@zerooneitinc.com&gt;<br /><strong>CC:</strong> billing@zerooneitinc.com<br /><strong>Attachment:</strong> {emailDraft.bill.reference}.pdf</p>
        {emailDraft.bill.emailSentAt && <p className="text-sm text-amber-800">Previously submitted to {emailDraft.bill.emailSentTo}. Sending again creates another email.</p>}
        {emailDraft.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{emailDraft.error}</p>}
        <label className="grid gap-2 text-sm font-bold">Client email<input autoFocus className={field} type="email" required maxLength={180} disabled={busy} value={emailDraft.recipient} onChange={event => setEmailDraft(current => ({ ...current, recipient: event.target.value }))} /></label>
        <label className="grid gap-2 text-sm font-bold">Additional CC (optional)<input className={field} type="text" maxLength={2000} disabled={busy} placeholder="accounts@example.com, manager@example.com" aria-describedby="billing-cc-help" value={emailDraft.cc} onChange={event => setEmailDraft(current => ({ ...current, cc: event.target.value }))} /></label>
        <p id="billing-cc-help" className="-mt-3 text-xs text-slate-500">Add up to 10 addresses, separated by commas or semicolons. billing@zerooneitinc.com automatically receives a copy.</p>
        <label className="grid gap-2 text-sm font-bold">Message (optional)<textarea className={field} rows={4} maxLength={5000} disabled={busy} value={emailDraft.note} onChange={event => setEmailDraft(current => ({ ...current, note: event.target.value }))} /></label>
        <div className="flex justify-end gap-3"><button className={secondary} type="button" disabled={busy} onClick={() => setEmailDraft(null)}>Cancel</button><button className={primary} type="submit" disabled={busy}>{busy ? 'Sending…' : emailDraft.bill.emailSentAt ? 'Send Again' : 'Send Email'}</button></div>
      </form>
    </dialog>}
    {preview && <dialog ref={dialog} aria-label="Billing PDF preview" className="fixed inset-0 m-auto w-[94vw] max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-950/60 max-h-[94dvh] overflow-y-auto" onCancel={event => { event.preventDefault(); setPreview(null); }}><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">{preview.reference}</h3><div className="flex flex-wrap gap-3"><BillingPaymentDetailsButton instructions={preview.paymentInstructions} reference={preview.reference} /><button className={secondary} onClick={() => setPreview(null)}>Close Preview</button></div></div><iframe title="Billing statement PDF" src={preview.url} className="h-[75dvh] w-full border" /></dialog>}
  </section>;
}
