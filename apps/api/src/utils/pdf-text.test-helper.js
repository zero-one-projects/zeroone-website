const { PDFName, PDFDict, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const decodedStream = stream => Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
const unicodeText = hex => String.fromCharCode(...(hex.replace(/\s/g, '').match(/.{4}/g) || []).map(value => parseInt(value, 16)));

// Read the embedded-font text emitted by our PDF generators, including Unicode
// client names. This deliberately covers our generated operators, not arbitrary PDFs.
function generatedPdfText(pdf) {
  const sources = pdf.getPages().map(page => ({ resources: page.node.Resources(), contents: page.node.Contents() }));
  for (const [, stream] of pdf.context.enumerateIndirectObjects()) if (stream instanceof PDFRawStream && stream.dict.has(PDFName.of('Resources'))) sources.push({ resources: stream.dict.lookup(PDFName.of('Resources'), PDFDict), contents: stream });
  const result = [];
  for (const { resources, contents } of sources) {
    const fonts = resources?.lookupMaybe(PDFName.of('Font'), PDFDict);
    const maps = new Map();
    for (const [key, ref] of fonts?.entries() || []) {
      const font = pdf.context.lookup(ref), map = new Map();
      const unicode = pdf.context.lookup(font.get(PDFName.of('ToUnicode')));
      if (unicode instanceof PDFRawStream) {
        const cmap = decodedStream(unicode);
        for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const entry of block[1].matchAll(/<([a-f\d]+)>\s*<([a-f\d\s]+)>/gi)) map.set(entry[1].toUpperCase(), unicodeText(entry[2]));
        for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const range of block[1].matchAll(/<([a-f\d]+)>\s*<([a-f\d]+)>\s*(\[[\s\S]*?\]|<[a-f\d]+>)/gi)) {
          const start = parseInt(range[1], 16), end = parseInt(range[2], 16);
          const values = [...range[3].matchAll(/<([a-f\d\s]+)>/gi)].map(entry => entry[1]);
          for (let index = start; index <= end; index += 1) map.set(index.toString(16).toUpperCase().padStart(range[1].length, '0'), range[3].startsWith('[') ? unicodeText(values[index - start]) : String.fromCharCode(parseInt(values[0], 16) + index - start));
        }
      }
      maps.set(key.toString().slice(1), map);
    }
    let selected;
    for (const ref of contents?.asArray ? contents.asArray() : contents ? [contents] : []) {
      const stream = pdf.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) continue;
      for (const match of decodedStream(stream).matchAll(/\/(\S+)\s+[-\d.]+\s+Tf|<([a-f\d]+)>\s*Tj|\[([\s\S]*?)\]\s*TJ/gi)) {
        if (match[1]) { selected = maps.get(match[1]); continue; }
        const hexes = match[2] ? [match[2]] : [...match[3].matchAll(/<([a-f\d]+)>/gi)].map(value => value[1]);
        result.push(hexes.map(hex => selected?.size ? (hex.match(/.{4}/g) || []).map(value => selected.get(value.toUpperCase()) || '').join('') : new TextDecoder('windows-1252').decode(Buffer.from(hex, 'hex'))).join(''));
      }
    }
  }
  return result.join(' ').normalize('NFKC').replace(/\s+/g, ' ');
}
module.exports = { generatedPdfText };
