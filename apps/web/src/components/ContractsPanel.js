import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { newQuotation } from '../utils/quotation';
import { openContractPreview } from '../utils/printContract';

export const contractTypes = { project: 'One-time payment', subscription: 'Custom subscription', pos: 'POS setup & add-ons' };
const secondary = 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#514568] disabled:opacity-40';
const primary = 'admin-brand-surface rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-40';

export default function ContractsPanel({ token }) {
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [templates, setTemplates] = useState({});
  const [formats, setFormats] = useState({});
  const [contracts, setContracts] = useState({});
  const [type, setType] = useState('project');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [retry, setRetry] = useState(0);
  const [pdfPreview, setPdfPreview] = useState(null);
  const previewDialog = useRef(null);
  const current = contracts[type] || { source: 'default', pdf: null };
  const request = useCallback(async (url, options) => {
    const response = await fetch(url, options);
    if (response.status === 401) {
      setSessionExpired(true);
      throw new Error('Your admin session has expired. Please sign in again.');
    }
    return response;
  }, []);
  function load(payload, selectedType) {
    setLoaded(true);
    setTemplates(payload.templates || {}); setFormats(payload.formats || {}); setContracts(payload.contracts || {});
  }
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    request(`${getApiBaseUrl()}/api/admin/contracts`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Unable to load contracts.'); if (!controller.signal.aborted) { load(payload, 'project'); setType('project'); setNotice(null); } })
      .catch((error) => { if (!controller.signal.aborted) setNotice({ error: true, text: error.message }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, retry, request]);
  useEffect(() => {
    if (!pdfPreview) return undefined;
    const dialog = previewDialog.current; const focus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); URL.revokeObjectURL(pdfPreview.url); if (focus?.isConnected) focus.focus(); };
  }, [pdfPreview]);
  async function update(body) {
    const response = await request(`${getApiBaseUrl()}/api/admin/contracts/${type}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Unable to save contract.');
    load(payload, type); setNotice({ text: payload.message });
  }
  async function downloadDefault() {
    setPreviewing(true); setNotice(null);
    try {
      const response = await request(`${getApiBaseUrl()}/api/admin/contracts/${type}/default-pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.message || 'Unable to download default contract.'); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = `Default-Contract-${type}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { setNotice({ error: true, text: error.message }); } finally { setPreviewing(false); }
  }
  async function chooseSource(source) {
    setSaving(true); setNotice(null);
    try { await update({ source }); } catch (error) { setNotice({ error: true, text: error.message }); } finally { setSaving(false); }
  }
  async function uploadPdf(event) {
    const input = event.currentTarget; const file = input.files?.[0]; if (!file) return;
    if (!/\.pdf$/i.test(file.name) || file.size > 2 * 1024 * 1024) { setNotice({ error: true, text: 'Choose a PDF contract of 2 MB or less.' }); input.value = ''; return; }
    setSaving(true); setNotice(null);
    try {
      const data = new FormData(); data.append('file', file);
      const response = await request(`${getApiBaseUrl()}/api/admin/contracts/${type}/pdf`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Unable to upload PDF.');
      load(payload, type); setNotice({ text: payload.message });
    } catch (error) { setNotice({ error: true, text: error.message }); } finally { setSaving(false); input.value = ''; }
  }
  async function previewPdf() {
    setPreviewing(true); setNotice(null);
    try {
      const response = await request(`${getApiBaseUrl()}/api/admin/contracts/files/${current.pdf.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.message || 'Unable to open PDF.'); }
      setPdfPreview({ url: URL.createObjectURL(await response.blob()), name: current.pdf.fileName });
    } catch (error) { setNotice({ error: true, text: error.message }); } finally { setPreviewing(false); }
  }
  async function preview() {
    setPreviewing(true); setNotice(null);
    try { await openContractPreview({ ...newQuotation(), quoteType: type, title: contractTypes[type], items: [], contractText: templates[type], contractStyle: formats[type] }, 'TEMPLATE PREVIEW', { templatePreview: true, subtitle: 'Saved default contract.' }); }
    catch (error) { setNotice({ error: true, text: error.message }); } finally { setPreviewing(false); }
  }
  return <div className="max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sales workspace</p><h1 className="mt-3 text-4xl font-bold">Contracts</h1>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Upload a finished PDF or use your saved default contract. Choose which agreement new quotations use for each payment type.</p>
    {sessionExpired && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert"><h2 className="font-bold text-amber-950">Please sign in again</h2><p className="mt-2 text-sm leading-6 text-amber-900">Your admin session has expired. Your saved contracts are still available after you sign in.</p><a className={`${primary} mt-4 inline-block`} href="/admin/login?returnTo=%2Fadmin%2Fcontracts">Sign In Again</a></div>}
    {loading ? <p className="mt-8" role="status">Loading contracts…</p> : !loaded ? null : <div className="mt-8 grid items-start gap-6 lg:grid-cols-[14rem_1fr]">
      <nav className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3" aria-label="Contract types">{Object.entries(contractTypes).map(([key, label]) => <button key={key} type="button" disabled={saving} aria-current={type === key ? 'page' : undefined} className={`rounded-lg p-3 text-left text-sm font-bold ${type === key ? 'admin-brand-surface' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => {
        setType(key); setNotice(null);
      }}>{label}<span className="mt-1 block text-xs font-normal opacity-80">{contracts[key]?.source === 'pdf' ? 'Using uploaded PDF' : templates[key] ? 'Using default contract' : 'Add a contract'}</span></button>)}</nav>
      <div className="grid min-w-0 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{contractTypes[type]} contract</h2><p className="mt-2 text-sm text-slate-500">Selected for new quotations: <strong className="text-[#514568]">{current.source === 'pdf' ? 'Uploaded PDF' : 'Default Contract'}</strong></p></div>{templates[type] && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Default kept</span>}</div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <section aria-label="Default contract option" className={`flex min-w-0 flex-col rounded-xl border p-5 ${current.source === 'default' ? 'border-[#a997bd] bg-[#faf8fd]' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eee9f4] text-[#514568]" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/></svg></span><h3 className="font-bold">Default Contract</h3></div>
              <p className="mt-4 text-sm leading-6 text-slate-600">Download your saved default as a PDF, edit it in your preferred PDF editor, then upload the revised contract.</p>
              <p className="mb-5 mt-3 text-xs font-bold text-[#655775]">{templates[type] ? 'Saved default available' : 'No saved default contract'}</p>
              <div className="mt-auto flex flex-wrap gap-2"><button type="button" className={primary} disabled={saving || current.source === 'default' || !templates[type]} onClick={() => chooseSource('default')}>{current.source === 'default' ? 'Selected' : 'Use Default Contract'}</button><button className={secondary} type="button" disabled={saving || previewing || !templates[type]?.trim()} onClick={downloadDefault}>Download Default PDF</button><button className={secondary} type="button" disabled={saving || previewing || !templates[type]?.trim()} onClick={preview}>{previewing ? 'Opening…' : 'Preview Contract'}</button></div>
            </section>
            <section aria-label="Uploaded PDF option" className={`flex min-w-0 flex-col rounded-xl border p-5 ${current.source === 'pdf' ? 'border-[#a997bd] bg-[#faf8fd]' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eee9f4] text-[#514568]" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5"/></svg></span><h3 className="font-bold">Uploaded PDF</h3></div>
              {current.pdf ? <div className="mb-5 mt-4 rounded-lg border border-slate-200 bg-white p-3"><p className="break-words text-sm font-bold">{current.pdf.fileName}</p><p className="mt-1 text-xs text-slate-500">{current.pdf.pageCount} {current.pdf.pageCount === 1 ? 'page' : 'pages'} · {(current.pdf.byteLength / 1024).toFixed(0)} KB</p></div> : <p className="my-4 text-sm leading-6 text-slate-600">Upload your prepared contract and keep its original page layout.</p>}
              <label className={`mb-4 flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-[#b7a8c9] bg-white p-4 text-center ${saving ? 'opacity-50' : 'hover:bg-slate-50'}`}><span className="text-sm font-bold text-[#514568]">{saving ? 'Please wait…' : current.pdf ? 'Replace PDF' : 'Choose a PDF contract'}</span><span className="text-xs text-slate-500">PDF only · Up to 2 MB · 100 pages</span><input className="sr-only" aria-label="Upload PDF contract" type="file" accept=".pdf,application/pdf" disabled={saving} onChange={uploadPdf} /></label>
              <p className="mb-4 text-xs leading-5 text-slate-500">Client details and e-signature are recorded on an added signing page.</p><div className="mt-auto flex flex-wrap gap-2">{current.pdf && <><button type="button" className={primary} disabled={saving || current.source === 'pdf'} onClick={() => chooseSource('pdf')}>{current.source === 'pdf' ? 'Selected' : 'Use Uploaded PDF'}</button><button type="button" className={secondary} disabled={saving || previewing} onClick={previewPdf}>Preview PDF</button></>}</div>
            </section>
          </div>
          <p className="mt-5 text-xs leading-6 text-slate-500">Existing quotations keep their assigned contract version. Replacing a PDF or switching the selected contract applies to new quotations.</p>
        </div>

      </div>
    </div>}
    {notice && !sessionExpired && <p className={`mt-5 rounded-lg p-4 text-sm ${notice.error ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`} role={notice.error ? 'alert' : 'status'}>{notice.text}{notice.error && !Object.keys(templates).length && <button type="button" className="ml-3 underline" onClick={() => setRetry((value) => value + 1)}>Retry</button>}</p>}
    {pdfPreview && <dialog ref={previewDialog} aria-label="PDF contract preview" className="fixed inset-0 m-auto w-[94vw] max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl backdrop:bg-slate-950/60" onCancel={(event) => { event.preventDefault(); setPdfPreview(null); }}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="truncate font-bold">{pdfPreview.name}</h2><button type="button" className={secondary} onClick={() => setPdfPreview(null)}>Close Preview</button></div><a className="mb-3 inline-block text-sm font-bold text-[#514568] underline" href={pdfPreview.url} target="_blank" rel="noreferrer">Open PDF in a new tab</a><iframe title="Uploaded PDF contract preview" src={pdfPreview.url} className="h-[75dvh] w-full rounded border border-slate-200" /></dialog>}
  </div>;
}
