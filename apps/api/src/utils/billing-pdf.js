const PDFDocument = require('pdfkit');
const path = require('path');
const { isNonVatBilling, nonVatBillingNote, billingPaymentInstructions } = require('./billing');

function renderBillingPdf(bill) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 28, bufferPages: true, info: { Title: bill.reference, Author: 'Zero One Information Technology Inc.' } });
    const chunks = [];
    pdf.on('data', chunk => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    try {
      pdf.registerFont('Body', path.resolve(__dirname, '../assets/fonts/Lato-Regular.ttf'));
      pdf.registerFont('Bold', path.resolve(__dirname, '../assets/fonts/Lato-Bold.ttf'));
      const d = bill.document;
      const nonVat = isNonVatBilling(d), amountDue = d.amountDue ?? d.total;
      const left = 28, width = pdf.page.width - left * 2, bottom = pdf.page.height - 42;
      const colors = { ink: '#141C2D', purple: '#4935DD', line: '#C9C5FF', card: '#F7F7FE', lavender: '#EEEAFE', header: '#F0F1FF' };
      let y = 44;
      const font = (bold = false, size = 10) => pdf.font(bold ? 'Bold' : 'Body').fontSize(size);
      const text = (value, x, top, w, { bold = false, size = 10, color = colors.ink, align = 'left' } = {}) => {
        font(bold, size).fillColor(color).text(String(value ?? ''), x, top, { width: w, align, lineBreak: false });
      };
      const box = (x, top, w, h, color, radius = 5) => pdf.roundedRect(x, top, w, h, radius).fill(color);
      const rule = top => pdf.moveTo(left, top).lineTo(left + width, top).lineWidth(.6).strokeColor(colors.line).stroke();
      const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: d.currency || 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
      const date = value => value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
      function lines(value, w, size = 10, bold = false) {
        font(bold, size);
        return String(value || '').split('\n').flatMap(paragraph => {
          const result = []; let line = '';
          for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            if (line && pdf.widthOfString(`${line} ${word}`) > w) { result.push(line); line = ''; }
            let part = '';
            for (const character of word) {
              if (part && pdf.widthOfString(part + character) > w) { if (line) result.push(line); result.push(part); line = ''; part = ''; }
              part += character;
            }
            line = line ? `${line} ${part}` : part;
          }
          result.push(line); return result;
        });
      }
      function paragraph(value, x, top, w, options = {}) {
        const size = options.size || 10, step = size * 1.4;
        const wrapped = lines(value, w, size, options.bold);
        wrapped.forEach((line, index) => text(line, x, top + index * step, w, options));
        return wrapped.length * step;
      }
      function newPage() {
        pdf.addPage();
        text('Billing Statement', left, 28, width - 145, { bold: true, size: 17 });
        text(bill.reference, left + width - 145, 34, 145, { size: 9, align: 'right', color: colors.purple });
        rule(60); y = 77;
      }
      function ensure(height) { if (y + height > bottom) newPage(); }
      function heading(label) { ensure(40); text(label, left, y, width, { bold: true, size: 15, color: colors.purple }); y += 24; }
      function flowing(value, options = {}) {
        const step = (options.size || 9) * 1.4;
        for (const line of lines(value, width - 16, options.size || 9)) { ensure(step); text(line, left + 8, y, width - 16, { size: 9, ...options }); y += step; }
      }

      text('Billing Statement', left, y, width - 165, { bold: true, size: 29 });
      pdf.image(path.resolve(__dirname, '../assets/contract-logo.png'), left + width - 148, 10, { fit: [148, 76], align: 'center', valign: 'center' });
      y = 90;
      const gap = 7, cardWidth = (width - gap * 2) / 3;
      [['Billing number', bill.reference], ['Issue date', date(d.issuedOn)], ['Due date', date(d.dueOn)]].forEach(([label, value], index) => {
        const x = left + index * (cardWidth + gap);
        box(x, y, cardWidth, 49, colors.card);
        text(label, x + 8, y + 9, cardWidth - 16, { bold: true, size: 8, color: colors.purple });
        text(value, x + 8, y + 29, cardWidth - 16, { size: 10 });
      });
      y += 63; rule(y); y += 15;
      const panelWidth = (width - 14) / 2;
      const issuer = ['ZeroOne IT Inc.', 'Zone 12, Alta Tierra Tiguma, Pagadian City', '0919-079-7137', 'billing@zerooneitinc.com', 'TIN 801-375-987-00000'];
      const recipient = [d.clientName, d.clientCompany, d.clientAddress, d.clientEmail].filter(Boolean);
      const panelHeight = values => 31 + values.reduce((height, value) => height + lines(value, panelWidth - 18).length * 14 + 4, 0);
      const h = Math.max(124, panelHeight(issuer), panelHeight(recipient));
      [['From', issuer], ['Bill To', recipient]].forEach(([label, values], index) => {
        const x = left + index * (panelWidth + 14);
        box(x, y, panelWidth, h, colors.card);
        text(label, x + 9, y + 11, panelWidth - 18, { size: 8, bold: true, color: colors.purple });
        let top = y + 31;
        values.forEach((value, i) => { top += paragraph(value, x + 9, top, panelWidth - 18, { bold: i === 0, size: 10 }) + 4; });
      });
      y += h + 10; rule(y); y += 10;
      ensure(74);
      box(left, y, width, 65, colors.lavender);
      text('Amount due:', left + 9, y + 10, width - 18, { bold: true, color: colors.purple, size: 9 });
      text(money(amountDue), left + 9, y + 32, width - 18, { bold: true, size: 22 });
      y += 72;
      ensure(40);
      text('Items', left, y, 65, { bold: true, size: 15, color: colors.purple });
      const titleHeight = d.title ? paragraph(d.title, left + 75, y + 3, width - 75, { size: 9, bold: true }) : 0;
      y += Math.max(24, titleHeight + 7);
      if (d.rateQuotationReference) {
        ensure(45);
        y += paragraph(`Agreed rate: ${d.rateQuotationReference} · Effective ${d.rateEffectiveOn}`, left, y, width, { size: 8 }) + 10;
      }
      const columnWidths = (nonVat ? [.49, .13, .19, .19] : [.42, .12, .17, .10, .19]).map(fraction => width * fraction);
      function tableHeader() {
        let x = left;
        (nonVat ? ['Description', 'Quantity', 'Unit price', 'Amount'] : ['Description', 'Quantity', 'Unit price', 'Tax', 'Amount']).forEach((label, index) => {
          pdf.rect(x, y, columnWidths[index], 27).fillAndStroke(colors.header, colors.line);
          text(label, x + 7, y + 8, columnWidths[index] - 14, { bold: true, size: 9, align: index ? 'right' : 'left' }); x += columnWidths[index];
        });
        y += 27;
      }
      ensure(60); tableHeader();
      for (const item of d.items) {
        const description = lines(item.description, columnWidths[0] - 14, 9);
        let offset = 0;
        while (offset < description.length) {
          if (bottom - y < 34) { newPage(); tableHeader(); }
          const count = Math.max(1, Math.min(description.length - offset, Math.floor((bottom - y - 16) / 12.6)));
          const height = Math.max(34, count * 12.6 + 16);
          let x = left;
          columnWidths.forEach(w => { pdf.rect(x, y, w, height).lineWidth(.5).strokeColor(colors.line).stroke(); x += w; });
          description.slice(offset, offset + count).forEach((line, i) => text(line, left + 7, y + 8 + i * 12.6, columnWidths[0] - 14, { size: 9 }));
          if (offset === 0) {
            x = left + columnWidths[0];
            [item.quantity, money(item.unitPrice), ...(!nonVat ? [`${d.taxRate || 0}%`] : []), money(item.amount)].forEach((value, i) => {
              text(value, x + 7, y + 8, columnWidths[i + 1] - 14, { size: 9, align: 'right' }); x += columnWidths[i + 1];
            });
          }
          y += height; offset += count;
          if (offset < description.length) { newPage(); tableHeader(); }
        }
      }
      const summaryRows = [['Subtotal', d.subtotal], ...(!nonVat ? [[`VAT (${d.taxRate || 0}%)`, d.tax]] : []), ...(d.advancePayment > 0 ? [['Less: Advance payment / deduction', -d.advancePayment]] : [])];
      const summaryHeight = 80 + summaryRows.length * 20;
      y += 10; ensure(summaryHeight + 8);
      pdf.roundedRect(left, y, width, summaryHeight, 9).lineWidth(.6).fillAndStroke('#FCFCFC', '#DDDDDD');
      text('SUMMARY', left + 10, y + 10, width - 20, { size: 9, color: '#666666' });
      let summaryY = y + 30;
      for (const [label, value] of summaryRows) {
        text(label, left + 10, summaryY, width * .65 - 10, { size: 11 });
        text(money(value), left + width * .65, summaryY, width * .35 - 10, { size: 11, align: 'right' });
        summaryY += 20;
      }
      pdf.moveTo(left + 10, summaryY + 1).lineTo(left + width - 10, summaryY + 1).strokeColor('#E5E5E5').stroke();
      text('Total Amount Due', left + 10, summaryY + 12, width - 20, { bold: true, size: 12 });
      text(money(amountDue), left + 10, summaryY + 31, width - 20, { bold: true, size: 14 });
      y += summaryHeight + 4;
      if (d.advancePayment > 0 && d.deductionNote) { flowing(`Deduction details: ${d.deductionNote}`, { size: 8 }); y += 4; }
      y += 7; ensure(64); rule(y); y += 13; heading('Payment method:');
      const instructions = billingPaymentInstructions(d.currency, d.paymentInstructions).split('\n');
      for (const instruction of instructions) {
        const match = instruction.match(/^(Bank(?: name)?|Account type|Account name|Account number|Swift code)\s*:\s*(.*)$/i);
        if (!match) { if (instruction.trim()) { flowing(instruction); y += 6; } continue; }
        const label = { bank: 'Bank Name:', 'bank name': 'Bank Name:', 'account type': 'Account Type:', 'account name': 'Account Name:', 'account number': 'Account Number:', 'swift code': 'Swift Code:' }[match[1].toLowerCase()];
        const labelWidth = width * .35, valueWidth = width - labelWidth;
        const valueLines = lines(match[2], valueWidth - 14, 10, label === 'Account Number:');
        for (let offset = 0; offset < valueLines.length;) {
          ensure(30);
          const count = Math.max(1, Math.min(valueLines.length - offset, Math.floor((bottom - y - 12) / 14)));
          const height = Math.max(26, count * 14 + 12);
          pdf.rect(left, y, labelWidth, height).fillAndStroke(colors.card, colors.line);
          pdf.rect(left + labelWidth, y, valueWidth, height).lineWidth(.5).strokeColor(colors.line).stroke();
          text(offset === 0 ? label : 'Continued', left + 7, y + 7, labelWidth - 14, { bold: true, size: 10 });
          valueLines.slice(offset, offset + count).forEach((line, i) => text(line, left + labelWidth + 7, y + 7 + i * 14, valueWidth - 14, { bold: label === 'Account Number:', size: 10 }));
          offset += count; y += height;
        }
      }
      if (d.notes) { y += 18; heading('Notes'); flowing(d.notes); }
      y += 8;
      if (d.kind !== 'manual') { flowing('This statement covers the full monthly recurring subscription charge. Setup fees and additional one-time features are excluded.', { size: 8 }); y += 5; }
      flowing('Please send payment confirmation or billing questions to billing@zerooneitinc.com.', { size: 8 });
      if (nonVat) { y += 5; flowing(nonVatBillingNote, { size: 8 }); }
      flowing('This billing statement is not proof of payment.', { size: 8 });
      const range = pdf.bufferedPageRange();
      for (let page = 0; page < range.count; page++) {
        pdf.switchToPage(page);
        pdf.page.margins.bottom = 0;
        text('zerooneitinc.com', left, pdf.page.height - 25, width / 2, { size: 7, color: '#72788B' });
        text(`${page + 1} / ${range.count}`, left + width / 2, pdf.page.height - 25, width / 2, { size: 7, align: 'right', color: '#72788B' });
      }
      pdf.end();
    } catch (error) { pdf.destroy(); reject(error); }
  });
}
module.exports = { renderBillingPdf };
