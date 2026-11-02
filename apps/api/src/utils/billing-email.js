const { renderBillingPdf } = require('./billing-pdf');
const { sendGraphMail } = require('./quotation-verification-mail');
const billingSender = 'billing@zerooneitinc.com';
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function publicBillingUrl(sharePath) {
  if (!sharePath || !process.env.CLIENT_WEB_URL) return null;
  try {
    const base = new URL(process.env.CLIENT_WEB_URL);
    // Local development emails still include the PDF attachment, without an unusable localhost link.
    if (base.protocol !== 'https:' || base.username || base.password || ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) return null;
    if (!/^\/api\/billing\/[a-f0-9]{64}\/pdf$/.test(sharePath)) return null;
    return new URL(sharePath, base).href;
  } catch { return null; }
}
function billingCcRecipients(value = '', recipient = '') {
  const invalid = () => { throw Object.assign(new Error('Enter up to 10 valid CC email addresses, separated by commas or semicolons.'), { statusCode: 400 }); };
  if (typeof value !== 'string' || value.length > 2000) invalid();
  const addresses = value.split(/[,;]/).map(address => address.trim()).filter(Boolean);
  if (addresses.length > 10 || addresses.some(address => address.length > 180 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address))) invalid();
  const seen = new Set([recipient.trim().toLowerCase()]);
  return [billingSender, ...addresses].filter(address => {
    const key = address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(address => ({ emailAddress: { address, ...(address === billingSender ? { name: 'ZeroOne Billing' } : {}) } }));
}
async function sendBillingEmail({ bill, recipient, note = '', cc = '' }) {
  const ccRecipients = billingCcRecipients(cc, recipient);
  const d = bill.document;
  const clientUrl = publicBillingUrl(bill.sharePath);
  const amount = new Intl.NumberFormat('en-PH', { style: 'currency', currency: d.currency || 'PHP' }).format(d.amountDue ?? d.total);
  const pdf = await renderBillingPdf(bill);
  const message = {
    subject: `Billing Statement ${bill.reference} — ${d.title}`,
    from: { emailAddress: { address: billingSender, name: 'ZeroOne Billing' } },
    replyTo: [{ emailAddress: { address: billingSender, name: 'ZeroOne Billing' } }],
    toRecipients: [{ emailAddress: { address: recipient, name: d.clientName } }],
    ccRecipients,
    body: { contentType: 'HTML', content: `<!doctype html><html><body style="margin:0;background:#f7f7fe;font-family:Arial,Helvetica,sans-serif;color:#141c2d"><div style="max-width:600px;margin:24px auto;background:white;padding:32px;border-top:4px solid #4935dd"><p style="color:#4935dd;font-weight:bold">ZeroOne IT Inc. · Billing</p><h1 style="font-size:28px">Billing Statement</h1><p>Hello ${escapeHtml(d.clientName)},</p><p>Please find your billing statement <strong>${escapeHtml(bill.reference)}</strong> for ${escapeHtml(d.title)} attached as a PDF.</p><div style="background:#eeeafe;padding:20px;border-radius:8px"><p style="margin:0;color:#4935dd">Amount due</p><p style="font-size:28px;font-weight:bold;margin:10px 0">${escapeHtml(amount)}</p><p style="margin:0">Payment due: ${escapeHtml(d.dueOn)}</p></div>${note ? `<p style="white-space:pre-wrap">${escapeHtml(note)}</p>` : ''}${clientUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(clientUrl)}" style="background:#4935dd;color:white;padding:12px 20px;text-decoration:none;border-radius:6px">View Billing PDF</a></p>` : ''}${d.advancePayment > 0 ? `<p>Advance payment / deduction applied: ${escapeHtml(new Intl.NumberFormat('en-PH', { style: 'currency', currency: d.currency || 'PHP' }).format(d.advancePayment))}</p>` : ''}<p>Payment instructions are included in your statement. Please reply to this email with payment confirmation or any billing questions.</p><p>Thank you,<br><strong>ZeroOne Billing</strong><br><a href="mailto:${billingSender}">${billingSender}</a></p><p style="font-size:12px;color:#72788b">This statement is not proof of payment.</p></div></body></html>` },
    attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: `${bill.reference}.pdf`, contentType: 'application/pdf', contentBytes: pdf.toString('base64') }]
  };
  try {
    await sendGraphMail(message, true, { senderEmail: billingSender, errorMessage: 'Unable to send from billing@zerooneitinc.com. Check Mail Config and Microsoft 365 access for the billing mailbox.' });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError' || error instanceof TypeError) {
      throw Object.assign(new Error('The mail service did not confirm the send. Check the billing mailbox Sent Items before sending again.'), { statusCode: 503 });
    }
    throw error;
  }
  return { linkIncluded: Boolean(clientUrl) };
}
module.exports = { billingSender, publicBillingUrl, sendBillingEmail, billingCcRecipients };
