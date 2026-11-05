const path = require('path');
const { typography: style, watermarkFor, drawWatermark } = require('./contract-pdf-typography');
const companyIdentity = require('../../../web/src/content/companyIdentity.json');

function registerFonts(pdf) {
  pdf.registerFont('ContractBody', style.regular);
  pdf.registerFont('ContractBold', style.bold);
}
function bodyLineGap(pdf) { return style.lineHeight - pdf.currentLineHeight(true); }

function drawLetterhead(pdf, provider, pageOffset) {
  const range = pdf.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    pdf.switchToPage(index);
    const width = pdf.page.width - style.left - style.right;
    pdf.font('ContractBold').fontSize(style.titleSize).fillColor(style.brandColor).text(provider.name, style.left, 38, { width: width - 95, lineBreak: false });
    pdf.font('ContractBody').fontSize(9.12).fillColor('#000000').text(provider.address, style.left, 59, { width, lineBreak: false });
    pdf.text(`Contact number: ${provider.phone || companyIdentity.phone}`, style.left, 70, { width, lineBreak: false });
    pdf.image(path.resolve(__dirname, '../assets/contract-logo.png'), pdf.page.width - 173.7, 17.7, { width: 133.09, height: 70.1 });
    pdf.moveTo(style.left, 88).lineTo(pdf.page.width - style.right, 88).strokeColor(style.brandColor).lineWidth(1).stroke();
    const footer = pdf.page.height - 56.7;
    const bottomMargin = pdf.page.margins.bottom;
    pdf.page.margins.bottom = 0;
    pdf.moveTo(48.2, footer).lineTo(pdf.page.width - 49.7, footer).strokeColor('#777777').lineWidth(.5).stroke();
    pdf.font('ContractBody').fontSize(style.bodySize).fillColor('#0000ff').text('https://zerooneitinc.com/', style.left, footer + 9, { lineBreak: false });
    pdf.fillColor('#000000').text('info@zerooneitinc.com', 233.3, footer + 9, { lineBreak: false });
    pdf.fillColor('#0000ff').text('https://www.facebook.com/zeroone.it.inc', 370.5, footer + 9, { lineBreak: false });
    pdf.fontSize(9.12).fillColor('#000000').text(String(pageOffset + index + 1), 0, pdf.page.height - 19, { width: pdf.page.width, align: 'center', lineBreak: false });
    pdf.page.margins.bottom = bottomMargin;
  }
}

async function appendMatchingPages(original, addition) {
  const watermark = watermarkFor(original.getPage(0));
  for (const page of await original.copyPages(addition, addition.getPageIndices())) {
    if (!watermark) { original.addPage(page); continue; }
    const background = original.addPage([page.getWidth(), page.getHeight()]);
    drawWatermark(background, watermark);
    background.drawPage(await original.embedPage(page));
  }
}
module.exports = { style, registerFonts, bodyLineGap, drawLetterhead, appendMatchingPages };
