function contractBlocks(text) {
  const result = [];
  for (const match of String(text || '').matchAll(/[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g)) {
    const lines = match[0].split('\n');
    const heading = /^(?:\d+(?:\.\d+)*\.?\s+)?[A-Z][A-Z\d &/(),:.’'–—-]{4,}$/.test(lines[0].trim());
    if (heading) result.push({ text: lines.shift(), heading: true, start: match.index });
    if (lines.length) result.push({ text: lines.join('\n'), heading: false, start: match.index + (heading ? match[0].indexOf('\n') + 1 : 0) });
  }
  return result;
}

export const contractFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia'];
export { contractBlocks };
export function blockAppearance(block, index, format) {
  const saved = format?.blocks?.find((entry) => entry.index === index && entry.text === block.text);
  return { fontSize: block.heading ? 14 : 11, color: block.heading ? '#514568' : '#202027', bold: block.heading, ...saved };
}
export function blockCss(block, index, format) {
  const appearance = blockAppearance(block, index, format);
  return { fontFamily: contractFonts.includes(format?.fontFamily) ? format.fontFamily : 'Arial', fontSize: `${appearance.fontSize}pt`, fontWeight: appearance.bold ? 700 : 400, color: appearance.color, whiteSpace: 'pre-line', overflowWrap: 'anywhere' };
}
