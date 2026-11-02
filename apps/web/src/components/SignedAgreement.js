import ContractRichText from './ContractRichText';
import { SignatureDrawing } from './SignaturePad';
import { useState } from 'react';
import { printContract } from '../utils/printContract';

export default function SignedAgreement({ signature, document, reference, token, quotationId }) {
  const [error, setError] = useState('');
  if (!signature) return null;
  return <details className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
    <summary className="cursor-pointer font-bold text-[#514568]">View signed agreement</summary>
    <p className="mt-3 font-bold">Signed by {signature.signerName}</p>
    <p className="mt-1">Verified email: {signature.email}</p>
    <p className="mt-1 text-xs text-slate-500">{new Date(signature.signedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</p>
    {signature.type === 'drawn' ? <SignatureDrawing strokes={signature.strokes} className="mt-4 h-32 w-full rounded-lg border border-slate-200" /> : <p className="mt-4 border-b border-slate-300 py-4 font-serif text-3xl italic">{signature.typedName}</p>}
    <p className="mt-4">{signature.consentText}</p>
    <div className="mt-4 leading-6">{document?.contractSource === 'pdf' ? <p className="text-sm text-slate-600">Signed PDF: {document.contractPdf.fileName}</p> : <ContractRichText text={signature.contractText} format={document?.contractStyle} />}</div>
    {signature.ipAddress && <p className="mt-3 text-xs text-slate-500">Recorded IP address: {signature.ipAddress}</p>}
    {document && <button className="mt-4 rounded-lg border border-slate-200 px-4 py-2 font-bold text-[#514568]" type="button" onClick={async () => { setError(''); try { await printContract({ ...document, contractText: signature.contractText }, reference, signature, { adminToken: token, quotationId }); } catch (failure) { setError(failure.message); } }}>Print Signed Contract / Save PDF</button>}
    {error && <p className="mt-3 text-rose-700" role="alert">{error}</p>}
  </details>;
}
