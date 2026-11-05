const crypto = require('crypto');
const sharp = require('sharp');
const { validatePdf } = require('./contract-files');
const { paymentSummary } = require('./quotation-payment');
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const maxProofBytes = 2 * 1024 * 1024;
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
function normalizeProofInput(input) {
  if (!uuid(input.id)) throw fail('Invalid payment submission ID.');
  const amount = String(input.amountPaid ?? '');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) throw fail('Enter a valid payment amount greater than zero.');
  const paidOn = input.paidOn;
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (typeof paidOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || !Number.isFinite(Date.parse(paidOn)) || new Date(paidOn).toISOString().slice(0, 10) !== paidOn || paidOn > today) throw fail('Enter a valid payment date that is not in the future.');
  if (typeof input.transactionReference !== 'string' || !input.transactionReference.trim() || input.transactionReference.length > 180) throw fail('Enter the payment transaction reference (up to 180 characters).');
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 2000)) throw fail('Payment notes must be 2,000 characters or fewer.');
  return { id: input.id, amountPaid: Number(amount), paidOn, transactionReference: input.transactionReference.trim(), note: input.note?.trim() || '' };
}
async function validateProofFile(file) {
  if (!file?.buffer?.length || file.buffer.length > maxProofBytes) throw fail('Upload one PDF, JPG, or PNG proof of payment up to 2 MB.');
  if (file.buffer.subarray(0, 5).toString() === '%PDF-') {
    const result = await validatePdf({ ...file, originalname: 'Payment-Proof.pdf', mimetype: 'application/pdf' }).catch(() => { throw fail('Upload a readable PDF without a password, up to 2 MB.'); });
    return { ...result, mimeType: 'application/pdf', extension: 'pdf' };
  }
  try {
    const image = sharp(file.buffer, { limitInputPixels: 20000000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png'].includes(metadata.format) || (metadata.pages || 1) !== 1) throw new Error('Invalid image');
    const data = await image.rotate().toBuffer();
    if (data.length > maxProofBytes) throw new Error('Image too large');
    return { data, sha256: crypto.createHash('sha256').update(data).digest('hex'), mimeType: metadata.format === 'png' ? 'image/png' : 'image/jpeg', extension: metadata.format === 'png' ? 'png' : 'jpg' };
  } catch { throw fail('Upload a valid JPG, PNG, or PDF proof of payment up to 2 MB.'); }
}
function proofMetadata(proof) {
  return { id: proof.id, amountPaid: Number(proof.amountPaid), currency: proof.snapshot.document.currency, paidOn: proof.paidOn,
    transactionReference: proof.transactionReference, note: proof.note, fileName: proof.fileName, clientName: proof.snapshot.clientName,
    clientEmail: proof.clientEmail, documentHash: proof.documentHash, submittedAt: proof.createdAt, status: proof.verification?.status || 'pending_verification',
    verification: proof.verification ? { status: proof.verification.status, name: proof.verification.name, reviewedAt: proof.verification.reviewedAt, confirmedAmount: proof.verification.confirmedAmount, note: proof.verification.note } : null };
}
async function proofMessage(proofId) {
  const proof = await require('../models').QuotationPaymentProof.findByPk(proofId, { logging: false });
  if (!proof) throw new Error('Payment proof is unavailable.');
  if (crypto.createHash('sha256').update(proof.data).digest('hex') !== proof.sha256) throw new Error('Payment proof integrity check failed.');
  const snapshot = proof.snapshot;
  const doc = snapshot.document;
  const summary = paymentSummary(doc, snapshot.contractText);
  const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: doc.currency }).format(value);
  return {
    subject: `Proof of payment submitted: ${snapshot.reference}`,
    toRecipients: ['sales@zerooneitinc.com', 'billing@zerooneitinc.com'].map(address => ({ emailAddress: { address } })),
    replyTo: [{ emailAddress: { address: proof.clientEmail, name: snapshot.clientName } }],
    body: { contentType: 'Text', content: [
      'A verified client submitted proof of payment. Please review the attached receipt and verify receipt of funds before confirming payment.', '',
      `Quotation / contract: ${snapshot.reference}`, `Project: ${doc.title}`, `Client / company: ${doc.clientName}`,
      `Client address: ${doc.clientAddress || ''}`, `Submitted by / signer: ${snapshot.clientName}`, `Verified client email: ${proof.clientEmail}`,
      `Contract signed on: ${snapshot.signedAt}`, `Signed document version: ${proof.documentHash}`, '',
      `Total one-time contract amount: ${money(summary.contractTotal)}`,
      ...(summary.amountDue !== null ? [`Current scheduled payment: ${money(summary.amountDue)} (${summary.initialPercent}%)`, `Scheduled balance after this payment: ${money(summary.scheduledRemaining)}`] : ['Current amount due: Follow the signed payment terms.']),
      ...(doc.hasRecurring ? [`Separate recurring subscription: ${money(doc.recurringTotal)} / ${doc.billingPeriod === 'yearly' ? 'year' : 'month'}`] : []),
      `Client-reported amount paid: ${money(proof.amountPaid)}`, `Payment date: ${proof.paidOn}`, `Transaction reference: ${proof.transactionReference}`,
      `Submitted at: ${new Date(proof.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)`,
      `Submission ID: ${proof.id}`, ...(proof.note ? ['', 'Client notes:', proof.note] : []), '',
      'Status: Awaiting billing verification. This submission does not confirm payment or reduce the outstanding balance.',
      'Review the proof and signed contract in Admin → Quotation List.'
    ].join('\n') },
    attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: proof.fileName, contentType: proof.mimeType, contentBytes: proof.data.toString('base64') }]
  };
}
module.exports = { fail, uuid, maxProofBytes, normalizeProofInput, validateProofFile, proofMetadata, proofMessage };
