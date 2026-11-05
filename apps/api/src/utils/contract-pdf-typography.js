const path = require('path');
const fs = require('fs');
const { PDFName, PDFDict, PDFRawStream, decodePDFRawStream, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, concatTransformationMatrix, drawObject } = require('pdf-lib');

// Carlito preserves the Calibri metrics used by the uploaded POS agreement.
const typography = {
  regular: path.resolve(__dirname, '../assets/fonts/carlito/Carlito-Regular.ttf'),
  bold: path.resolve(__dirname, '../assets/fonts/carlito/Carlito-Bold.ttf'),
  bodySize: 11.04, lineHeight: 13.44, headingSize: 13.92, titleSize: 16.08,
  left: 51.84, right: 51.84, headingColor: '#376192', brandColor: '#7030a0'
};
async function embedContractFont(pdf) {
  pdf.registerFontkit(require('@pdf-lib/fontkit'));
  return pdf.embedFont(fs.readFileSync(typography.regular), { features: { liga: false, clig: false, calt: false } });
}

function watermarkFor(page) {
  const objects = page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!objects) return null;
  const contents = page.node.Contents();
  for (const reference of contents?.asArray ? contents.asArray() : contents ? [contents] : []) {
    const stream = page.doc.context.lookup(reference);
    if (!(stream instanceof PDFRawStream)) continue;
    const content = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
    for (const match of content.matchAll(/q\s+([\d.]+) 0 0 ([\d.]+) ([-\d.]+) ([-\d.]+) cm\s+\/([\w.-]+) Do\s+Q/g)) {
      const [, width, height, x, y, name] = match;
      const ref = objects.get(PDFName.of(name));
      const image = ref && page.doc.context.lookup(ref);
      if (Number(width) > page.getWidth() * .7 && Number(height) > page.getHeight() * .6 && image?.dict?.has(PDFName.of('SMask'))) {
        return { ref, matrix: [Number(width), 0, 0, Number(height), Number(x), Number(y)] };
      }
    }
  }
  return null;
}
function drawWatermark(page, watermark, regions) {
  if (!watermark) return;
  const name = page.node.newXObject('ContractWatermark', watermark.ref);
  page.pushOperators(pushGraphicsState(),
    ...(regions ? [...regions.map(area => rectangle(area.x, area.y, area.width, area.height)), clip(), endPath()] : []),
    concatTransformationMatrix(...watermark.matrix), drawObject(name), popGraphicsState());
}
function clearOverlayText(pdf, fields) {
  for (const page of pdf.getPages()) {
    const regions = fields.flatMap(field => field.acroField.getWidgets().filter(widget => widget.P()?.toString() === page.ref.toString()).map(widget => widget.getRectangle()));
    if (!regions.length) continue;
    const watermark = watermarkFor(page);
    // Exclude the printed placeholder paragraphs, then restore their watermark.
    // The completed fields can stay transparent instead of painting white boxes.
    const holes = regions.map(area => `${area.x} ${area.y} ${area.width} ${area.height} re`).join('\n');
    page.node.normalize();
    page.node.wrapContentStreams(pdf.context.register(pdf.context.flateStream(`q\n0 0 ${page.getWidth()} ${page.getHeight()} re\n${holes}\nW* n\n`)), pdf.context.register(pdf.context.flateStream('Q\n')));
    drawWatermark(page, watermark, regions);
  }
  for (const field of fields) for (const widget of field.acroField.getWidgets()) widget.getAppearanceCharacteristics()?.dict.delete(PDFName.of('BG'));
}
module.exports = { typography, embedContractFont, watermarkFor, drawWatermark, clearOverlayText };
