const PDFDocument = require('pdfkit');
const path = require('path');
const { contractBlocks } = require('./contract-formatting');

function renderDefaultSignedContractPdf({ document, signature, reference, signaturePageOnly = false, template = false }) {
  if (!document || (!template && (!signature?.signedAt || !signature.email))) throw new Error('A recorded contract signature is required.');
  if (template) signature = {};
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margins: { top: 112, bottom: 65, left: 46, right: 46 }, bufferPages: true,
      info: { Title: template ? 'Default contract template' : `Signed contract ${reference}`, Author: 'Zero One Information Technology Inc.' } });
    const chunks = [];
    pdf.on('data', (chunk) => chunks.push(chunk)); pdf.on('error', reject); pdf.on('end', () => resolve(Buffer.concat(chunks)));
    try {
      const width = pdf.page.width - 92;
      const textSize = (size) => Math.max(1, size - (template ? 1 : 0));
      const baseFont = ['Georgia', 'Times New Roman'].includes(document.contractStyle?.fontFamily) ? 'Times-Roman' : 'Helvetica';
      const boldFont = baseFont === 'Times-Roman' ? 'Times-Bold' : 'Helvetica-Bold';
      const room = (height) => { if (pdf.y + height > pdf.page.height - 65) pdf.addPage(); };
      function text(value, { size = 10, color = '#202027', bold = false } = {}) {
        pdf.font(bold ? boldFont : baseFont).fontSize(textSize(size)).fillColor(color).text(String(value || ''), { width, lineGap: 3 });
      }
      function rich(value, style) {
        for (const line of String(value).split('\n')) {
          pdf.x = 46;
          const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
          parts.forEach((part, index) => {
            const emphasized = part.startsWith('**') && part.endsWith('**');
            pdf.font(style.bold || emphasized ? boldFont : baseFont).fontSize(textSize(style.size)).fillColor(style.color)
              .text(emphasized ? part.slice(2, -2) : part, { width, lineGap: 3, continued: index < parts.length - 1 });
          });
        }
      }
      const details = document.contractDetails || {};
      text(signaturePageOnly ? 'ELECTRONIC SIGNATURE & ACCEPTANCE' : document.quoteType === 'pos' ? 'POS SYSTEM SUBSCRIPTION & SERVICE AGREEMENT' : document.quoteType === 'sync_court' ? 'SYNC COURT SUBSCRIPTION & SERVICE AGREEMENT' : document.quoteType === 'subscription' ? 'SUBSCRIPTION & SERVICE AGREEMENT' : 'PROJECT SERVICE AGREEMENT', { size: 16, color: '#514568', bold: true });
      pdf.moveDown(.7);
      if (!template) {
        text(`Quotation reference: ${reference}`, { size: 9 });
        text(`Project / package: ${document.title}`, { size: 10, bold: true });
      }
      text(`Agreement date: ${details.agreementDate || (template ? 'To be completed' : new Date(signature.signedAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long' }))}`, { size: 9 });
      pdf.moveDown();
      if (signaturePageOnly) {
        text(`Contract PDF: ${document.contractPdf.fileName}`, { size: 10, bold: true });
        text(`PDF SHA-256: ${document.contractPdf.sha256}`, { size: 8 });
        text('This signature page records acceptance of the PDF contract preceding it and its linked quotation.', { size: 10 });
        if (document.monthlySubscription?.notice) text(document.monthlySubscription.notice.replaceAll('₱', 'PHP '));
      } else {
      text('This agreement is entered into by and between:', { size: 10 }); pdf.moveDown(.5);
      text('PROVIDER', { size: 9, color: '#514568', bold: true });
      text('Zero One Information Technology Inc.', { bold: true });
      text('Zone 12, Alta Tierra, Tiguma, Pagadian City, Philippines');
      text('Referred to in this agreement as the Provider.', { size: 9 }); pdf.moveDown(.7);
      text('CLIENT', { size: 9, color: '#514568', bold: true });
      text(document.clientName, { bold: true }); text(document.clientAddress);
      text('Referred to in this agreement as the Client.', { size: 9 }); pdf.moveDown(.7);
      text('Collectively referred to as the Parties.'); pdf.moveDown();
      contractBlocks(signature.contractText || document.contractText).forEach((block, index) => {
        const saved = document.contractStyle?.blocks?.find((entry) => entry.index === index && entry.text === block.text);
        const style = { size: saved?.fontSize || (block.heading ? 13 : 11), color: saved?.color || (block.heading ? '#514568' : '#202027'), bold: saved?.bold ?? block.heading };
        if (block.heading) { room(85); pdf.moveDown(.5); }
        rich(block.text, style); pdf.moveDown(block.heading ? .6 : .7);
      });
      // Subscription/POS records retain their accepted commercial details as part of the signed copy.
      if (!template && (['subscription', 'pos', 'sync_court'].includes(document.quoteType))) {
        room(150); text('ACCEPTED COMMERCIAL TERMS', { size: 12, bold: true, color: '#514568' }); pdf.moveDown(.5);
        const money = (amount) => `${document.currency} ${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
        text(`One-time charges: ${money(document.total)}`);
        if (document.monthlySubscription?.notice) text(document.monthlySubscription.notice.replaceAll('₱', 'PHP '));
        if (document.hasRecurring) text(`Subscription: ${money(document.recurringTotal)} / ${document.billingPeriod === 'yearly' ? 'year' : 'month'}`);
        for (const [label, value] of [['Billing commencement', details.billingCommencement], ['Payment terms', details.paymentTerms || document.notes], ['Initial billing', details.initialBillingTerms], ['Commitment', details.minimumPeriod], ['Termination terms', details.terminationTerms]]) if (value) text(`${label}: ${value}`);
      }
      }
      room(330); pdf.moveDown(); text('ACCEPTANCE & SIGNATURES', { size: 12, bold: true, color: '#514568' }); pdf.moveDown(.5);
      text(signature.consentText || (template ? 'By signing below, the Parties confirm their agreement to these terms.' : 'The client has reviewed and electronically signed this agreement.'), { size: 9 }); pdf.moveDown();
      const top = pdf.y;
      const boxWidth = (width - 24) / 2;
      const card = (x, client) => {
        pdf.font('Helvetica-Bold').fontSize(textSize(9)).fillColor('#514568').text(client ? 'FOR THE CLIENT' : 'FOR THE PROVIDER', x, top, { width: boxWidth });
        pdf.font('Helvetica').fontSize(textSize(9)).fillColor('#202027').text(client ? document.clientName : 'Zero One Information Technology Inc.', x, top + 20, { width: boxWidth });
        pdf.text(client ? signature.signerName || details.authorizedRepresentative || '' : details.providerRepresentative || 'Authorized representative', x, top + 50, { width: boxWidth });
        pdf.text(client ? details.clientPosition || '' : details.providerPosition || '', x, top + 70, { width: boxWidth });
        if (client && signature.type === 'typed') pdf.font('Times-Italic').fontSize(textSize(22)).text(signature.typedName, x, top + 100, { width: boxWidth });
        if (client && signature.type === 'drawn') {
          pdf.save().strokeColor('#26293c').lineWidth(1.4).lineCap('round');
          for (const stroke of signature.strokes || []) { stroke.forEach(([px, py], i) => i ? pdf.lineTo(x + px * boxWidth, top + 90 + py * 65) : pdf.moveTo(x + px * boxWidth, top + 90 + py * 65)); pdf.stroke(); }
          pdf.restore();
        }
        pdf.moveTo(x, top + 165).lineTo(x + boxWidth, top + 165).strokeColor('#bbbbbb').lineWidth(.5).stroke();
        pdf.font('Helvetica').fontSize(textSize(8)).fillColor('#555555').text(client && !template ? `Signed: ${signature.signedAt}` : 'Signature / Date', x, top + 172, { width: boxWidth });
      };
      card(46, false); card(46 + boxWidth + 24, true);
      pdf.x = 46; pdf.y = top + 200;
      if (!template) {
        text(`Verified email: ${signature.email}`, { size: 8 });
        text(`Document version: ${signature.documentHash}`, { size: 7 });
      }
      // Add unchanged company letterhead/footer after layout so they repeat without affecting text flow.
      const range = pdf.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        pdf.switchToPage(i);
        pdf.font('Helvetica-Bold').fontSize(textSize(13)).fillColor('#514568').text('Zero One Information Technology Inc.', 46, 38, { width: 350, lineBreak: false });
        pdf.font('Helvetica').fontSize(textSize(8)).fillColor('#202027').text('Zone 12, Alta Tierra, Tiguma, Pagadian City, Philippines', 46, 59, { lineBreak: false });
        pdf.text('Contact number: 0919-079-7137', 46, 72, { lineBreak: false });
        pdf.image(path.resolve(__dirname, '../assets/contract-logo.png'), pdf.page.width - 139, 38, { fit: [93, 42] });
        pdf.moveTo(46, 94).lineTo(pdf.page.width - 46, 94).strokeColor('#75618e').lineWidth(1).stroke();
        const footer = pdf.page.height - 50;
        pdf.moveTo(46, footer).lineTo(pdf.page.width - 46, footer).strokeColor('#999999').lineWidth(.5).stroke();
        pdf.font('Helvetica').fontSize(textSize(7)).fillColor('#514568').text('zerooneitinc.com', 46, footer + 9, { lineBreak: false });
        pdf.text('info@zerooneitinc.com', 224, footer + 9, { lineBreak: false });
        pdf.text('facebook.com/zeroone.it.inc', 417, footer + 9, { lineBreak: false });
        pdf.fillColor('#202027').text(String(i + 1), pdf.page.width / 2, pdf.page.height - 23, { lineBreak: false });
      }
      pdf.end();
    } catch (error) { pdf.destroy(); reject(error); }
  });
}
async function signUploadedContract(record) {
  const { PDFDocument: UploadedPDF } = require('pdf-lib');
  const { getContractFile } = require('./contract-files');
  const file = await getContractFile(record.document.contractPdf, true);
  const original = await UploadedPDF.load(file.data, { updateMetadata: false });
  const signaturePage = await UploadedPDF.load(await renderDefaultSignedContractPdf({ ...record, signaturePageOnly: true }));
  const pages = await original.copyPages(signaturePage, signaturePage.getPageIndices());
  pages.forEach((page) => original.addPage(page));
  original.setTitle(`Signed contract ${record.reference}`);
  return Buffer.from(await original.save());
}
function renderSignedContractPdf(record) {
  if (record.document?.contractSource === 'pdf') return signUploadedContract(record);
  return renderDefaultSignedContractPdf(record);
}
module.exports = { renderSignedContractPdf, renderDefaultContractPdf: (document) => renderDefaultSignedContractPdf({ document, template: true }) };
