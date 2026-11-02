// Render emphasis as React text; contract wording never becomes executable HTML.
export default function ContractInlineText({ text }) {
  return String(text || '').split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') && part.length > 4
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part);
}
