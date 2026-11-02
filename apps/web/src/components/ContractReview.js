import PdfContractView from './PdfContractView';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import ContractDocument, { contractPrintStyles } from './ContractDocument';

// Keep the document's print typography isolated from the quotation page and modal.
const reviewHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${contractPrintStyles}@media screen{body{margin:0;padding:24px;max-width:none}.contract-letterhead{gap:12px}.contract-letterhead strong{font-size:12pt}.contract-letterhead img{width:32mm}.contract-watermark{display:none}}</style></head><body><div id="contract-preview-root"></div></body></html>`;
function DefaultContractReview({ document, reference }) {
  const [target, setTarget] = useState(null);
  return <>
    <iframe title="Contract to review" className="h-[55dvh] min-h-80 w-full rounded-lg border border-slate-200 bg-white" sandbox="allow-same-origin allow-modals" srcDoc={reviewHtml} onLoad={(event) => setTarget(event.currentTarget.contentDocument?.getElementById('contract-preview-root'))} />
    {target && createPortal(<ContractDocument document={document} reference={reference} />, target)}
  </>;
}

export default function ContractReview({ document, reference, shareToken, adminToken }) {
  if (document.contractSource === 'pdf' && document.contractPdf) return <PdfContractView url={adminToken ? `${getApiBaseUrl()}/api/admin/contracts/files/${document.contractPdf.id}` : `${getApiBaseUrl()}/api/quotations/${encodeURIComponent(shareToken)}/contract-pdf`} token={adminToken} title="PDF contract to review" />;
  return <DefaultContractReview document={document} reference={reference} />;
}
