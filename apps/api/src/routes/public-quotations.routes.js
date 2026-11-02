const express = require('express');
const crypto = require('crypto');
const { Quotation, QuotationVerification, QuotationNotification, QuotationResponseHistory } = require('../models');
const { recordResponse } = require('../utils/quotation-history');
const { queueNotificationDelivery } = require('../utils/quotation-notifications');
const { sequelize } = require('../config/database');
const { documentHash, codeHash } = require('../utils/quotation-response');
const { sendQuotationCode } = require('../utils/quotation-verification-mail');
const { quotationExpired, quotationExpiresAt } = require('../utils/quotation-sharing');
const { serializeQuotation } = require('../utils/serialize-quotation');
const { quotationContract } = require('../utils/quotation-contract');
const { consentText, normalizeSignature, createAcceptanceProof, verifyAcceptanceProof, createSigningSession, verifySigningSession } = require('../utils/quotation-signature');
const { clientQuotationUrl } = require('../utils/quotation-client-email');
const router = express.Router();
const requestLimits = new Map();

function pendingSignature(row) {
  return row.clientResponse?.action === 'accept' && !row.clientResponse.signature && row.clientResponse.documentHash === documentHash(row.document);
}
function signingContract(row) { return pendingSignature(row) ? row.clientResponse.contractText || quotationContract(row.document) : quotationContract(row.document); }

function openPageSession(row, challenge) {
  const contractText = signingContract(row);
  return { challengeId: challenge.id, verificationProof: createSigningSession(challenge, row, contractText),
    contractText, consentText, expiresAt: quotationExpiresAt(row.document.validUntil), documentVersion: documentHash(row.document),
    email: challenge.email, name: row.clientResponse.signature?.signerName || row.clientResponse.name };
}

router.use((req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  next();
});

function limitRequests(req) {
  const key = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const current = requestLimits.get(key);
  if (current && current.until > now && current.count >= 10) return false;
  if (!current || current.until <= now) {
    if (requestLimits.size >= 5000) requestLimits.delete(requestLimits.keys().next().value);
    requestLimits.set(key, { count: 1, until: now + 10 * 60 * 1000 });
  } else current.count += 1;
  return true;
}

router.post('/:token/verification', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(404).json({ message: 'Quotation link not found.' });
    if (!limitRequests(req)) return res.status(429).json({ message: 'Too many code requests. Please try again in 10 minutes.' });
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const action = req.body?.action;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180 || !['accept', 'requote'].includes(action)) return res.status(400).json({ message: 'Enter a valid email and choose Accept or Request Requote.' });
    const row = await Quotation.findOne({ where: { shareToken: req.params.token }, logging: false });
    if (!row) return res.status(404).json({ message: 'Quotation link not found.' });
    if (quotationExpired(row.document)) return res.status(410).json({ message: 'This quotation has expired.' });
    const version = documentHash(row.document);
    if (req.body.documentVersion !== version) return res.status(409).json({ message: 'This quotation has changed. Refresh and review it before responding.' });
    if (row.clientResponse?.documentHash === version && !(action === 'accept' && pendingSignature(row))) return res.status(409).json({ message: 'A response has already been recorded for this quotation.' });
    if (pendingSignature(row) && email !== row.clientResponse.email) return res.status(403).json({ message: 'Use the email that accepted this quotation to sign its contract.' });
    if (row.document.clientEmail && row.document.clientEmail.toLowerCase() !== email) return res.status(403).json({ message: 'Use the client email listed on this quotation. Contact Zero One if it needs to be changed.' });
    const last = await QuotationVerification.findOne({ where: { quotationId: row.id, email }, order: [['createdAt', 'DESC']] });
    if (last && Date.now() - new Date(last.createdAt).getTime() < 60000) return res.status(429).json({ message: 'Wait 60 seconds before requesting another code.' });
    const id = crypto.randomUUID();
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Math.min(Date.now() + 10 * 60 * 1000, quotationExpiresAt(row.document.validUntil).getTime()));
    const challenge = await QuotationVerification.create({ id, quotationId: row.id, email, action, documentHash: version, codeHash: codeHash(id, code), expiresAt });
    try {
      await sendQuotationCode({ email, code, reference: serializeQuotation(row).reference, action: pendingSignature(row) ? 'sign' : action, expiresAt, requestedAt: challenge.createdAt, requestIp: req.ip });
    } catch (error) { await challenge.destroy(); throw error; }
    return res.json({ challengeId: id, expiresAt, message: 'Verification code sent. Check your inbox.' });
  } catch (error) { return next(error); }
});

router.post('/:token/verify', async (req, res, next) => {
  try {
    const { challengeId, code } = req.body || {};
    if (!/^[a-f0-9]{64}$/.test(req.params.token) || typeof challengeId !== 'string' || !/^[a-f0-9-]{36}$/.test(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Enter the six-digit code from your email.' });
    const result = await sequelize.transaction({ logging: false }, async (transaction) => {
      const row = await Quotation.findOne({ where: { shareToken: req.params.token }, transaction, logging: false, lock: transaction.LOCK.UPDATE });
      if (!row) return { status: 404, message: 'Quotation link not found.' };
      if (quotationExpired(row.document)) return { status: 410, message: 'This quotation has expired.' };
      const challenge = await QuotationVerification.findByPk(challengeId, { transaction, logging: false, lock: transaction.LOCK.UPDATE });
      if (!challenge || challenge.quotationId !== row.id || challenge.action !== 'accept' || challenge.consumedAt || new Date(challenge.expiresAt).getTime() <= Date.now() || challenge.attempts >= 5) return { status: 400, message: 'This verification code is invalid or expired. Request a new code.' };
      await challenge.update({ attempts: challenge.attempts + 1 }, { transaction, logging: false });
      if (!crypto.timingSafeEqual(Buffer.from(codeHash(challengeId, code), 'hex'), Buffer.from(challenge.codeHash, 'hex'))) return { status: 400, message: 'Incorrect code. Please check your inbox and try again.' };
      if (challenge.documentHash !== documentHash(row.document) || (row.document.clientEmail && row.document.clientEmail.toLowerCase() !== challenge.email)) return { status: 409, message: 'The quotation changed. Refresh and review it before signing.' };
      if (row.clientResponse?.documentHash === challenge.documentHash && !pendingSignature(row)) return { status: 409, message: 'A response has already been recorded for this quotation.' };
      if (pendingSignature(row) && challenge.email !== row.clientResponse.email) return { status: 403, message: 'Use the email that accepted this quotation to sign its contract.' };
      const contractText = signingContract(row);
      const session = pendingSignature(row) ? openPageSession(row, challenge) : null;
      const verificationProof = session?.verificationProof || createAcceptanceProof(challenge, contractText);
      // A verified code cannot be exchanged twice. Accepted clients receive a tab-scoped signing session.
      await challenge.update({ codeHash: crypto.randomBytes(32).toString('hex') }, { transaction, logging: false });
      return { status: 200, verificationProof, contractText, consentText, expiresAt: session?.expiresAt || challenge.expiresAt, ...(session ? { signingSession: session } : {}) };
    });
    const { status, ...payload } = result;
    return res.status(status).json(payload);
  } catch (error) { return next(error); }
});

router.post('/:token/respond', async (req, res, next) => {
  try {
    const { challengeId, code, action, verificationProof } = req.body || {};
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (!/^[a-f0-9]{64}$/.test(req.params.token) || typeof challengeId !== 'string' || !/^[a-f0-9-]{36}$/.test(challengeId) || !name || name.length > 180 || note.length > 5000 || !['accept', 'requote'].includes(action) || (action === 'requote' && (!note || typeof code !== 'string' || !/^\d{6}$/.test(code))) || (action === 'accept' && (typeof verificationProof !== 'string' || verificationProof.length > 3000))) {
      return res.status(400).json({ message: 'Enter your name, the six-digit code, and the changes requested for a requote.' });
    }
    const signature = action === 'accept' && req.body.signature !== undefined ? normalizeSignature(req.body.signature, name) : null;
    const result = await sequelize.transaction({ logging: false }, async (transaction) => {
      const row = await Quotation.findOne({ where: { shareToken: req.params.token }, transaction, logging: false, lock: transaction.LOCK.UPDATE });
      if (!row) return { status: 404, message: 'Quotation link not found.' };
      if (quotationExpired(row.document)) return { status: 410, message: 'This quotation has expired.' };
      const challenge = await QuotationVerification.findByPk(challengeId, { transaction, logging: false, lock: transaction.LOCK.UPDATE });
      if (!challenge || challenge.quotationId !== row.id || challenge.action !== action || challenge.consumedAt || new Date(challenge.expiresAt).getTime() <= Date.now() || (action === 'requote' && challenge.attempts >= 5)) return { status: 400, message: 'This verification code is invalid or expired. Request a new code.' };
      if (action === 'accept') {
        if (!verifyAcceptanceProof(verificationProof, challenge, quotationContract(row.document))) return { status: 400, message: 'Your email verification is invalid or expired. Request a new code before signing.' };
      } else {
        await challenge.update({ attempts: challenge.attempts + 1 }, { transaction, logging: false });
        const candidate = codeHash(challengeId, code);
        if (!crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(challenge.codeHash, 'hex'))) return { status: 400, message: 'Incorrect code. Please check your inbox and try again.' };
      }
      const version = documentHash(row.document);
      if (challenge.documentHash !== version || (row.document.clientEmail && row.document.clientEmail.toLowerCase() !== challenge.email)) return { status: 409, message: 'The quotation changed. Refresh and review it before responding.' };
      if (row.clientResponse?.documentHash === version) return { status: 409, message: 'A response has already been recorded for this quotation.' };
      const response = { action, email: challenge.email, name, note, respondedAt: new Date().toISOString(), documentHash: version, document: row.document };
      if (action === 'accept') { response.contractText = quotationContract(row.document); response.verificationChallengeId = challenge.id; }
      if (signature) response.signature = { ...signature, signerName: name, email: challenge.email, signedAt: response.respondedAt,
        contractText: quotationContract(row.document), documentHash: version, ipAddress: req.ip,
        userAgent: String(req.get('user-agent') || '').slice(0, 500) };
      await recordResponse(QuotationResponseHistory, row, response, transaction);
      await row.update({ clientResponse: response }, { transaction, logging: false });
      await challenge.update({ consumedAt: new Date() }, { transaction, logging: false });
      await QuotationNotification.create({ id: crypto.randomUUID(), quotationId: row.id, payload: {
          action,
          reference: serializeQuotation(row).reference, title: row.document.title,
          clientCompany: row.document.clientName, clientName: name, clientEmail: challenge.email,
          total: row.document.total, currency: row.document.currency, validUntil: row.document.validUntil,
          hasRecurring: row.document.hasRecurring, recurringTotal: row.document.recurringTotal, billingPeriod: row.document.billingPeriod,
          billingCommencement: row.document.contractDetails?.billingCommencement, monthlySubscriptionNotice: row.document.monthlySubscription?.notice,
          respondedAt: row.clientResponse.respondedAt, documentVersion: version, note, signedAt: response.signature?.signedAt, ...(signature ? { signedContract: { reference: serializeQuotation(row).reference, document: response.document, signature: response.signature } } : {}), signaturePending: action === 'accept' && !signature
        } }, { transaction, logging: false });
      if (action === 'accept') await QuotationNotification.create({ id: crypto.randomUUID(), quotationId: row.id, payload: {
        action: 'client_accept', reference: serializeQuotation(row).reference, title: row.document.title,
        clientName: name, clientEmail: challenge.email, total: row.document.total, currency: row.document.currency,
        hasRecurring: row.document.hasRecurring, recurringTotal: row.document.recurringTotal, billingPeriod: row.document.billingPeriod,
        billingCommencement: row.document.contractDetails?.billingCommencement, monthlySubscriptionNotice: row.document.monthlySubscription?.notice,
        respondedAt: response.respondedAt, signedAt: response.signature?.signedAt, signaturePending: !signature,
        validUntil: row.document.validUntil, clientUrl: clientQuotationUrl(row.shareToken), ...(signature ? { signedContract: { reference: serializeQuotation(row).reference, document: response.document, signature: response.signature } } : {})
      } }, { transaction, logging: false });
      return { status: 200, quotation: serializeQuotation(row), ...(action === 'accept' && !signature ? { signingSession: openPageSession(row, challenge) } : {}), notifyTeam: true };
    });
    if (result.notifyTeam) queueNotificationDelivery();
    return res.status(result.status).json(result.quotation ? { quotation: result.quotation, ...(result.signingSession ? { signingSession: result.signingSession } : {}) } : { message: result.message });
  } catch (error) { return next(error); }
});

router.post('/:token/sign', async (req, res, next) => {
  try {
    const { challengeId, verificationProof } = req.body || {};
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!/^[a-f0-9]{64}$/.test(req.params.token) || typeof challengeId !== 'string' || !/^[a-f0-9-]{36}$/.test(challengeId) || typeof verificationProof !== 'string' || verificationProof.length > 3000 || !name || name.length > 180) return res.status(400).json({ message: 'Verify your email and enter your full name before signing.' });
    const signature = normalizeSignature(req.body.signature, name);
    const result = await sequelize.transaction({ logging: false }, async (transaction) => {
      const row = await Quotation.findOne({ where: { shareToken: req.params.token }, transaction, lock: transaction.LOCK.UPDATE, logging: false });
      if (!row) return { status: 404, message: 'Quotation link not found.' };
      if (quotationExpired(row.document)) return { status: 410, message: 'This link has expired. Contact Zero One to extend access before signing.' };
      if (!pendingSignature(row)) return { status: 409, message: 'This quotation must be accepted and awaiting signature. Refresh the page.' };
      const challenge = await QuotationVerification.findByPk(challengeId, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
      const response = row.clientResponse;
      const sessionValid = challenge && verifySigningSession(verificationProof, challenge, row, signingContract(row));
      if (!challenge || challenge.quotationId !== row.id || challenge.action !== 'accept' || challenge.email !== response.email || challenge.documentHash !== response.documentHash || (challenge.consumedAt && response.verificationChallengeId !== challenge.id) || (!sessionValid && (new Date(challenge.expiresAt).getTime() <= Date.now() || !verifyAcceptanceProof(verificationProof, challenge, signingContract(row))))) return { status: 400, message: 'Your verification is invalid or expired. Request a new code to sign.' };
      const updated = { ...response, signature: { ...signature, signerName: name, email: challenge.email, signedAt: new Date().toISOString(), contractText: signingContract(row), documentHash: response.documentHash, ipAddress: req.ip, userAgent: String(req.get('user-agent') || '').slice(0, 500) } };
      await row.update({ clientResponse: updated }, { transaction, logging: false });
      const [history] = await QuotationResponseHistory.findOrCreate({ where: { quotationId: row.id, documentHash: response.documentHash }, defaults: { response }, transaction, logging: false });
      await history.update({ response: updated }, { transaction, logging: false });
      await challenge.update({ consumedAt: new Date() }, { transaction, logging: false });
      const notificationPayload = {
        action: 'signed', reference: serializeQuotation(row).reference, title: row.document.title, clientCompany: row.document.clientName,
        clientName: name, clientEmail: challenge.email, total: row.document.total, currency: row.document.currency,
        hasRecurring: row.document.hasRecurring, recurringTotal: row.document.recurringTotal, billingPeriod: row.document.billingPeriod,
        billingCommencement: row.document.contractDetails?.billingCommencement, monthlySubscriptionNotice: row.document.monthlySubscription?.notice,
        validUntil: row.document.validUntil, respondedAt: response.respondedAt, signedAt: updated.signature.signedAt, documentVersion: response.documentHash,
        signedContract: { reference: serializeQuotation(row).reference, document: response.document || row.document, signature: updated.signature }
      };
      await QuotationNotification.create({ id: crypto.randomUUID(), quotationId: row.id, payload: notificationPayload }, { transaction, logging: false });
      await QuotationNotification.create({ id: crypto.randomUUID(), quotationId: row.id, payload: { ...notificationPayload, action: 'client_signed' } }, { transaction, logging: false });
      return { status: 200, quotation: serializeQuotation(row), signingSession: openPageSession(row, challenge) };
    });
    if (result.status === 200) queueNotificationDelivery();
    return res.status(result.status).json(result.quotation ? { quotation: result.quotation, ...(result.signingSession ? { signingSession: result.signingSession } : {}) } : { message: result.message });
  } catch (error) { return next(error); }
});

router.post('/:token/signed-contract', async (req, res, next) => {
  try {
    const { challengeId, verificationProof } = req.body || {};
    if (!/^[a-f0-9]{64}$/.test(req.params.token) || typeof challengeId !== 'string' || !/^[a-f0-9-]{36}$/.test(challengeId) || typeof verificationProof !== 'string' || verificationProof.length > 3000) return res.status(400).json({ message: 'Your verified signing session is required.' });
    const row = await Quotation.findOne({ where: { shareToken: req.params.token }, logging: false });
    if (!row) return res.status(404).json({ message: 'Quotation link not found.' });
    if (quotationExpired(row.document)) return res.status(410).json({ message: 'This quotation link has expired. Your signed copy was sent by email.' });
    const response = row.clientResponse;
    const challenge = await QuotationVerification.findByPk(challengeId, { logging: false });
    if (!response?.signature || response.documentHash !== documentHash(row.document) || !challenge || challenge.quotationId !== row.id || challenge.email !== response.email || !verifySigningSession(verificationProof, challenge, row, response.contractText || quotationContract(row.document))) return res.status(403).json({ message: 'Use the verified session that signed this contract. A copy is also sent to your email.' });
    const reference = serializeQuotation(row).reference;
    const pdf = await require('../utils/signed-contract-pdf').renderSignedContractPdf({ reference, document: response.document || row.document, signature: response.signature });
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Signed-Contract-${reference}.pdf"` }).send(pdf);
  } catch (error) { return next(error); }
});

router.get('/:token/contract-pdf', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(404).json({ message: 'Quotation link not found.' });
    const row = await Quotation.findOne({ where: { shareToken: req.params.token }, logging: false });
    if (!row) return res.status(404).json({ message: 'Quotation link not found.' });
    if (quotationExpired(row.document)) return res.status(410).json({ message: 'This quotation has expired.' });
    if (row.document.contractSource !== 'pdf') return res.status(404).json({ message: 'This quotation uses a default contract.' });
    const file = await require('../utils/contract-files').getContractFile(row.document.contractPdf, true);
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="contract.pdf"' }).send(file.data);
  } catch (error) { return next(error); }
});

router.get('/:token', async (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(404).json({ message: 'Quotation link not found.' });
    const row = await Quotation.findOne({ where: { shareToken: req.params.token }, logging: false });
    if (!row) return res.status(404).json({ message: 'This quotation link is unavailable or has been revoked.' });
    if (quotationExpired(row.document)) return res.status(410).json({ message: 'This quotation has expired. Please contact Zero One for an updated quotation.' });
    return res.json({ quotation: serializeQuotation(row), expiresAt: quotationExpiresAt(row.document.validUntil) });
  } catch (error) { return next(error); }
});

module.exports = router;
