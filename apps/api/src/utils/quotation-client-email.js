const { recurringChargeText } = require('./quotation-pricing');
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function clientQuotationUrl(shareToken, clientFlow = 'full') {
  if (!/^[a-f0-9]{64}$/.test(shareToken)) throw new Error('Invalid quotation link.');
  const base = new URL(process.env.CLIENT_WEB_URL || (process.env.NODE_ENV === 'production' ? 'https://zerooneitinc.com' : 'http://localhost:3000'));
  if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) throw new Error('Configure a valid CLIENT_WEB_URL for quotation emails.');
  return new URL(`/quotation/${shareToken}${clientFlow === 'quotation_only' ? '' : '?sign=1'}`, base).href;
}

function clientAcceptanceMessage(payload) {
  const acceptedAt = new Date(payload.respondedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });
  const total = new Intl.NumberFormat('en-PH', { style: 'currency', currency: payload.currency }).format(payload.total);
  const link = new URL(payload.clientUrl);
  if (!['https:', 'http:'].includes(link.protocol)) throw new Error('Invalid contract signing URL.');
  const quotationOnly = payload.clientFlow === 'quotation_only';
  const pending = !quotationOnly && payload.signaturePending;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f4f7;font-family:Arial,Helvetica,sans-serif;color:#26293c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border:1px solid #e5e1eb;border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 32px;background:#26293c;color:#fff;"><strong style="font-size:23px;">Zero One IT Inc.</strong></td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 20px;font-size:27px;">Your quotation is accepted</h1>
<p style="font-size:15px;line-height:1.7;">Hello ${escapeHtml(payload.clientName)},<br>Thank you for accepting your quotation. Your verified acceptance has been recorded.</p>
<div style="margin:24px 0;padding:20px;background:#f7f5fa;border:1px solid #e5e1eb;border-radius:10px;font-size:14px;line-height:1.8;">
<strong>${escapeHtml(payload.reference)}</strong><br>${escapeHtml(payload.title)}<br>${payload.hasRecurring ? 'One-time charges' : 'Total'}: <strong>${escapeHtml(total)}</strong>${payload.hasRecurring ? `<br>Subscription: <strong>${escapeHtml(recurringChargeText(payload))}</strong>` : ''}<br>Accepted: ${escapeHtml(acceptedAt)} (Manila time)</div>
${payload.monthlySubscriptionNotice ? `<p style="font-size:14px;line-height:1.7;">${escapeHtml(payload.monthlySubscriptionNotice)}</p>` : ''}
${!quotationOnly && payload.hasRecurring && payload.billingCommencement ? `<p style="font-size:14px;line-height:1.7;">Subscription billing starts: <strong>${escapeHtml(payload.billingCommencement)}</strong><br>One-time setup charges remain separate from recurring subscription charges.</p>` : ''}
<h2 style="font-size:19px;">${quotationOnly ? 'Your contract and payment details will follow' : pending ? 'Sign your contract when you are ready' : 'Your contract has been signed'}</h2>
<p style="font-size:15px;color:#647084;line-height:1.7;">${quotationOnly ? 'You will receive another email from Zero One with your contract, payment details, and terms. No contract signature or payment is requested at this stage.' : pending ? 'You can sign now or return later. Open the link below to review your contract, verify your email, and draw or type your electronic signature. Your quotation remains accepted while the contract is awaiting signature.' : 'Your electronic signature has been recorded. You can view your quotation using the link below.'}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background:#26293c;"><a href="${escapeHtml(link.href)}" style="display:inline-block;padding:16px 24px;font-size:16px;font-weight:700;text-decoration:none;color:#fff;">${pending ? 'Review &amp; Sign Contract' : 'View Quotation'}</a></td></tr></table>
<p style="font-size:12px;line-height:1.7;color:#647084;">This link is valid through ${escapeHtml(payload.validUntil)}, 11:59 PM Manila time, unless revoked. Contact Zero One if you need more time.</p>
<p style="font-size:12px;line-height:1.7;color:#647084;">If the button does not open, copy this address into your browser:<br><a href="${escapeHtml(link.href)}" style="color:#514568;word-break:break-all;">${escapeHtml(link.href)}</a></p>
<p style="margin-top:24px;font-size:13px;color:#647084;">Questions? Contact info@zerooneitinc.com.<br>Zero One Information Technology Inc.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: `Quotation accepted — ${payload.reference}`, body: { contentType: 'HTML', content: html }, toRecipients: [{ emailAddress: { address: payload.clientEmail } }] };
}

function clientSignedMessage(payload) {
  const signedAt = new Date(payload.signedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });
  return { subject: `Signed contract copy — ${payload.reference}`,
    toRecipients: [{ emailAddress: { address: payload.clientEmail } }],
    body: { contentType: 'HTML', content: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#26293c;line-height:1.7"><h1 style="color:#514568">Your contract is signed</h1><p>Hello ${escapeHtml(payload.clientName)},</p><p>Your electronically signed contract for <strong>${escapeHtml(payload.reference)} · ${escapeHtml(payload.title)}</strong> is attached as a PDF for your records.</p><p>Signed: ${escapeHtml(signedAt)} (Manila time)<br>Verified email: ${escapeHtml(payload.clientEmail)}</p>${payload.contractConfirmationPending ? '<p>Your signature has been recorded. ZeroOne confirmation of acceptance and payment verification are recorded separately.</p>' : ''}<h2>Next step: Payment</h2><p>Follow the payment terms in your signed contract and the instructions provided by Zero One. Contact <a href="mailto:billing@zerooneitinc.com">billing@zerooneitinc.com</a> for payment assistance.</p><p>Your quotation remains accepted. Billing and sales also receive a signed contract copy.</p><p>Zero One Information Technology Inc.</p></div>` } };
}

function clientContractConfirmedMessage(payload) {
  const confirmedAt = new Date(payload.confirmedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });
  return { subject: `Agreement confirmed — ${payload.reference}`,
    toRecipients: [{ emailAddress: { address: payload.clientEmail } }],
    body: { contentType: 'HTML', content: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#26293c;line-height:1.7"><h1>Your agreement is confirmed</h1><p>Hello ${escapeHtml(payload.clientName)},</p><p>Zero One has confirmed your signed agreement for <strong>${escapeHtml(payload.reference)} · ${escapeHtml(payload.title)}</strong>. The finalized PDF is attached for your records.</p><p>Confirmed by: ${escapeHtml(payload.confirmedBy)}<br>Confirmed: ${escapeHtml(confirmedAt)} (Manila time)</p><p>Your original signed agreement is preserved. Any future changes require a separate agreement or addendum.</p><p>Payment verification is recorded separately. Please follow the existing payment instructions and contact <a href="mailto:billing@zerooneitinc.com">billing@zerooneitinc.com</a> for payment assistance.</p><p>Zero One Information Technology Inc.</p></div>` } };
}

module.exports = { clientQuotationUrl, clientAcceptanceMessage, clientSignedMessage, clientContractConfirmedMessage };
