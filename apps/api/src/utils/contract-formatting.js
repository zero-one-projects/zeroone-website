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

function normalizeContractStyle(input) {
  if (input === undefined || input === null) return undefined;
  const invalid = () => { throw Object.assign(new Error('Invalid contract formatting. Use an available font, a hex color, and text sizes from 8 to 36 pt.'), { statusCode: 400 }); };
  if (typeof input !== 'object' || Array.isArray(input) || !['Arial', 'Helvetica', 'Times New Roman', 'Georgia'].includes(input.fontFamily) || !Array.isArray(input.blocks) || input.blocks.length > 1000) invalid();
  let length = 0;
  const used = new Set();
  const blocks = input.blocks.map((entry) => {
    if (!entry || !Number.isInteger(entry.index) || entry.index < 0 || entry.index > 999 || used.has(entry.index) || typeof entry.text !== 'string' || entry.text.length > 30000 || typeof entry.bold !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(entry.color) || !Number.isFinite(entry.fontSize) || entry.fontSize < 8 || entry.fontSize > 36) invalid();
    length += entry.text.length; if (length > 30000) invalid(); used.add(entry.index);
    return { index: entry.index, text: entry.text, bold: entry.bold, color: entry.color.toLowerCase(), fontSize: entry.fontSize };
  });
  return { fontFamily: input.fontFamily, blocks };
}
module.exports = { contractBlocks, normalizeContractStyle };
