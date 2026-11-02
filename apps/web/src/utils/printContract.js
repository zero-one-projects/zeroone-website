import { openContractPdf } from './openContractPdf';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ContractDocument, { contractPrintStyles } from '../components/ContractDocument';

function escape(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

async function openContractWindow(document, reference, signature, { autoPrint, templatePreview = false, subtitle = '' }) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow popups to open the contract print / PDF view.');
  popup.opener = null;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><base href="${escape(window.location.origin)}/"><title>Contract ${escape(reference || 'Draft')}</title><style>${contractPrintStyles}\n.contract-preview-controls{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;background:#f4f1f7;border:1px solid #ded7e8;padding:16px;margin-bottom:28px;border-radius:10px;font:14px Arial,sans-serif}.contract-preview-controls button{border:1px solid #d4cbe1;border-radius:7px;padding:10px 14px;cursor:pointer;background:white;color:#26293c}.contract-preview-controls .primary{background:#26293c;color:white}.contract-preview-controls small{display:block;color:#647084;margin-top:5px}@media print{.contract-preview-controls{display:none}}</style></head><body><div id="contract-root"></div></body></html>`);
  popup.document.close();
  const root = createRoot(popup.document.getElementById('contract-root'));
  flushSync(() => root.render(<>
    {!autoPrint && <nav className="contract-preview-controls" aria-label="Contract preview actions"><div><strong>Contract Preview</strong><small>{subtitle || 'Review your contract before printing.'}</small></div><div style={{ display: 'flex', gap: 8 }}><button className="primary" type="button" onClick={() => popup.print()}>Print / Save PDF</button><button type="button" onClick={() => popup.close()}>Close Preview</button></div></nav>}
    <ContractDocument document={document} reference={reference} signature={signature} templatePreview={templatePreview} />
  </>));
  try {
    await Promise.all(Array.from(popup.document.images).map((img) => img.decode()));
    await popup.document.fonts.ready;
    popup.focus(); if (autoPrint) popup.print();
  } catch { popup.close(); throw new Error('The contract logo could not load. Refresh before printing.'); }
}

export function printContract(document, reference, signature, options = {}) { if (document.contractSource === 'pdf') return openContractPdf(document, signature, options); return openContractWindow(document, reference, signature, { autoPrint: true }); }
export function openContractPreview(document, reference, options = {}) { return openContractWindow(document, reference, null, { ...options, autoPrint: false }); }
