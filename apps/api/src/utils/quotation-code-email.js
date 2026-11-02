function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function verificationMessage({ email, code, reference, action, requestedAt = new Date(), requestIp, expiresAt = new Date(Date.now() + 600000) }) {
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid verification code format.');
  const expiry = new Date(expiresAt);
  const purpose = action === 'payment' ? 'submit proof of payment for your signed contract' : action === 'sign' ? 'sign the contract for this accepted quotation' : action === 'accept' ? 'accept this quotation' : 'request a revised quotation';
  const time = expiry.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
  const requestTime = new Date(requestedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'medium' });
  const requestDetails = `A request to ${purpose} was made using your email address on ${escapeHtml(requestTime)} (Manila time)${requestIp ? ` from IP address <strong>${escapeHtml(requestIp)}</strong>` : ''}.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Your verification code</title></head>
<body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,Helvetica,sans-serif;color:#26293c;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your verification code is ${code}. Use it to verify your email with Zero One.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border:1px solid #e5e1eb;border-radius:20px;overflow:hidden;">
<tr><td style="padding:28px 32px;background:#26293c;background-image:linear-gradient(110deg,#3d374f,#26293c,#181c28);color:#fff;">
<p style="margin:0;font-size:23px;font-weight:700;letter-spacing:-.5px;">Zero One<span style="color:#d6c9e5;"> IT Inc.</span></p><p style="margin:7px 0 0;font-size:11px;letter-spacing:2px;color:#d6c9e5;">CLIENT VERIFICATION</p></td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;letter-spacing:-.7px;">Email verification code</h1>
<p style="margin:0 0 16px;font-size:15px;">Hello!</p>
<p style="margin:0 0 24px;color:#647084;font-size:15px;line-height:1.7;">${requestDetails}<br>Please use the following code to verify your email and continue.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:22px 12px;background:#f4f1f7;border:1px solid #e5dfed;border-radius:12px;">
<p style="margin:0 0 10px;color:#6b617a;font-size:14px;">Your verification code is:</p>
<div style="font-family:Consolas,Menlo,monospace;font-size:40px;font-weight:700;letter-spacing:7px;line-height:1.2;color:#26293c;user-select:all;-webkit-user-select:all;">${code}</div>
</td></tr></table>
<p style="margin:24px 0 0;color:#647084;font-size:15px;line-height:1.7;">Enter this code on the quotation page to ${purpose}. Your response will only be recorded after you confirm it.</p>
<p style="margin:12px 0 0;color:#6b617a;font-size:12px;">Quotation: ${escapeHtml(reference)}</p>
<p style="margin:18px 0 0;text-align:center;color:#7b8190;font-size:12px;line-height:1.6;">Select the six-digit code and choose <strong>Copy</strong>.<br>On mobile, press and hold the code, then tap Copy.</p>
<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #edeaf1;color:#647084;font-size:12px;line-height:1.7;">Valid for up to <strong>10 minutes</strong>, ending earlier if the quotation expires.<br>Expires: ${escapeHtml(time)} (Manila time).</p>
</td></tr><tr><td style="padding:20px 32px;background:#faf9fc;border-top:1px solid #edeaf1;color:#647084;font-size:13px;line-height:1.7;"><strong>If this wasn&rsquo;t you</strong><br>Do not share this code or enter it on anyone else&rsquo;s behalf. You can ignore this email. Requesting a code does not accept or revise the quotation; a response is only recorded after successful verification and confirmation.<br><br>If you receive repeated unexpected requests, contact us at info@zerooneitinc.com.<br><br>Regards,<br>Zero One Information Technology Inc.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: 'Zero One email verification code', body: { contentType: 'HTML', content: html }, toRecipients: [{ emailAddress: { address: email } }] };
}

module.exports = { verificationMessage };
