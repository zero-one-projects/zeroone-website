function deletionConfirmationMessage(payload) {
  const time = new Date(payload.deletedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'medium' });
  const count = payload.quotations.length;
  return {
    subject: count === 1 ? `Quotation successfully removed: ${payload.quotations[0].reference}` : `${count} quotations successfully removed`,
    toRecipients: [{ emailAddress: { address: 'info@zerooneitinc.com' } }],
    body: { contentType: 'Text', content: [
      'Hello!', '', `${count === 1 ? 'The following quotation has' : 'The following quotations have'} been successfully removed after deletion-code verification.`, '',
      ...payload.quotations.map((quote) => `${quote.reference} — ${quote.title}${quote.clientCompany ? ` (Client: ${quote.clientCompany})` : ''}`), '',
      `Removed on: ${time} (Manila time)`,
      `Removed by: ${payload.adminEmail || `Administrator #${payload.adminId}`}`, '',
      'These quotations no longer appear in the active quotation list, and their client links are disabled. Response history is retained internally.', '',
      'If you did not authorize this deletion, contact your Zero One administrator.', '',
      'Regards,', 'Zero One Information Technology Inc.'
    ].join('\n') }
  };
}

module.exports = { deletionConfirmationMessage };
