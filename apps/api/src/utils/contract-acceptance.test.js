const { test } = require('node:test');
const assert = require('node:assert/strict');
const { acceptancePolicy, usesConfirmation, locked, state, publicState, recordClientSignature } = require('./contract-acceptance');
const { documentHash } = require('./quotation-response');
test('signed contracts are locked and public status omits private staff audit details', () => {
  const document = { quoteType: 'pos', acceptancePolicy, title: 'Saved agreement' };
  const version = documentHash(document);
  const row = { document, clientResponse: { documentHash: version, signature: { signedAt: '2026-11-05' } }, contractState: { documentHash: version, locked: true, status: 'finalized', providerAcceptance: { name: 'Authorized Staff', confirmedAt: '2026-11-05', userId: 42, ipAddress: 'private-ip', userAgent: 'private-agent' } } };
  assert(locked(row));
  assert.deepEqual(publicState(row).providerAcceptance, { name: 'Authorized Staff', confirmedAt: '2026-11-05' });
  assert.equal(publicState(row, true).providerAcceptance.userId, 42);
  assert.equal(locked({ ...row, document: { ...document, title: 'Another draft version' } }), false);
});
test('a signature cannot finalize a snapshot that differs from the accepted version', async () => {
  const document = { quoteType: 'pos', acceptancePolicy, title: 'Accepted agreement' };
  const version = documentHash(document);
  const response = { action: 'accept', documentHash: version, document: { ...document, title: 'Changed snapshot' }, signature: { signedAt: '2026-11-05', documentHash: version } };
  await assert.rejects(recordClientSignature({ document }, response, {}), { statusCode: 409 });
});
test('new policy requires post-sign confirmation and maps pending legacy status without exposing prior staff audit', () => {
  assert.equal(acceptancePolicy.confirmationTiming, 'after_client_signing');
  const document = { quoteType: 'pos', acceptancePolicy };
  assert(usesConfirmation(document));
  assert(usesConfirmation({ ...document, acceptancePolicy: { version: 1 } }));
  const pending = state({ id: 'record', documentHash: documentHash(document), signature: { signedAt: '2026-11-05T01:00:00Z' } });
  assert.equal(pending.status, 'pending_admin_confirmation');
  assert.equal(pending.statusLabel, 'Pending Admin Confirmation');
  const publicValue = publicState({ document, contractState: { ...pending, status: 'signed_pending_confirmation', priorProviderAcceptance: { name: 'Prior Staff', confirmedAt: '2026-11-04', userId: 42, ipAddress: 'private' } } });
  assert.equal(publicValue.status, 'pending_admin_confirmation');
  assert.deepEqual(publicValue.priorProviderAcceptance, { name: 'Prior Staff', confirmedAt: '2026-11-04' });
});
