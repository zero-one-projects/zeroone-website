const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSignature, createAcceptanceProof, verifyAcceptanceProof } = require('./quotation-signature');
const { quotationContract } = require('./quotation-contract');

test('acceptance requires deliberate consent and a complete, bounded signature', () => {
  const good = { type: 'drawn', agreed: true, strokes: [[[0.1, 0.2], [0.6, 0.7]]] };
  assert.equal(normalizeSignature(good).type, 'drawn');
  for (const input of [{ ...good, agreed: false }, { ...good, strokes: [] }, { ...good, strokes: [[[0, 0], [0.01, 0.01]]] }, { ...good, strokes: [[[0, 0], [2, 3]]] }, { ...good, strokes: [Array(3001).fill([0.5, 0.5])] }]) assert.throws(() => normalizeSignature(input), { statusCode: 400 });
  assert.equal(normalizeSignature({ type: 'typed', agreed: true, typedName: 'Client Name' }, 'Client Name').typedName, 'Client Name');
  assert.throws(() => normalizeSignature({ type: 'typed', agreed: true, typedName: 'Other Name' }, 'Client Name'));
});

test('email verification proof is bound to the challenge, quotation, contract text, and expiry', () => {
  const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = 'signature-test-secret';
  try {
    const challenge = { id: 'challenge', quotationId: 3, email: 'client@example.com', documentHash: 'reviewed-version', expiresAt: new Date(Date.now() + 60000) };
    const proof = createAcceptanceProof(challenge, 'Original contract');
    assert(verifyAcceptanceProof(proof, challenge, 'Original contract'));
    assert(!verifyAcceptanceProof(proof, { ...challenge, quotationId: 4 }, 'Original contract'));
    assert(!verifyAcceptanceProof(proof, { ...challenge, documentHash: 'edited' }, 'Original contract'));
    assert(!verifyAcceptanceProof(proof, challenge, 'Different contract'));
    assert(!verifyAcceptanceProof('forged', challenge, 'Original contract'));
    const expired = createAcceptanceProof({ ...challenge, expiresAt: new Date(Date.now() - 1000) }, 'Original contract');
    assert(!verifyAcceptanceProof(expired, challenge, 'Original contract'));
  } finally { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; }
});

test('default contract contains supplied costs, payments, cancellation and support; per-quotation terms override it', () => {
  const terms = quotationContract({});
  for (const text of ['Hosting costs depend on', 'Registration and renewal costs depend on', '20%', '70%', '10%', 'Down Payment (DP)', 'Second Payment', 'non-refundable', 'thirty (30)', 'three (3)-month', 'DOMAIN & SERVER ACCESS HANDOVER']) assert(terms.includes(text));
  assert.equal(quotationContract({ contractText: ' Specific agreement ' }), 'Specific agreement');
});

test('final one-time contract uses three payment milestones without quotation validity wording', () => {
  const terms = quotationContract({ quoteType: 'project' });
  for (const line of ['1. **20% Down Payment (DP)** — before project start.', '2. **70% Second Payment** — upon completion of development.', '3. **10% Final Payment** — upon system go-live.']) assert(terms.includes(line));
  assert(!/700\.00|850\.00|1,000\.00/.test(terms));
  assert(!terms.includes('Phase 1')); assert(!terms.includes('Phase 2'));
  assert(terms.startsWith('1. PROJECT SCOPE & AGREED DELIVERABLES'));
  assert(terms.includes('2. IMPLEMENTATION TIMELINE'));
  assert(terms.includes('3. MAJOR MODIFICATIONS & ADDITIONAL FEATURES'));
  assert(terms.includes('4. TECHNICAL SUPPORT'));
  assert(terms.includes('unlimited qualifying Technical Support at no additional charge'));
  assert(terms.includes('no fixed numerical limit on qualifying technical support requests'));
  assert(terms.includes('during the included three (3)-month support period'));
  assert(!/Basic|Premium|active subscription/.test(terms));
  assert(terms.includes('5. MINOR ENHANCEMENTS'));
  assert(terms.includes('no fixed numerical limit on qualifying Minor Enhancement requests'));
  assert(terms.includes('without an additional development charge'));
  assert(terms.includes('every requested change automatically qualifies'));
  assert(terms.indexOf('4. TECHNICAL SUPPORT') < terms.indexOf('5. MINOR ENHANCEMENTS'));
  assert(terms.includes('10. PAYMENT TERMS'));
  assert(terms.indexOf('6. WARRANTY & SUPPORT') < terms.indexOf('10. PAYMENT TERMS'));
  assert(terms.indexOf('10. PAYMENT TERMS') < terms.indexOf('11. PAYMENT & CANCELLATION POLICY'));
  assert.equal([...terms.matchAll(/^\d+\. ([A-Z][A-Z &]+)$/gm)].at(-1)[1], 'PAYMENT & CANCELLATION POLICY');
  assert(terms.includes('6. WARRANTY & SUPPORT'));
  assert(terms.includes('All qualifying minor enhancements are provided free of charge during the included three (3)-month support period'));
  assert(terms.includes('All features and functionality agreed upon in the accepted quotation will be implemented as agreed'));
  assert(terms.indexOf('3. MAJOR MODIFICATIONS') < terms.indexOf('10. PAYMENT TERMS'));
  assert.equal(terms.split('Major modifications, redesigns, or additional features **outside the agreed quotation scope** are excluded').length - 1, 1);
  assert(!terms.includes('QUOTATION VALIDITY & CONTACT'));
  assert(!terms.includes('good-faith estimate'));
  assert(!terms.includes('fifteen (15) days'));
});

test('an accepted page session survives OTP expiry but is bound to the client, document, link, and quotation expiry', () => {
  const { createSigningSession, verifySigningSession } = require('./quotation-signature');
  const { documentHash } = require('./quotation-response');
  const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = 'page-session-test';
  try {
    const row = { id: 12, document: { validUntil: '2099-01-01', contractText: 'Agreed terms' }, shareToken: 'a'.repeat(64) };
    const challenge = { id: 'session-challenge', quotationId: 12, email: 'client@example.com', documentHash: documentHash(row.document), expiresAt: new Date(Date.now() - 60000) };
    const session = createSigningSession(challenge, row, 'Agreed terms');
    assert(verifySigningSession(session, challenge, row, 'Agreed terms'));
    assert(!verifyAcceptanceProof(session, challenge, 'Agreed terms'));
    assert(!verifySigningSession(session, { ...challenge, email: 'other@example.com' }, row, 'Agreed terms'));
    assert(!verifySigningSession(session, challenge, { ...row, shareToken: 'b'.repeat(64) }, 'Agreed terms'));
    assert(!verifySigningSession(session, challenge, { ...row, document: { ...row.document, contractText: 'Changed terms' } }, 'Agreed terms'));
    assert(!verifySigningSession(session, challenge, row, 'Other contract'));
    assert(!verifySigningSession('forged', challenge, row, 'Agreed terms'));
    const expiredRow = { ...row, document: { validUntil: '2020-01-01' } };
    const expired = createSigningSession(challenge, expiredRow, 'Agreed terms');
    assert(!verifySigningSession(expired, challenge, expiredRow, 'Agreed terms'));
  } finally { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; }
});
