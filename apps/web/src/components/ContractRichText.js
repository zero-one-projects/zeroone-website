import ContractInlineText from './ContractInlineText';
import { contractBlocks, blockCss } from '../utils/contractFormatting';
import './ContractRichText.css';

// Read the existing plain-text terms without changing their saved wording or block indexes.
function paragraphContent(block, index, format) {
  const lines = block.text.split('\n');
  const groups = [];
  for (const line of lines) {
    const match = line.match(/^\s*([•·●]|-|\d+[.)])\s+(.+)$/);
    const type = match ? (/^\d/.test(match[1]) ? 'ordered' : 'bullet') : 'paragraph';
    const previous = groups[groups.length - 1];
    if (previous?.type === type) previous.lines.push(match ? { text: match[2], marker: match[1] } : { text: line });
    else groups.push({ type, lines: [match ? { text: match[2], marker: match[1] } : { text: line }] });
  }
  return groups.map((group, groupIndex) => {
    const style = blockCss(block, index, format);
    if (group.type === 'paragraph') return <p key={`${index}-${groupIndex}`} className="contract-body-paragraph" style={style}><ContractInlineText text={group.lines.map((line) => line.text).join('\n')} /></p>;
    const List = group.type === 'ordered' ? 'ol' : 'ul';
    return <List key={`${index}-${groupIndex}`} className="contract-clause-list" style={style}>{group.lines.map((line, lineIndex) => <li key={lineIndex}><span className="contract-list-marker" aria-hidden="true">{line.marker}</span><span><ContractInlineText text={line.text} /></span></li>)}</List>;
  });
}

export default function ContractRichText({ text, format }) {
  const sections = [{ heading: null, paragraphs: [] }];
  contractBlocks(text).forEach((block, index) => {
    if (block.heading) sections.push({ heading: { block, index }, paragraphs: [] });
    else sections[sections.length - 1].paragraphs.push({ block, index });
  });
  return <div className="contract-reading-area"><div className="contract-terms">{sections.filter((section) => section.heading || section.paragraphs.length).map((section, index) => <section className="contract-clause" key={index}>
    {section.heading && <h2 style={blockCss(section.heading.block, section.heading.index, format)}>{section.heading.block.text}</h2>}
    {section.paragraphs.map(({ block, index: blockIndex }) => <div key={blockIndex}>{paragraphContent(block, blockIndex, format)}</div>)}
  </section>)}</div></div>;
}
