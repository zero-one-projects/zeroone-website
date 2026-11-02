import MonthlySubscriptionSummary from './MonthlySubscriptionSummary';
import { configureMonthlySubscription } from '../utils/quotation';
import { copyText } from '../utils/copyText';
import PdfContractView from './PdfContractView';
import ContractRichText from './ContractRichText';
import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { newQuotation, quotationTotals, defaultBillingCommencement } from '../utils/quotation';
import QuotationDocument from './QuotationDocument';
import QuotationLinkDialog from './QuotationLinkDialog';
import QuotationListPanel from './QuotationListPanel';
import QuotationHistory from './QuotationHistory';
import SignedAgreement from './SignedAgreement';
import { printContract } from '../utils/printContract';
import '../quotations.css';

const fieldClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-950 outline-none focus:border-[#817391] focus:bg-white';
const secondaryClass = 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40';
const primaryClass = 'admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-50';

export default function QuotationsPanel({ token, initialTab = 'create' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const quotationId = new URLSearchParams(window.location.search).get('id');
  const [opening, setOpening] = useState(Boolean(quotationId));
  const [document, setDocument] = useState(newQuotation);
  const [selected, setSelected] = useState(null);
  const [savedLink, setSavedLink] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [rows, setRows] = useState([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [listError, setListError] = useState('');
  const [defaultContractText, setDefaultContractText] = useState('');
  const [defaultContractTexts, setDefaultContractTexts] = useState({});
  const [defaultContractFormats, setDefaultContractFormats] = useState({});
  const [defaultContracts, setDefaultContracts] = useState({});
  const [defaultPaymentInstructions, setDefaultPaymentInstructions] = useState('');
  const [pdfPreview, setPdfPreview] = useState(false);
  const pdfDialog = useRef(null);
  const totals = quotationTotals(document);
  const money = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: document.currency }).format(value);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError('');
    fetch(`${getApiBaseUrl()}/api/admin/quotations?page=1`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to load quotations.');
      if (!controller.signal.aborted) {
        setRows(payload.quotations.slice(0, 10));
        setDefaultContractText(payload.defaultContractText || '');
        setDefaultContractTexts(payload.defaultContractTexts || {});
        setDefaultContractFormats(payload.defaultContractFormats || {});
        setDefaultContracts(payload.defaultContracts || {});
        setDefaultPaymentInstructions(payload.defaultPaymentInstructions || '');
      }
    }).catch((error) => {
      if (!controller.signal.aborted) setListError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, revision]);

  useEffect(() => {
    if (loading || selected || quotationId || document.contractText !== undefined) return;
    const terms = defaultContractTexts[document.quoteType || 'project'] || ((!document.quoteType || document.quoteType === 'project') ? defaultContractText : '');
    setDocument((current) => current.contractText === undefined ? { ...current, contractText: terms, contractSource: defaultContracts[current.quoteType || 'project']?.source || 'default', contractPdf: defaultContracts[current.quoteType || 'project']?.source === 'pdf' ? defaultContracts[current.quoteType || 'project'].pdf : undefined } : current);
  }, [loading, selected, quotationId, document.contractText, document.quoteType, defaultContractTexts, defaultContractText, defaultContracts]);

  useEffect(() => {
    if (loading || selected || quotationId) return;
    setDocument((current) => current.paymentInstructions === undefined ? { ...current, paymentInstructions: defaultPaymentInstructions } : current);
  }, [loading, selected, quotationId, defaultPaymentInstructions, document.paymentInstructions]);

  useEffect(() => {
    if (!quotationId) return undefined;
    const controller = new AbortController();
    setOpening(true);
    fetch(`${getApiBaseUrl()}/api/admin/quotations/${encodeURIComponent(quotationId)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to open quotation.');
      if (!controller.signal.aborted) {
        setSelected(payload.quotation); setDocument(payload.quotation.document); setDirty(false);
      }
    }).catch((error) => { if (!controller.signal.aborted) setNotice({ error: true, message: error.message }); })
      .finally(() => { if (!controller.signal.aborted) setOpening(false); });
    return () => controller.abort();
  }, [quotationId, token]);

  useEffect(() => {
    if (!pdfPreview) return undefined;
    const dialog = pdfDialog.current; const focus = window.document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (focus?.isConnected) focus.focus(); };
  }, [pdfPreview]);

  function changeContractSource(source) {
    setDocument((current) => ({ ...current, contractSource: source, contractPdf: source === 'pdf' ? current.contractPdf || defaultContracts[current.quoteType || 'project']?.pdf : undefined,
      contractStyle: undefined, contractText: source === 'pdf' ? '' : defaultContractTexts[current.quoteType || 'project'] || defaultContractText }));
    setDirty(true); setNotice(null);
  }

  function update(field, value) {
    setDocument((current) => ({ ...current, [field]: value, ...(field === 'contractText' ? { contractStyle: undefined } : {}),
      ...(field === 'items' && value.some((item) => item.chargeType === 'recurring') && !current.contractDetails?.billingCommencement ? { contractDetails: { ...current.contractDetails, billingCommencement: defaultBillingCommencement } } : {})
    }));
    setDirty(true);
    setNotice(null);
  }

  function updateItem(index, field, value) {
    update('items', document.items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function updateMonthlySubscription(changes) {
    try { setDocument(configureMonthlySubscription(document, changes)); setDirty(true); setNotice(null); }
    catch (error) { setNotice({ error: true, message: error.message }); }
  }
  function toggleMonthlySubscription(enabled) {
    if (enabled) { updateMonthlySubscription({}); return; }
    setDocument(current => ({ ...current, monthlySubscription: undefined, items: current.items.map(({ subscriptionRole, ...item }) => item) }));
    setDirty(true); setNotice(null);
  }
  function changeQuoteType(value) {
    const currentTemplate = defaultContractTexts[document.quoteType || 'project'] || ((!document.quoteType || document.quoteType === 'project') ? defaultContractText : '');
    if (document.contractText?.trim() && document.contractText !== currentTemplate && !window.confirm('Load the saved contract for this quotation type and replace the terms currently in this form?')) return;
    if (value === 'project' && document.items.some((item) => item.chargeType === 'recurring') && !window.confirm('Changing to a one-time project will make subscription items one-time charges. Continue?')) return;
    const blank = document.items.length === 1 && !document.items[0].description && !Number(document.items[0].unitPrice) && !document.items[0].scope?.length;
    let items = document.items.map((item) => ({ ...item, chargeType: value === 'project' && item.chargeType === 'recurring' ? 'one_time' : blank && value === 'pos' ? 'setup' : item.chargeType || 'one_time' }));
    if (value === 'subscription') {
      if (blank) items = [];
      if (!items.some((item) => item.chargeType === 'setup')) items.unshift({ description: 'One-time setup fee', chargeType: 'setup', quantity: 1, unitPrice: 0 });
      if (!items.some((item) => item.chargeType === 'recurring')) items.push({ description: 'Subscription plan', chargeType: 'recurring', quantity: 1, unitPrice: 0 });
      if (items.length > 100) { setNotice({ error: true, message: 'Remove an item to make room for the setup fee and subscription plan before changing types.' }); return; }
    }
    setDocument((current) => ({ ...current, quoteType: value, ...(value === 'project' ? { monthlySubscription: undefined } : {}), contractSource: defaultContracts[value]?.source || 'default', contractPdf: defaultContracts[value]?.source === 'pdf' ? defaultContracts[value].pdf : undefined, initialPaymentPercent: value === 'project' ? 20 : '', contractStyle: undefined, contractText: defaultContractTexts[value] || (value === 'project' ? defaultContractText : ''), items,
      ...(items.some((item) => item.chargeType === 'recurring') && !current.contractDetails?.billingCommencement ? { contractDetails: { ...current.contractDetails, billingCommencement: defaultBillingCommencement } } : {})
    }));
    setDirty(true); setNotice(null);
  }

  function openQuotation(row) {
    if (dirty && !window.confirm('Discard your unsaved quotation changes?')) return false;
    if (!row && quotationId) window.history.replaceState({}, '', '/admin/quotations');
    setSelected(row);
    setDocument(row ? row.document : newQuotation());
    setDirty(false);
    setNotice(null);
    return true;
  }

  async function printQuotation() {
    try {
      await Promise.all(Array.from(window.document.querySelectorAll('.quotation-paper img')).map((image) => image.decode()));
      await window.document.fonts.ready;
      window.print();
    } catch {
      setNotice({ error: true, message: 'The quotation logo could not load. Please refresh the page before printing.' });
    }
  }

  async function changeSharing(revoke = false) {
    if (!selected) return;
    setSharing(true);
    setNotice(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/quotations/${selected.id}/share`, {
        method: revoke ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to update client link.');
      setSelected(payload.quotation);
      setRevision((value) => value + 1);
      setNotice({ error: false, message: revoke ? 'Client link revoked.' : 'Client link is ready to copy.' });
    } catch (error) { setNotice({ error: true, message: error.message }); }
    finally { setSharing(false); }
  }

  async function copyShareLink() {
    try {
      await copyText(`${window.location.origin}${selected.sharePath}`);
      setNotice({ error: false, message: 'Client link copied.' });
    } catch { setNotice({ error: true, message: 'Copy the link from the field below.' }); }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/quotations${selected ? `/${selected.id}` : ''}`, {
        method: selected ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ document })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to save quotation.');
      if (!selected) {
        window.history.replaceState({}, '', '/admin/quotations');
        setSelected(null);
        setDocument(newQuotation());
        setSavedLink(payload.quotation);
      } else {
        setSelected(payload.quotation);
        setDocument(payload.quotation.document);
      }
      setDirty(false);
      setNotice({ error: false, message: `${payload.quotation.reference} saved successfully.` });
      setRevision((value) => value + 1);
    } catch (error) {
      setNotice({ error: true, message: error.message });
    } finally { setSaving(false); }
  }

  return (
    <div className="quotation-workspace max-w-[90rem]">
      <header className="quotation-controls mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Sales workspace</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Quotations</h1>
          <p className="mt-3 text-sm text-slate-600">Create client quotations, save them, and print or save a PDF.</p>
        </div>
        <button className={secondaryClass} type="button" disabled={saving || sharing || opening} onClick={() => { if (openQuotation(null)) setActiveTab('create'); }}><span aria-hidden="true">+ </span>New Quotation</button>
      </header>

      <div className="quotation-controls mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist" aria-label="Quotation workspace" onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
        const next = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons[buttons.length - 1] : buttons[(buttons.indexOf(event.target) + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
        next.click(); next.focus();
      }}>
        {['create', 'list'].map((tab) => <button key={tab} id={`quotation-tab-${tab}`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`quotation-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => setActiveTab(tab)} className={`rounded-lg px-5 py-3 text-sm font-bold transition ${activeTab === tab ? 'admin-brand-surface shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-[#514568]'}`}>{tab === 'create' ? 'Create Quotation' : 'Quotation List'}</button>)}
      </div>
      {activeTab === 'create' ? <div role="tabpanel" id="quotation-panel-create" aria-labelledby="quotation-tab-create">
      {opening && <p className="quotation-controls mb-4 text-sm text-slate-500" role="status">Opening quotation...</p>}
      <div className="quotation-controls grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <form className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={save}>
          <fieldset disabled={saving || sharing || opening} className="grid min-w-0 gap-5 disabled:opacity-60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{selected ? selected.reference : 'New quotation'}</h2>
              <span className="rounded-full bg-[#f4f1f7] px-3 py-1 text-xs font-bold text-[#514568]">{dirty ? 'Unsaved changes' : selected ? 'Saved' : 'Draft'}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">Quotation type<select className={fieldClass} disabled={loading} value={document.quoteType || 'project'} onChange={(event) => changeQuoteType(event.target.value)}><option value="project">One-time payment</option><option value="subscription">Custom subscription</option><option value="pos">POS setup &amp; add-ons</option></select></label>
              {document.quoteType && document.quoteType !== 'project' && <label className="grid gap-2 text-sm font-bold text-slate-700">Subscription billing<select className={fieldClass} disabled={Boolean(document.monthlySubscription)} value={document.billingPeriod || 'monthly'} onChange={(event) => update('billingPeriod', event.target.value)}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>}
            </div>
            {document.quoteType === 'subscription' && <p className="text-sm text-slate-600">This subscription includes a one-time setup fee plus recurring plan charges. Subscription billing starts after the official system go-live date. Enter the setup price once and the subscription price per billing period.</p>}
            {document.quoteType && document.quoteType !== 'project' && (document.billingPeriod || 'monthly') === 'monthly' && <section className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4" aria-label="Monthly subscription configuration">
              <label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" className="mt-1" checked={Boolean(document.monthlySubscription)} onChange={event => toggleMonthlySubscription(event.target.checked)} />Show monthly subscription after Go-Live</label>
              {document.monthlySubscription && <>
                <p className="text-sm text-slate-600">Enter the existing subscription and the additional recurring charge. These fields set the two recurring line items below. Monthly billing begins after official Go-Live.</p>
                <div className="grid gap-4 sm:grid-cols-2">{[['currentAmount', 'Current monthly subscription'], ['additionalAmount', 'Additional monthly charge']].map(([key, label]) => <label className="grid gap-2 text-sm font-bold text-slate-700" key={key}>{label}{Number(document.taxRate) > 0 ? ' (before tax)' : ''}<input className={fieldClass} type="number" min="0" max="100000000" step="0.01" required value={document.monthlySubscription[key]} onChange={event => updateMonthlySubscription({ [key]: event.target.value })} /></label>)}</div>
                <label className="grid gap-2 text-sm font-bold text-slate-700">System name<input className={fieldClass} required maxLength={180} value={document.monthlySubscription.systemName} onChange={event => updateMonthlySubscription({ systemName: event.target.value })} /></label>
                <MonthlySubscriptionSummary document={document} className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700" />
              </>}
            </section>}
            <label className="grid gap-2 text-sm font-bold text-slate-700">Project / quotation title
              <input className={fieldClass} value={document.title} required maxLength={180} onChange={(e) => update('title', e.target.value)} placeholder="Website design and development" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">Client / company name
                <input className={fieldClass} required maxLength={180} value={document.clientName} onChange={(e) => update('clientName', e.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Client email
                <input className={fieldClass} type="email" maxLength={180} value={document.clientEmail} onChange={(e) => update('clientEmail', e.target.value)} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Client address
              <textarea className={fieldClass} rows={2} maxLength={1000} value={document.clientAddress} onChange={(e) => update('clientAddress', e.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-slate-700">Issue date
                <input className={fieldClass} type="date" required value={document.issuedOn} onChange={(e) => update('issuedOn', e.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Valid until
                <input className={fieldClass} type="date" required min={document.issuedOn} value={document.validUntil} onChange={(e) => update('validUntil', e.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Currency
                <select className={fieldClass} value={document.currency} onChange={(e) => update('currency', e.target.value)}><option value="PHP">PHP — Philippine Peso</option><option value="USD">USD — US Dollar</option></select>
              </label>
            </div>
            <div className="grid gap-3">
              <h3 className="text-lg font-bold">Line items</h3>
              {document.items.map((item, index) => (
                <div className="grid min-w-0 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4" key={index}>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">Item {index + 1} charge type<select className={fieldClass} disabled={Boolean(document.monthlySubscription && item.subscriptionRole)} value={item.chargeType || 'one_time'} onChange={(event) => updateItem(index, 'chargeType', event.target.value)}><option value="one_time">One-time charge</option><option value="milestone">Milestone payment</option><option value="setup">Setup fee</option><option value="addon">Additional feature — one-time</option>{document.quoteType && document.quoteType !== 'project' && <option value="recurring" disabled={Boolean(document.monthlySubscription)}>Subscription — {document.billingPeriod || 'monthly'}</option>}</select></label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">Item {index + 1} description
                    <textarea className={fieldClass} required maxLength={2000} rows={2} value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                  </label>
                  <div className="grid gap-3">
                    {(item.scope || []).map((group, groupIndex) => (
                      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3" key={groupIndex}>
                        <label className="grid gap-2 text-sm font-bold text-slate-700">Item {index + 1} scope {groupIndex + 1} heading
                          <input className={fieldClass} maxLength={300} required value={group.title} onChange={(e) => updateItem(index, 'scope', item.scope.map((entry, i) => i === groupIndex ? { ...entry, title: e.target.value } : entry))} placeholder="Customer Website Pages" />
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-slate-700">Item {index + 1} scope {groupIndex + 1} details
                          <textarea className={fieldClass} maxLength={5000} rows={3} value={group.details} onChange={(e) => updateItem(index, 'scope', item.scope.map((entry, i) => i === groupIndex ? { ...entry, details: e.target.value } : entry))} placeholder="Home page, About us, Contact us, Shop, Shopping Cart..." />
                        </label>
                        <button className="justify-self-start text-xs font-bold text-rose-700" type="button" onClick={() => updateItem(index, 'scope', item.scope.filter((_, i) => i !== groupIndex))}>Remove scope {groupIndex + 1}</button>
                      </div>
                    ))}
                    <button className={`${secondaryClass} justify-self-start`} type="button" disabled={(item.scope || []).length >= 30} onClick={() => updateItem(index, 'scope', [...(item.scope || []), { title: '', details: '' }])}>+ Add Scope Section</button>
                  </div>
                  <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <label className="grid gap-2 text-sm font-bold text-slate-700">Quantity
                      <input className={fieldClass} type="number" min="0.001" max="100000" step="0.001" required readOnly={Boolean(document.monthlySubscription && item.subscriptionRole)} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-slate-700">Unit price
                      <input className={fieldClass} type="number" min="0" max="100000000" step="0.01" required readOnly={Boolean(document.monthlySubscription && item.subscriptionRole)} value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
                    </label>
                    <p className="py-3 text-sm font-bold text-slate-800">{money(totals.amounts[index])}{item.chargeType === 'recurring' ? document.billingPeriod === 'yearly' ? ' / year' : ' / month' : ''}</p>
                    <button className="py-3 text-sm font-bold text-rose-700 disabled:opacity-40" type="button" disabled={document.items.length === 1 || Boolean(document.monthlySubscription && item.subscriptionRole)} onClick={() => update('items', document.items.filter((_, i) => i !== index))} aria-label={`Remove item ${index + 1}`}>Remove</button>
                  </div>
                </div>
              ))}
              <button className={`${secondaryClass} justify-self-start`} type="button" disabled={document.items.length >= 100} onClick={() => update('items', [...document.items, { description: '', quantity: 1, unitPrice: 0 }])}>+ Add Item</button>
              {document.quoteType && document.quoteType !== 'project' && <div className="flex flex-wrap gap-2">{[['setup', '+ Add Setup Fee'], ['addon', '+ Add Feature'], ['recurring', '+ Add Subscription']].map(([chargeType, label]) => <button key={chargeType} className={secondaryClass} type="button" disabled={document.items.length >= 100} onClick={() => update('items', [...document.items, { description: '', quantity: 1, unitPrice: 0, chargeType }])}>{label}</button>)}</div>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">{totals.hasRecurring ? 'One-time discount' : 'Discount'} ({document.currency})
                <input className={fieldClass} type="number" min="0" max={totals.subtotal} step="0.01" required value={document.discount} onChange={(e) => update('discount', e.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Tax rate (%)
                <input className={fieldClass} type="number" min="0" max="100" step="0.01" required value={document.taxRate} onChange={(e) => update('taxRate', e.target.value)} />
              </label>
            </div>
            <p className="text-xs text-slate-500">Tax is calculated after the discount. The default tax rate is 0%.{totals.hasRecurring ? ' Discounts apply to one-time charges only. Subscription totals are shown separately for each billing period.' : ''}</p>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Project timeline
              <input className={fieldClass} maxLength={180} value={document.timeline || ''} onChange={(e) => update('timeline', e.target.value)} placeholder="10–12 weeks" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Notes / payment terms
              <textarea className={fieldClass} rows={4} maxLength={10000} value={document.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Scope, delivery schedule, payment terms, and exclusions" />
            </label>
            <section className="grid gap-3 rounded-lg border border-slate-200 p-4" aria-label="Payment configuration">
              <h3 className="text-lg font-bold">Payment after signing</h3>
              <p className="text-sm text-slate-600">Set these details before sharing. Clients see this payment step after signing the contract.</p>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Initial payment (%)<input className={fieldClass} type="number" min="0" max="100" step="0.01" value={document.initialPaymentPercent ?? ''} onChange={(event) => update('initialPaymentPercent', event.target.value)} placeholder="Follow the signed payment terms" /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Bank / payment instructions<textarea className={fieldClass} rows={4} maxLength={5000} value={document.paymentInstructions || ''} onChange={(event) => update('paymentInstructions', event.target.value)} placeholder="Bank or wallet name, account name, account number, and how to submit proof of payment" /></label>
              <p className="text-xs text-slate-500">Leave instructions blank to direct the client to billing@zerooneitinc.com. The initial amount uses one-time charges only. Match the percentage to the contract’s payment terms.</p>
            </section>
            <section className="grid gap-3 rounded-lg border border-slate-200 p-4" aria-label="Contract configuration">
              <h3 className="text-lg font-bold">Client agreement &amp; e-signature</h3>
              <p className="text-sm text-slate-600">Choosing a quotation type automatically loads its saved contract from Contracts. You can adjust the terms for this client. Saving keeps this version with the quotation.</p>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Contract source<select className={fieldClass} value={document.contractSource || 'default'} onChange={(event) => changeContractSource(event.target.value)}><option value="default">Default Contract</option><option value="pdf" disabled={!document.contractPdf && !defaultContracts[document.quoteType || 'project']?.pdf}>Uploaded PDF</option></select></label>
              {document.contractSource === 'pdf' && document.contractPdf ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="break-words font-bold">{document.contractPdf.fileName}</p><p className="mt-1 text-sm text-slate-500">{document.contractPdf.pageCount} pages · This PDF version will be kept with the quotation.</p><button type="button" className={`${secondaryClass} mt-3`} onClick={() => setPdfPreview(true)}>Preview PDF Contract</button><a className="ml-3 text-sm font-bold text-[#514568] underline" href="/admin/contracts" target="_blank" rel="noreferrer">Manage contracts</a></div> : <>
              {document.contractText && document.contractText === defaultContractTexts[document.quoteType || 'project'] && <p className="text-sm font-bold text-emerald-800">Saved {document.quoteType === 'subscription' ? 'subscription' : document.quoteType === 'pos' ? 'POS' : 'one-time payment'} contract loaded.</p>}
              <label className="grid gap-2 text-sm font-bold text-slate-700">Contract terms (optional override)
                <textarea className={fieldClass} rows={6} maxLength={30000} required={Boolean(document.quoteType && document.quoteType !== 'project' && !defaultContractTexts[document.quoteType])} value={document.contractText || ''} onChange={(e) => update('contractText', e.target.value)} placeholder="Leave blank to use the matching template, or enter this client's agreement" />
              </label>
              <a className="text-sm font-bold text-[#514568] underline" href="/admin/contracts" target="_blank" rel="noreferrer">Manage contract templates</a>
              <button className={`${secondaryClass} justify-self-start`} type="button" onClick={() => setRevision((value) => value + 1)}>Refresh contract templates</button>
              {defaultContractTexts[document.quoteType || 'project'] && <button className={`${secondaryClass} justify-self-start`} type="button" onClick={() => update('contractText', defaultContractTexts[document.quoteType || 'project'])}>Use current contract template</button>}
              <details className="text-sm"><summary className="cursor-pointer font-bold text-[#514568]">Preview agreement terms</summary><div className="mt-3 max-h-80 overflow-y-auto leading-6"><ContractRichText format={document.contractStyle || (document.contractText === defaultContractTexts[document.quoteType || 'project'] ? defaultContractFormats[document.quoteType || 'project'] : undefined)} text={document.contractText?.trim() || selected?.contractText || defaultContractTexts[document.quoteType || 'project'] || ((!document.quoteType || document.quoteType === 'project') ? defaultContractText : 'Create terms in Contracts or enter them above before saving.')} /></div></details></>}

              <details className="text-sm"><summary className="cursor-pointer font-bold text-[#514568]">Contract &amp; payment agreement details</summary><p className="mt-3 text-xs text-slate-500">Complete the agreed details for this client. Blank fields stay blank in the PDF; example prices and payment conditions are not filled automatically.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{[
                ['agreementDate', 'Agreement date'], ['authorizedRepresentative', 'Client authorized representative'], ['clientPosition', 'Client representative position'], ['providerRepresentative', 'Zero One authorized representative'], ['providerPosition', 'Zero One representative position'], ['branches', 'Branches / terminals'], ['effectiveDate', 'Subscription effective date'], ['minimumPeriod', 'Minimum subscription period'], ['billingCommencement', 'Subscription payment commencement'], ['initialBillingTerms', 'Initial billing arrangements'], ['paymentTerms', 'Payment due date / terms'], ['gracePeriod', 'Payment grace period'], ['terminationTerms', 'Early termination fee / formula']
              ].map(([key, label]) => <label key={key} className="grid gap-2 font-bold text-slate-700">{label}<textarea className={fieldClass} rows={key === 'paymentTerms' || key === 'terminationTerms' ? 3 : 2} readOnly={key === 'billingCommencement' && Boolean(document.monthlySubscription)} maxLength={key === 'paymentTerms' || key === 'terminationTerms' ? 2000 : 500} value={document.contractDetails?.[key] || ''} onChange={(event) => update('contractDetails', { ...document.contractDetails, [key]: event.target.value })} /></label>)}</div></details>
            </section>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-3"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              <div className="mt-2 flex justify-between gap-3"><span>Discount</span><span>−{money(Number(document.discount) || 0)}</span></div>
              <div className="mt-2 flex justify-between gap-3"><span>Tax ({document.taxRate || 0}%)</span><span>{money(totals.tax)}</span></div>
              <div className="mt-4 flex justify-between gap-3 border-t border-slate-200 pt-4 text-lg font-bold"><span>{totals.hasRecurring ? 'One-time charges' : 'Total'}</span><output aria-label="Quotation total">{money(totals.total)}</output></div>
              {totals.hasRecurring && <><div className="mt-3 flex justify-between gap-3 text-lg font-bold"><span>Subscription</span><output aria-label="Recurring total">{money(totals.recurringTotal)} / {document.billingPeriod === 'yearly' ? 'year' : 'month'}</output></div><p className="mt-2 text-xs text-slate-500">One-time charges and recurring subscription are separate. Recurring subtotal: {money(totals.recurringSubtotal)}; tax: {money(totals.recurringTax)}.</p>{document.contractDetails?.billingCommencement && <p className="mt-2 text-sm font-bold text-[#514568]">Subscription billing starts: {document.contractDetails.billingCommencement}</p>}</>}
            </div>
            <div className="flex flex-wrap gap-3">
              <button className={primaryClass} type="submit">{saving ? 'Saving...' : selected ? 'Save Changes' : 'Save Quotation'}</button>
              <button className={secondaryClass} type="button" disabled={!selected || dirty} onClick={printQuotation}>Print / Save PDF</button>
              <button className={secondaryClass} type="button" disabled={!selected || dirty} onClick={async () => { try { await printContract({ ...selected.document, contractText: selected.contractText }, selected.reference, selected.clientResponse?.current ? selected.clientResponse.signature : null, { adminToken: token, quotationId: selected.id }); } catch (error) { setNotice({ error: true, message: error.message }); } }}>Contract / Save PDF</button>
            </div>
            {(!selected || dirty) && <p className="text-xs text-slate-500">Save the quotation before printing to include its reference number.</p>}
            {selected?.clientResponse && <section className="rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Client response">
              <h3 className="text-lg font-bold">{selected.clientResponse.action === 'accept' ? 'Accepted by client' : 'Requote requested'}</h3>
              {!selected.clientResponse.current && <p className="mt-2 text-sm font-bold text-amber-800">This response applies to an earlier version. The updated quotation needs a new response.</p>}
              <p className="mt-2 text-sm text-slate-700">{selected.clientResponse.name} · {selected.clientResponse.email}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(selected.clientResponse.respondedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>
              {selected.clientResponse.note && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{selected.clientResponse.note}</p>}
              {selected.clientResponse.action === 'accept' && <p className="mt-3 text-sm font-bold">{selected.clientResponse.signedAt ? 'Contract signed' : 'Contract pending signature'}</p>}
              <SignedAgreement signature={selected.clientResponse.signature} document={selected.clientResponse.current ? selected.document : undefined} reference={selected.reference} token={token} quotationId={selected.id} />
            </section>}
            {selected && <QuotationHistory token={token} quotationId={selected.id} updatedAt={selected.updatedAt} reference={selected.reference} />}
            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Client sharing">
              <h3 className="text-lg font-bold">Client link</h3>
              <p className="text-sm text-slate-600">Clients can view and print without signing in. Access ends after {document.validUntil || 'the validity date'} at 11:59 PM Manila time. Save validity changes to update the link expiry.</p>
              {selected?.sharePath ? <>
                <label className="grid gap-2 text-sm font-bold text-slate-700">Shareable quotation link
                  <input className={fieldClass} readOnly value={`${window.location.origin}${selected.sharePath}`} onFocus={(event) => event.target.select()} />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button className={secondaryClass} type="button" onClick={copyShareLink} disabled={dirty}>Copy Link</button>
                  <a className={secondaryClass} href={selected.sharePath} target="_blank" rel="noreferrer">View Client Page</a>
                  <button className="text-sm font-bold text-rose-700" type="button" onClick={() => changeSharing(true)}>Revoke Link</button>
                </div>
                {selected.expiresAt && Date.now() >= Date.parse(selected.expiresAt) && <p className="text-sm text-amber-800">This link has expired. Change and save the validity date to extend access.</p>}
              </> : <button className={`${secondaryClass} justify-self-start`} type="button" disabled={!selected || dirty} onClick={() => changeSharing()}>{sharing ? 'Generating...' : 'Generate Client Link'}</button>}
              {(!selected || dirty) && <p className="text-xs text-slate-500">Save the quotation before creating or copying its client link.</p>}
              {window.location.hostname === 'localhost' && <p className="text-xs text-slate-500">Local preview: clients outside this computer can use links once the website and API are hosted online.</p>}
            </section>
          </fieldset>
          {notice && <p className={`mt-4 rounded-lg p-3 text-sm ${notice.error ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`} role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
        </form>

        <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Saved quotations">
          <h2 className="text-lg font-bold">Saved quotations</h2>
          <p className="mt-1 text-xs text-slate-500">Your 10 most recent quotations.</p>
          {loading ? <p className="mt-4 text-sm text-slate-500" role="status">Loading quotations...</p> : listError ? <div className="mt-4 text-sm text-rose-700" role="alert">{listError}<button className="mt-2 block underline" type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></div> : !rows.length ? <p className="mt-4 text-sm text-slate-500">No quotations yet. Create your first quotation using the form.</p> : <div className="mt-4 grid gap-3">{rows.map((row) => (
            <button type="button" key={row.id} disabled={saving || sharing || opening} onClick={() => openQuotation(row)} className={`min-w-0 rounded-lg border p-3 text-left ${selected?.id === row.id ? 'border-[#b9adc7] bg-[#f4f1f7]' : 'border-slate-200 hover:bg-slate-50'}`}>
              <span className="block text-xs font-bold text-[#514568]">{row.reference}</span>
              <span className="mt-1 block break-words text-sm font-bold">{row.document.title}</span>
              <span className="mt-1 block break-words text-xs text-slate-500">{row.document.clientName}</span>
              <span className="mt-2 block text-sm font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: row.document.currency }).format(row.document.total)}</span>
              {row.document.hasRecurring && <span className="mt-1 block text-xs text-slate-500">+ {new Intl.NumberFormat('en-PH', { style: 'currency', currency: row.document.currency }).format(row.document.recurringTotal)} / {row.document.billingPeriod === 'yearly' ? 'year' : 'month'}</span>}
            </button>
          ))}</div>}
          <button className="mt-5 inline-block text-sm font-bold text-[#514568] underline underline-offset-4" type="button" onClick={() => setActiveTab('list')}>View all quotations →</button>
        </aside>
      </div>

      <QuotationDocument document={document} reference={selected?.reference} />
      </div> : <div className="quotation-controls" role="tabpanel" id="quotation-panel-list" aria-labelledby="quotation-tab-list"><QuotationListPanel token={token} embedded onDeleted={(row) => {
        setRevision((value) => value + 1);
        if (selected?.id === row.id) { setSelected(null); setDocument(newQuotation()); setDirty(false); }
      }} /></div>}
      {savedLink?.sharePath && <QuotationLinkDialog quotation={savedLink} onClose={() => setSavedLink(null)} />}
      {pdfPreview && document.contractPdf && <dialog ref={pdfDialog} aria-label="Quotation PDF contract preview" className="fixed inset-0 m-auto w-[94vw] max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl backdrop:bg-slate-950/60" onCancel={(event) => { event.preventDefault(); setPdfPreview(false); }}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="truncate font-bold">{document.contractPdf.fileName}</h2><button type="button" className={secondaryClass} onClick={() => setPdfPreview(false)}>Close Preview</button></div><PdfContractView token={token} url={`${getApiBaseUrl()}/api/admin/contracts/files/${document.contractPdf.id}`} className="h-[75dvh] w-full rounded border border-slate-200" /></dialog>}
    </div>
  );
}
