const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { Quotation, QuotationVerification, QuotationPaymentProof, QuotationNotification } = require('../models');
const { quotationExpired } = require('../utils/quotation-sharing');
const { documentHash } = require('../utils/quotation-response');
const { quotationContract } = require('../utils/quotation-contract');
const { verifySigningSession } = require('../utils/quotation-signature');
const { serializeQuotation } = require('../utils/serialize-quotation');
const { queueNotificationDelivery } = require('../utils/quotation-notifications');
const { fail, uuid, maxProofBytes, normalizeProofInput, validateProofFile, proofMetadata } = require('../utils/payment-proof');
const router = express.Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxProofBytes, files: 1, fields: 10, fieldSize: 6000, parts: 12 } }).single('proof');
router.post('/', (req, res, next) => upload(req, res, error => {
  if (error) return next(fail(error.code === 'LIMIT_FILE_SIZE' ? 'Proof of payment must be 2 MB or smaller.' : 'Upload one PDF, JPG, or PNG proof of payment with the required payment details.', error.code === 'LIMIT_FILE_SIZE' ? 413 : 400));
  return next();
}), async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) throw fail('Quotation link not found.', 404);
    const input = normalizeProofInput(req.body || {});
    if (!uuid(req.body.challengeId) || typeof req.body.verificationProof !== 'string' || req.body.verificationProof.length > 3000) throw fail('Verify the email that signed this contract before submitting payment proof.', 403);
    const result = await sequelize.transaction({ logging: false }, async transaction => {
      const row = await Quotation.findOne({ where: { shareToken: req.params.token }, transaction, lock: transaction.LOCK.UPDATE, logging: false });
      if (!row) throw fail('Quotation link not found.', 404);
      if (quotationExpired(row.document)) throw fail('This quotation link has expired. Please contact billing@zerooneitinc.com.', 410);
      const response = row.clientResponse;
      const challenge = await QuotationVerification.findByPk(req.body.challengeId, { transaction, logging: false });
      if (row.document.clientFlow === 'quotation_only' || response?.action !== 'accept' || !response.signature || response.documentHash !== documentHash(row.document) || !challenge || challenge.quotationId !== row.id || challenge.email !== response.email || !verifySigningSession(req.body.verificationProof, challenge, row, response.contractText || quotationContract(row.document))) throw fail('Use the verified email session for this signed contract to submit proof of payment.', 403);
      const file = await validateProofFile(req.file);
      const existing = await QuotationPaymentProof.findByPk(input.id, { transaction, logging: false });
      if (existing) {
        if (existing.quotationId !== row.id || existing.documentHash !== response.documentHash || existing.clientEmail !== response.email || existing.sha256 !== file.sha256 || Number(existing.amountPaid) !== input.amountPaid || existing.paidOn !== input.paidOn || existing.transactionReference !== input.transactionReference || existing.note !== input.note) throw fail('This submission ID was already used. Start a new payment proof submission.', 409);
        return { proof: proofMetadata(existing), created: false };
      }
      const last = await QuotationPaymentProof.findOne({ where: { quotationId: row.id }, order: [['createdAt', 'DESC']], transaction, logging: false });
      if (last && Date.now() - new Date(last.createdAt).getTime() < 60000) throw fail('Wait 60 seconds before submitting another proof of payment.', 429);
      if (await QuotationPaymentProof.count({ where: { quotationId: row.id, documentHash: response.documentHash }, transaction, logging: false }) >= 20) throw fail('Please contact billing@zerooneitinc.com to submit additional payment records.', 429);
      const reference = serializeQuotation(row).reference;
      const proof = await QuotationPaymentProof.create({ ...input, quotationId: row.id, documentHash: response.documentHash, clientEmail: response.email,
        fileName: `Payment-Proof-${reference}-${input.id.slice(0, 8)}.${file.extension}`, mimeType: file.mimeType, sha256: file.sha256, data: file.data,
        snapshot: { reference, clientName: response.signature.signerName || response.name, signedAt: response.signature.signedAt, contractText: response.contractText || quotationContract(row.document), document: response.document || row.document }
      }, { transaction, logging: false });
      await QuotationNotification.create({ id: crypto.randomUUID(), quotationId: row.id, payload: { action: 'payment_proof', proofId: proof.id, reference } }, { transaction, logging: false });
      return { proof: proofMetadata(proof), created: true };
    });
    if (result.created) queueNotificationDelivery();
    return res.status(result.created ? 201 : 200).json({ proof: result.proof, message: 'Your proof of payment has been submitted for review by our Sales and Billing teams. Payment remains subject to verification.' });
  } catch (error) { return next(error); }
});
module.exports = router;
