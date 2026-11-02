const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verificationMessage } = require('./quotation-code-email');

test('modern email supports selecting the code without opening another page', () => {
  const message = verificationMessage({ email: 'client@example.com', code: '123456', reference: 'ZO-2026-00001', action: 'accept', expiresAt: '2026-11-09T10:00:00Z' });
  assert.equal(message.body.contentType, 'HTML');
  assert.equal(message.toRecipients[0].emailAddress.address, 'client@example.com');
  assert.equal(message.subject, 'Zero One email verification code');
  assert(message.body.content.includes('Your verification code is 123456.'));
  assert(message.body.content.includes('Your verification code is:'));
  assert(message.body.content.indexOf('123456') < message.body.content.indexOf('ZO-2026-00001'));
  assert(message.body.content.includes('123456'));
  assert(message.body.content.includes('user-select:all'));
  assert(message.body.content.includes('Select the six-digit code'));
  assert(!message.body.content.includes('<script'));
  assert(!message.body.content.includes('href='));
  assert(!message.body.content.includes('/verification-code'));
});

test('email escapes quotation text and distinguishes requote requests', () => {
  const message = verificationMessage({ email: 'client@example.com', code: '654321', reference: '<img onerror="bad">', action: 'requote', expiresAt: '2026-11-09T10:00:00Z' });
  assert(!message.body.content.includes('<img onerror'));
  assert(message.body.content.includes('&lt;img'));
  assert(message.body.content.includes('request a revised quotation'));
  assert.throws(() => verificationMessage({ code: '<bad>' }), /Invalid verification code/);
});

test('email explains request context and safe steps for an unexpected request', () => {
  const message = verificationMessage({ email: 'client@example.com', code: '123456', reference: 'ZO-2026-00001', action: 'accept', requestedAt: '2026-10-25T16:24:00Z', requestIp: '203.0.113.7', expiresAt: '2026-10-25T16:34:00Z' });
  const html = message.body.content;
  assert(html.includes('A request to accept this quotation'));
  assert(html.includes('Oct 26, 2026'));
  assert(html.includes('12:24:00 AM'));
  assert(html.includes('203.0.113.7'));
  assert(html.includes('Do not share this code'));
  assert(html.includes('a response is only recorded after successful verification and confirmation'));
  assert(!html.includes('changing your password'));
});
