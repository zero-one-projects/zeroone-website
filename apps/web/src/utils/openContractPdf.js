import { getApiBaseUrl } from './apiBaseUrl';
export async function openContractPdf(document, signature, { adminToken, quotationId, shareToken } = {}) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow popups to view the PDF contract.');
  popup.opener = null;
  try {
    let url; const options = { cache: 'no-store', headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {} };
    if (signature && adminToken && quotationId) {
      url = `${getApiBaseUrl()}/api/admin/contracts/signed-copy`;
      options.method = 'POST'; options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify({ quotationId, documentHash: signature.documentHash });
    } else url = adminToken ? quotationId ? `${getApiBaseUrl()}/api/admin/contracts/quotations/${quotationId}/pdf` : `${getApiBaseUrl()}/api/admin/contracts/files/${document.contractPdf.id}` : `${getApiBaseUrl()}/api/quotations/${encodeURIComponent(shareToken)}/contract-pdf`;
    const response = await fetch(url, options);
    if (!response.ok) { const payload = await response.json(); throw new Error(payload.message || 'Unable to open the PDF contract.'); }
    const objectUrl = URL.createObjectURL(await response.blob());
    popup.location.replace(objectUrl); setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
  } catch (error) { popup.close(); throw error; }
}
