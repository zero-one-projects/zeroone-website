const PDFDocument = require('pdfkit');
const { posContractRows } = require('./pos-contract-summary');
const { style, registerFonts, bodyLineGap, drawLetterhead } = require('./pos-contract-pdf-layout');
const companyIdentity = require('../../../web/src/content/companyIdentity.json');

function renderPosSignatureAnnex({ document, signature, reference, providerAcceptance }, { width, height, pageOffset }) {
  if (!signature?.signedAt || !signature.email) throw new Error('A recorded contract signature is required.');
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: [width, height], margins: { top: 112, bottom: 72, left: style.left, right: style.right }, bufferPages: true,
      info: { Title: `Signed contract ${reference}`, Author: companyIdentity.name } });
    const chunks = [];
    pdf.on('data', chunk => chunks.push(chunk)); pdf.on('error', reject); pdf.on('end', () => resolve(Buffer.concat(chunks)));
    try {
      registerFonts(pdf);
      const provider = document.providerProfile || companyIdentity;
      const details = document.contractDetails || {};
      const contentWidth = width - style.left - style.right;
      const bottom = () => pdf.page.height - pdf.page.margins.bottom;
      const room = needed => { if (pdf.y + needed > bottom()) pdf.addPage(); };
      const body = (value, { size = style.bodySize, bold = false } = {}) => {
        pdf.font(bold ? 'ContractBold' : 'ContractBody').fontSize(size).fillColor('#000000');
        pdf.text(String(value || ''), style.left, pdf.y, { width: contentWidth, lineGap: bodyLineGap(pdf), features: { liga: false, clig: false, calt: false } });
      };
      const heading = (value, title = false) => {
        room(60);
        pdf.font('ContractBold').fontSize(title ? style.titleSize : style.headingSize).fillColor(style.headingColor)
          .text(value, style.left, pdf.y, { width: contentWidth, align: title ? 'center' : 'left' });
        pdf.moveDown(.5);
      };
      const paragraph = (value, options) => { body(value, options); pdf.moveDown(.6); };
      const clause = (title, value) => { heading(title); paragraph(value); };
      heading('ELECTRONIC SIGNATURE & ACCEPTANCE', true);
      body(`Quotation reference: ${reference}`);
      body(`Project / package: ${document.title}`);
      body(`Agreement date: ${require('./contract-autofill').agreementDate(document, signature)}`);
      body(`Contract PDF: ${document.contractPdf.fileName}`);
      paragraph('This signature page records acceptance of the PDF contract preceding it and its linked quotation.');
      if (document.monthlySubscription?.notice) paragraph(document.monthlySubscription.notice.replaceAll('₱', 'PHP '));
      if (document.posUpgradeTerms) clause(require('./pos-upgrade').title, document.posUpgradeTerms);
      if (document.acceptancePolicy) {
        clause(document.acceptancePolicy.title, document.acceptancePolicy.terms);
        body(providerAcceptance ? `ZeroOne confirmed acceptance: ${providerAcceptance.name} · ${providerAcceptance.confirmedAt}` : 'Agreement status: Pending Admin Confirmation.');
        paragraph('Payment verification is recorded separately from contract acceptance.');
      }
      if (document.posPurpose) {
        body(`Quotation purpose: ${document.posPurpose === 'upgrade' ? 'Existing POS Subscription Upgrade' : document.posPurpose === 'customization' ? 'Additional One-Time Customization Only' : 'POS Subscription'}`);
        if (document.baseQuotationId) body(`Original subscription: ${document.baseQuotationReference || 'Linked signed POS agreement'}`);
        if (document.posPurpose === 'upgrade') body(`Agreed upgrade effective date: ${details.effectiveDate}`);
        if (document.posPurpose === 'customization') body('This quotation covers one-time customization only and does not change the existing recurring subscription rate.');
        pdf.moveDown(.6);
      }
      heading('POS SUBSCRIPTION ORDER FORM & PAYMENT AGREEMENT');
      const labelWidth = contentWidth * .46;
      function wrap(value, available) {
        pdf.font('ContractBody').fontSize(style.bodySize);
        const lines = [];
        for (const paragraph of String(value || ' ').split('\n')) {
          let line = '';
          for (const word of paragraph.split(/\s+/)) {
            if (line && pdf.widthOfString(`${line} ${word}`) > available) { lines.push(line); line = ''; }
            // Long references must also stay inside the details column.
            for (const char of word) {
              if (line && pdf.widthOfString(line + char) > available) { lines.push(line); line = ''; }
              line += char;
            }
            line += ' ';
          }
          lines.push(line.trimEnd());
        }
        return lines;
      }
      function row(label, value, header = false) {
        const labels = wrap(label, labelWidth - 16);
        const values = wrap(value, contentWidth - labelWidth - 16);
        while (values.length) {
          room(Math.max(labels.length, 1) * style.lineHeight + 16);
          const count = Math.max(1, Math.floor((bottom() - pdf.y - 16) / style.lineHeight));
          const part = values.splice(0, count);
          const rowHeight = Math.max(labels.length, part.length) * style.lineHeight + 16;
          const y = pdf.y;
          if (header) pdf.rect(style.left, y, contentWidth, rowHeight).fill('#edf3fa');
          pdf.rect(style.left, y, contentWidth, rowHeight).strokeColor('#b8c6d6').lineWidth(.5).stroke();
          pdf.moveTo(style.left + labelWidth, y).lineTo(style.left + labelWidth, y + rowHeight).stroke();
          pdf.font(header ? 'ContractBold' : 'ContractBody').fontSize(style.bodySize).fillColor('#000000');
          for (const [lines, x] of [[labels, style.left + 8], [part, style.left + labelWidth + 8]]) for (let index = 0; index < lines.length; index += 1) pdf.text(lines[index], x, y + 8 + index * style.lineHeight, { lineBreak: false });
          pdf.x = style.left; pdf.y = y + rowHeight;
          if (values.length) pdf.addPage();
        }
      }
      row('Particulars', 'Details', true);
      for (const [label, value] of posContractRows(document, reference)) row(label, value);
      pdf.moveDown(.6);
      paragraph('Setup and additional feature fees are before quotation-level discounts and tax. The subscription fee includes any quoted recurring tax. See the approved quotation for the total one-time charges.', { size: 9.12 });
      if (document.items?.some(item => item.chargeType === 'hardware') && details.hardwareTerms) clause('HARDWARE PROCUREMENT AND PAYMENT TERMS', details.hardwareTerms);

      // Keep the complete client signature on one page after variable-length terms.
      pdf.font('ContractBody').fontSize(style.bodySize);
      const consent = signature.consentText || 'The client has reviewed and electronically signed this agreement.';
      const name = signature.signerName || details.authorizedRepresentative || '';
      const strings = [provider.name, provider.address, consent, `Client / Business: ${document.clientName || ''}`, `Authorized Representative: ${name}`, `Position / Title: ${details.clientPosition || ''}`];
      const textHeight = strings.reduce((total, value) => total + pdf.heightOfString(value, { width: contentWidth, lineGap: bodyLineGap(pdf) }), 0);
      room(textHeight + 350);
      heading('SERVICE PROVIDER');
      body(provider.name); paragraph(provider.address);
      heading('CLIENT ACCEPTANCE'); paragraph(consent);
      body(`Client / Business: ${document.clientName || ''}`);
      body(`Authorized Representative: ${name}`);
      paragraph(`Position / Title: ${details.clientPosition || ''}`);
      body('Electronic Signature');
      const signatureY = pdf.y + 6;
      if (signature.type === 'typed') {
        let signatureSize = 22;
        pdf.font('Times-Italic').fontSize(signatureSize);
        while (signatureSize > 9 && pdf.heightOfString(signature.typedName, { width: contentWidth - 24 }) > 65) pdf.fontSize(--signatureSize);
        pdf.text(signature.typedName, style.left + 12, signatureY + 6, { width: contentWidth - 24, height: 65 });
      }
      if (signature.type === 'drawn') {
        pdf.save().strokeColor('#26293c').lineWidth(1.4).lineCap('round');
        for (const stroke of signature.strokes || []) {
          stroke.forEach(([x, y], index) => index ? pdf.lineTo(style.left + x * contentWidth, signatureY + y * 65) : pdf.moveTo(style.left + x * contentWidth, signatureY + y * 65));
          pdf.stroke();
        }
        pdf.restore();
      }
      pdf.moveTo(style.left, signatureY + 75).lineTo(width - style.right, signatureY + 75).strokeColor('#9da9b7').lineWidth(.5).stroke();
      pdf.x = style.left; pdf.y = signatureY + 85;
      body(`Date Signed: ${signature.signedAt}`);
      body(`Verified email: ${signature.email}`);
      body(`Document version: ${signature.documentHash}`, { size: 8 });
      body(`PDF SHA-256: ${document.contractPdf.sha256}`, { size: 8 });
      drawLetterhead(pdf, provider, pageOffset);
      pdf.end();
    } catch (error) { pdf.destroy(); reject(error); }
  });
}
module.exports = { renderPosSignatureAnnex };
