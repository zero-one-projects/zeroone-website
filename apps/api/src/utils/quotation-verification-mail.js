const { MailConfig } = require('../models');
const { verificationMessage } = require('./quotation-code-email');
const { deletionConfirmationMessage } = require('./quotation-deletion-email');
const { clientAcceptanceMessage, clientSignedMessage } = require('./quotation-client-email');
const { recurringChargeText } = require('./quotation-pricing');

async function sendGraphMail(message, saveToSentItems = false, options = {}) {
  const stored = await MailConfig.findOne({ order: [['id', 'ASC']] });
  const tenantId = stored?.tenantId || process.env.MS_TENANT_ID;
  const clientId = stored?.clientId || process.env.MS_CLIENT_ID;
  const clientSecret = stored?.clientSecret || process.env.MS_CLIENT_SECRET;
  const sender = options.senderEmail || stored?.senderEmail || process.env.MS_SENDER_EMAIL;
  if (!tenantId || !clientId || !clientSecret || !sender) {
    const error = new Error(options.errorMessage || 'Client email verification is not available yet. Please contact Zero One.');
    error.statusCode = 503;
    throw error;
  }
  const auth = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(15000)
  });
  if (!auth.ok) throw Object.assign(new Error(options.errorMessage || 'Unable to send a verification code. Please try again later.'), { statusCode: 503 });
  const authPayload = await auth.json();
  const result = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST', headers: { Authorization: `Bearer ${authPayload.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems }), signal: AbortSignal.timeout(15000)
  });
  if (!result.ok) throw Object.assign(new Error(options.errorMessage || 'Unable to send a verification code. Please try again later.'), { statusCode: 503 });
}

async function sendQuotationCode(payload) {
  return sendGraphMail(verificationMessage(payload));
}

function acceptanceMessage(payload) {
  const timestamp = payload.respondedAt || payload.acceptedAt;
  const acceptedAt = new Date(timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });
  const total = new Intl.NumberFormat('en-PH', { style: 'currency', currency: payload.currency }).format(payload.total);
  return {
    subject: `${payload.action === 'signed' ? 'Contract signed' : 'Quotation accepted'}: ${payload.reference}`,
    body: { contentType: 'Text', content: [
      payload.action === 'signed' ? 'A client has electronically signed the contract for an accepted quotation.' : 'A client has accepted a Zero One quotation after verifying their email address.', '',
      `Quotation: ${payload.reference}`, `Project: ${payload.title}`,
      `Client / company: ${payload.clientCompany}`, `Confirmed by: ${payload.clientName}`,
      `Verified client email: ${payload.clientEmail}`, `${payload.hasRecurring ? 'Accepted one-time charges' : 'Accepted total'}: ${total}`,
      ...(payload.hasRecurring ? [`Recurring subscription: ${recurringChargeText(payload)}`] : []),
      ...(payload.monthlySubscriptionNotice ? [payload.monthlySubscriptionNotice] : []),
      ...(payload.hasRecurring && payload.billingCommencement ? [`Subscription billing starts: ${payload.billingCommencement}`] : []),
      `Accepted on: ${acceptedAt} (Asia/Manila)`, `Acceptance timestamp: ${timestamp}`,
      `Quotation valid until: ${payload.validUntil}`, `Accepted document version: ${payload.documentVersion}`,
      ...(payload.signedAt ? [`Agreement electronically signed by: ${payload.clientName}`, `Signed at: ${payload.signedAt}`, 'The signature and agreed contract terms are saved in the quotation response history.'] : []),
      ...(payload.signaturePending ? ['Contract status: Pending signature. The client may sign now or return later using the quotation link.'] : []),
      ...(payload.note ? ['', 'Client message:', payload.note] : []), '',
      'The acceptance is recorded in Admin → Quotation List. This confirmation refers to the quotation version reviewed by the client.'
    ].join('\n') },
    toRecipients: ['billing@zerooneitinc.com', 'sales@zerooneitinc.com'].map((address) => ({ emailAddress: { address } })),
    replyTo: [{ emailAddress: { address: payload.clientEmail, name: payload.clientName } }]
  };
}

async function sendAcceptanceConfirmation(payload) {
  return sendGraphMail(acceptanceMessage(payload), true);
}

function requoteMessage(payload) {
  const timestamp = payload.respondedAt;
  const requestedAt = new Date(timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });
  const total = new Intl.NumberFormat('en-PH', { style: 'currency', currency: payload.currency }).format(payload.total);
  return {
    subject: `Requote requested: ${payload.reference}`,
    body: { contentType: 'Text', content: [
      'A client has requested a revised Zero One quotation after verifying their email address.', '',
      `Quotation: ${payload.reference}`, `Project: ${payload.title}`,
      `Client / company: ${payload.clientCompany}`, `Requested by: ${payload.clientName}`,
      `Verified client email: ${payload.clientEmail}`, `${payload.hasRecurring ? 'Current one-time charges' : 'Current quotation total'}: ${total}`,
      ...(payload.hasRecurring ? [`Recurring subscription: ${recurringChargeText(payload)}`] : []),
      ...(payload.monthlySubscriptionNotice ? [payload.monthlySubscriptionNotice] : []),
      ...(payload.hasRecurring && payload.billingCommencement ? [`Subscription billing starts: ${payload.billingCommencement}`] : []),
      `Requested on: ${requestedAt} (Asia/Manila)`, `Request timestamp: ${timestamp}`,
      `Reviewed document version: ${payload.documentVersion}`, '', 'Requested changes:', payload.note, '',
      'Review this request in Admin → Quotation List and prepare a revised quotation.'
    ].join('\n') },
    toRecipients: [{ emailAddress: { address: 'sales@zerooneitinc.com' } }],
    replyTo: [{ emailAddress: { address: payload.clientEmail, name: payload.clientName } }]
  };
}

async function sendQuotationResponseNotification(payload) {
  let message;
  if (payload.action === 'client_accept') message = clientAcceptanceMessage(payload);
  else if (payload.action === 'client_signed') message = clientSignedMessage(payload);
  else if (payload.action === 'delete') message = deletionConfirmationMessage(payload);
  else if (payload.action === 'requote') message = requoteMessage(payload);
  else if (!payload.action || ['accept', 'signed'].includes(payload.action)) message = acceptanceMessage(payload);
  else throw new Error('Unknown quotation response notification.');
  if (payload.signedContract) {
    const pdf = await require('./signed-contract-pdf').renderSignedContractPdf(payload.signedContract);
    message.attachments = [{ '@odata.type': '#microsoft.graph.fileAttachment', name: `Signed-Contract-${payload.reference}.pdf`, contentType: 'application/pdf', contentBytes: pdf.toString('base64') }];
  }
  return sendGraphMail(message, true);
}

module.exports = { sendGraphMail, sendQuotationCode, sendAcceptanceConfirmation, sendQuotationResponseNotification, acceptanceMessage, requoteMessage };
