const jwt = require('jsonwebtoken');
const { quotationExpiresAt } = require('./quotation-sharing');
const { documentHash } = require('./quotation-response');

const consentText = 'I have reviewed this quotation and its agreement terms. I agree to them, confirm I am authorized to accept on behalf of the client, and consent to use this electronic signature.';
const fail = (message) => Object.assign(new Error(message), { statusCode: 400 });

function normalizeSignature(input, signerName) {
  if (input?.agreed === true && input.type === 'typed') {
    const typedName = typeof input.typedName === 'string' ? input.typedName.trim() : '';
    if (!typedName || typedName.length > 180 || typedName.toLowerCase() !== signerName?.trim().toLowerCase()) throw fail('Type your full name exactly as entered above to sign.');
    return { type: 'typed', typedName, consentText, consentVersion: 1 };
  }
  if (!input || input.agreed !== true || input.type !== 'drawn' || !Array.isArray(input.strokes) || !input.strokes.length || input.strokes.length > 50) throw fail('Agree to the terms and draw your signature before accepting.');
  let points = 0;
  let distance = 0;
  const strokes = input.strokes.map((stroke) => {
    if (!Array.isArray(stroke) || stroke.length < 2) throw fail('Draw a complete signature.');
    points += stroke.length;
    if (points > 3000) throw fail('Signature is too detailed. Clear it and sign again.');
    return stroke.map((point, index) => {
      if (!Array.isArray(point) || point.length !== 2 || point.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1)) throw fail('Invalid signature. Clear it and sign again.');
      if (index) distance += Math.hypot(point[0] - stroke[index - 1][0], point[1] - stroke[index - 1][1]);
      return point.map((value) => Math.round(value * 10000) / 10000);
    });
  });
  if (distance < 0.08) throw fail('Draw a complete signature.');
  return { type: 'drawn', strokes, consentText, consentVersion: 1 };
}

function createAcceptanceProof(challenge, contractText) {
  return jwt.sign({ purpose: 'quotation-signature', challengeId: challenge.id, quotationId: challenge.quotationId,
    email: challenge.email, documentHash: challenge.documentHash, contractHash: documentHash(contractText), exp: Math.floor(new Date(challenge.expiresAt).getTime() / 1000)
  }, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

function verifyAcceptanceProof(token, challenge, contractText) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return payload.purpose === 'quotation-signature' && payload.challengeId === challenge.id && payload.quotationId === challenge.quotationId && payload.email === challenge.email && payload.documentHash === challenge.documentHash && payload.contractHash === documentHash(contractText);
  } catch { return false; }
}

// A signing session is issued only after verified acceptance (or verified return to sign).
// It is held only in the current browser tab by the client and cannot accept a different quotation.
function createSigningSession(challenge, row, contractText) {
  return jwt.sign({ purpose: 'quotation-open-page', challengeId: challenge.id, quotationId: row.id,
    email: challenge.email, documentHash: challenge.documentHash, contractHash: documentHash(contractText),
    shareHash: documentHash(row.shareToken), exp: Math.floor(quotationExpiresAt(row.document.validUntil).getTime() / 1000)
  }, process.env.JWT_SECRET, { algorithm: 'HS256' });
}
function verifySigningSession(token, challenge, row, contractText) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return payload.purpose === 'quotation-open-page' && payload.challengeId === challenge.id && payload.quotationId === row.id &&
      payload.email === challenge.email && payload.documentHash === challenge.documentHash && payload.documentHash === documentHash(row.document) &&
      payload.contractHash === documentHash(contractText) && payload.shareHash === documentHash(row.shareToken);
  } catch { return false; }
}

module.exports = { consentText, normalizeSignature, createAcceptanceProof, verifyAcceptanceProof, createSigningSession, verifySigningSession };
