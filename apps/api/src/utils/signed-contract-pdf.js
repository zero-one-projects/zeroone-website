const PDFDocument = require('pdfkit');
const path = require('path');
const { contractBlocks } = require('./contract-formatting');
const { posContractRows } = require('./pos-contract-summary');
const companyIdentity = require('../../../web/src/content/companyIdentity.json');

function renderDefaultSignedContractPdf({ document, signature, reference, signaturePageOnly = false, template = false, providerAcceptance }) {
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
      const provider = document.providerProfile || companyIdentity;
      const effectiveDate = require('./contract-autofill').agreementDate(document, signature);
      text(signaturePageOnly ? 'ELECTRONIC SIGNATURE & ACCEPTANCE' : document.quoteType === 'pos' && document.posPurpose === 'upgrade' ? 'POS SUBSCRIPTION UPGRADE ADDENDUM' : document.quoteType === 'pos' && document.posPurpose === 'customization' ? 'POS ONE-TIME CUSTOMIZATION AGREEMENT' : document.quoteType === 'pos' ? 'POS SYSTEM SUBSCRIPTION & SERVICE AGREEMENT' : document.quoteType === 'sync_court' ? 'SYNC COURT SUBSCRIPTION & SERVICE AGREEMENT' : document.quoteType === 'subscription' ? 'SUBSCRIPTION & SERVICE AGREEMENT' : 'PROJECT SERVICE AGREEMENT', { size: 16, color: '#514568', bold: true });
      pdf.moveDown(.7);
      if (!template) {
        text(`Quotation reference: ${reference}`, { size: 9 });
        text(`Project / package: ${document.title}`, { size: 10, bold: true });
      }
      text(`Agreement date: ${document.contractDetails?.agreementDateRule === 'signing' ? effectiveDate : details.agreementDate || (template ? 'To be completed' : new Date(signature.signedAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long' }))}`, { size: 9 });
      pdf.moveDown();
      if (signaturePageOnly) {
        text(`Contract PDF: ${document.contractPdf.fileName}`, { size: 10, bold: true });
        text(`PDF SHA-256: ${document.contractPdf.sha256}`, { size: 8 });
        text('This signature page records acceptance of the PDF contract preceding it and its linked quotation.', { size: 10 });
        if (document.monthlySubscription?.notice) text(document.monthlySubscription.notice.replaceAll('₱', 'PHP '));
      } else {
      text(details.agreementIntroduction || 'This agreement is entered into by and between:', { size: 10 }); pdf.moveDown(.5);
      text('PROVIDER', { size: 9, color: '#514568', bold: true });
      text(provider.name, { bold: true });
      text(provider.address);
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
      if (document.posUpgradeTerms) {
        room(90); text(require('./pos-upgrade').title, { size: 12, bold: true, color: '#514568' });
        text(document.posUpgradeTerms); pdf.moveDown();
      }
      if (document.acceptancePolicy) {
        room(100); text(document.acceptancePolicy.title, { size: 12, bold: true, color: '#514568' });
        text(document.acceptancePolicy.terms); pdf.moveDown();
        if (providerAcceptance) text(`ZeroOne confirmed acceptance: ${providerAcceptance.name} · ${providerAcceptance.confirmedAt}`, { size: 9 });
        else text('Agreement status: Pending Admin Confirmation.', { size: 9 });
        text('Payment verification is recorded separately from contract acceptance.', { size: 9 });
      }
      if (document.quoteType === 'pos' && document.posPurpose) {
        text(`Quotation purpose: ${document.posPurpose === 'upgrade' ? 'Existing POS Subscription Upgrade' : document.posPurpose === 'customization' ? 'Additional One-Time Customization Only' : 'POS Subscription'}`, { size: 10, bold: true });
        if (document.baseQuotationId) text(`Original subscription: ${document.baseQuotationReference || 'Linked signed POS agreement'}`);
        if (document.posPurpose === 'upgrade') text(`Agreed upgrade effective date: ${details.effectiveDate}`);
        if (document.posPurpose === 'customization') text('This quotation covers one-time customization only and does not change the existing recurring subscription rate.');
      }
      if (document.quoteType === 'pos') {
        room(90); pdf.moveDown();
        text('POS SUBSCRIPTION ORDER FORM & PAYMENT AGREEMENT', { size: 13, bold: true, color: '#514568' }); pdf.moveDown(.5);
        const labelWidth = width * .46;
        const drawRow = (label, value, header = false) => {
          pdf.font(header ? boldFont : baseFont).fontSize(textSize(9));
          const height = Math.max(pdf.heightOfString(label, { width: labelWidth - 16 }), pdf.heightOfString(value || ' ', { width: width - labelWidth - 16 })) + 16;
          room(height);
          const y = pdf.y;
          if (header) pdf.rect(46, y, width, height).fill('#eeebf3');
          pdf.strokeColor('#d4cbe1').lineWidth(.5).rect(46, y, width, height).stroke();
          pdf.moveTo(46 + labelWidth, y).lineTo(46 + labelWidth, y + height).stroke();
          pdf.fillColor('#202027').text(label, 54, y + 8, { width: labelWidth - 16 });
          pdf.text(value || ' ', 54 + labelWidth, y + 8, { width: width - labelWidth - 16 });
          pdf.x = 46; pdf.y = y + height;
        };
        drawRow('Particulars', 'Details', true);
        for (const [label, value] of posContractRows(document, reference, template)) {
          // Keep long approved feature lists readable across pages.
          const lines = value.split('\n');
          for (let index = 0; index < lines.length; index += 1) drawRow(index ? `${label} (continued)` : label, lines[index]);
        }
        pdf.moveDown(.5);
        if (!template) text('Setup and additional feature fees are before quotation-level discounts and tax. The subscription fee includes any quoted recurring tax. See the approved quotation for the total one-time charges.', { size: 8 });
      }
      if (document.items?.some(item => item.chargeType === 'hardware') && details.hardwareTerms) {
        room(100); text('HARDWARE PROCUREMENT AND PAYMENT TERMS', { size: 12, bold: true, color: '#514568' });
        text(details.hardwareTerms); pdf.moveDown();
      }
      room(350); pdf.moveDown();
      text('SERVICE PROVIDER', { size: 12, bold: true, color: '#514568' });
      text(provider.name); text(provider.address); pdf.moveDown();
      text('CLIENT ACCEPTANCE', { size: 12, bold: true, color: '#514568' }); pdf.moveDown(.5);
      text(signature.consentText || (template ? 'By signing below, I confirm that I am authorized to enter into this agreement on behalf of the client and agree to the agreement terms, payment obligations, and conditions stated above.' : 'The client has reviewed and electronically signed this agreement.'), { size: 9 }); pdf.moveDown();
      const top = pdf.y;
      const boxWidth = width;
      const card = (x) => {
        pdf.font('Helvetica').fontSize(textSize(9)).fillColor('#202027').text(`Client / Business: ${document.clientName || ''}`, x, top, { width: boxWidth });
        pdf.text(`Authorized Representative: ${signature.signerName || details.authorizedRepresentative || ''}`, x, top + 25, { width: boxWidth });
        pdf.text(`Position / Title: ${details.clientPosition || ''}`, x, top + 50, { width: boxWidth });
        pdf.text('Electronic Signature', x, top + 75, { width: boxWidth });
        if (signature.type === 'typed') pdf.font('Times-Italic').fontSize(textSize(22)).text(signature.typedName, x, top + 100, { width: boxWidth });
        if (signature.type === 'drawn') {
          pdf.save().strokeColor('#26293c').lineWidth(1.4).lineCap('round');
          for (const stroke of signature.strokes || []) { stroke.forEach(([px, py], i) => i ? pdf.lineTo(x + px * boxWidth, top + 90 + py * 65) : pdf.moveTo(x + px * boxWidth, top + 90 + py * 65)); pdf.stroke(); }
          pdf.restore();
        }
        pdf.moveTo(x, top + 165).lineTo(x + boxWidth, top + 165).strokeColor('#bbbbbb').lineWidth(.5).stroke();
        pdf.font('Helvetica').fontSize(textSize(8)).fillColor('#555555').text(!template ? `Date Signed: ${signature.signedAt}` : 'Date Signed: Recorded automatically when signed', x, top + 172, { width: boxWidth });
      };
      card(46);
      pdf.x = 46; pdf.y = top + 200;
      if (!template) {
        text(`Verified email: ${signature.email}`, { size: 8 });
        text(`Document version: ${signature.documentHash}`, { size: 7 });
      }
      // Add unchanged company letterhead/footer after layout so they repeat without affecting text flow.
      const range = pdf.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        pdf.switchToPage(i);
        pdf.font('Helvetica-Bold').fontSize(textSize(13)).fillColor('#514568').text(provider.name, 46, 38, { width: 350, lineBreak: false });
        pdf.font('Helvetica').fontSize(textSize(8)).fillColor('#202027').text(provider.address, 46, 59, { lineBreak: false });
        pdf.text(`Contact number: ${provider.phone || companyIdentity.phone}`, 46, 72, { lineBreak: false });
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
  const file = await getContractFile(record.document.contractPdf, true, { transaction: record.transaction });
  const original = await UploadedPDF.load(await require('./contract-autofill').fillContractPdf(file.data, record.document, record.signature), { updateMetadata: false });
  if (record.document.quoteType === 'pos') {
    const annex = await require('./pos-signature-annex').renderPosSignatureAnnex(record, { ...original.getPage(0).getSize(), pageOffset: original.getPageCount() });
    await require('./pos-contract-pdf-layout').appendMatchingPages(original, await UploadedPDF.load(annex));
  } else {
    const signaturePage = await UploadedPDF.load(await renderDefaultSignedContractPdf({ ...record, signaturePageOnly: true }));
    const pages = await original.copyPages(signaturePage, signaturePage.getPageIndices());
    pages.forEach((page) => original.addPage(page));
  }
  original.setTitle(`Signed contract ${record.reference}`);
  return Buffer.from(await original.save());
}
function renderSignedContractPdf(record) {
  if (record.recordId) return require('./contract-acceptance').recordedPdf(record.recordId, record.signature?.documentHash || record.documentHash, record.copy);
  if (record.document?.contractSource === 'pdf') return signUploadedContract(record);
  return renderDefaultSignedContractPdf(record);
}
async function renderContractReviewPdf({ document, bytes, providerAcceptance, reference }) {
  const filled = await require('./contract-autofill').fillContractPdf(bytes, document);
  if (!document.acceptancePolicy) return filled;
  const { PDFDocument: UploadedPDF } = require('pdf-lib');
  const original = await UploadedPDF.load(filled, { updateMetadata: false });
  const pos = document.quoteType === 'pos';
  const { style, registerFonts, bodyLineGap, drawLetterhead, appendMatchingPages } = require('./pos-contract-pdf-layout');
  const firstPage = original.getPage(0);
  const supplement = await new Promise((resolve, reject) => {
    const pdf = new PDFDocument(pos ? { size: [firstPage.getWidth(), firstPage.getHeight()], margins: { top: 112, bottom: 72, left: style.left, right: style.right }, bufferPages: true } : { size: 'A4', margin: 46 }); const chunks = [];
    pdf.on('data', chunk => chunks.push(chunk)); pdf.on('error', reject); pdf.on('end', () => resolve(Buffer.concat(chunks)));
    const provider = document.providerProfile || companyIdentity;
    if (pos) {
      registerFonts(pdf);
      pdf.font('ContractBold').fontSize(style.titleSize).fillColor(style.headingColor).text(document.acceptancePolicy.title.toUpperCase(), { align: 'center' });
      pdf.moveDown(1.2);
      pdf.font('ContractBody').fontSize(style.bodySize).fillColor('#000000');
      if (reference) { pdf.text(`Quotation: ${reference}`, { lineGap: bodyLineGap(pdf) }); pdf.moveDown(); }
      pdf.text(document.acceptancePolicy.terms, { lineGap: bodyLineGap(pdf) }); pdf.moveDown();
      pdf.text(providerAcceptance ? `ZeroOne confirmed acceptance: ${providerAcceptance.name} · ${providerAcceptance.confirmedAt}` : 'Agreement status: Pending Admin Confirmation.', { lineGap: bodyLineGap(pdf) });
      drawLetterhead(pdf, provider, original.getPageCount());
      pdf.end(); return;
    }
    pdf.font('Helvetica-Bold').fontSize(15).text(provider.name); pdf.font('Helvetica').fontSize(10).text(provider.address); pdf.moveDown(2);
    pdf.font('Helvetica-Bold').fontSize(16).text(document.acceptancePolicy.title); pdf.moveDown();
    if (reference) { pdf.font('Helvetica').fontSize(10).text(`Quotation: ${reference}`); pdf.moveDown(); }
    pdf.font('Helvetica').fontSize(11).text(document.acceptancePolicy.terms, { lineGap: 5 }); pdf.moveDown();
    pdf.text(providerAcceptance ? `ZeroOne confirmed acceptance: ${providerAcceptance.name} · ${providerAcceptance.confirmedAt}` : 'Agreement status: Pending Admin Confirmation.', { lineGap: 4 });
    pdf.end();
  });
  const addition = await UploadedPDF.load(supplement);
  if (pos) await appendMatchingPages(original, addition);
  else for (const page of await original.copyPages(addition, addition.getPageIndices())) original.addPage(page);
  return Buffer.from(await original.save());
}
module.exports = { renderSignedContractPdf, renderContractReviewPdf, renderDefaultContractPdf: (document) => renderDefaultSignedContractPdf({ document, template: true }) };
