import ContractInlineText from './ContractInlineText';
import { useState } from 'react';
import './ContractFormattingEditor.css';
import { contractBlocks, blockAppearance, blockCss, contractFonts } from '../utils/contractFormatting';

export default function ContractFormattingEditor({ text, format, onTextChange, onFormatChange, disabled }) {
  const [selected, setSelected] = useState(0);
  const blocks = contractBlocks(text);
  const index = Math.min(selected, Math.max(0, blocks.length - 1));
  const block = blocks[index];
  const appearance = block ? blockAppearance(block, index, format) : { fontSize: 11, color: '#202027', bold: false };
  function style(patch) {
    if (!block) return;
    onFormatChange({ fontFamily: format?.fontFamily || 'Arial', blocks: [...(format?.blocks || []).filter((entry) => entry.index !== index && blocks[entry.index]?.text === entry.text), { index, text: block.text, bold: appearance.bold, fontSize: appearance.fontSize, color: appearance.color, ...patch }] });
  }
  function selectAt(event) {
    const caret = event.currentTarget.selectionStart;
    let next = 0;
    blocks.forEach((entry, i) => { if (entry.start <= caret) next = i; });
    setSelected(next);
  }
  return <div className="grid gap-4">
    <label className="grid gap-2 text-sm font-bold">Contract terms<textarea className="min-h-[20rem] w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-normal leading-7" required maxLength={30000} disabled={disabled} value={text} onChange={(event) => onTextChange(event.target.value)} onClick={selectAt} onKeyUp={selectAt} placeholder="Enter your contract terms. Separate paragraphs with a blank line." /></label>
    <fieldset className="contract-format-card" disabled={disabled}>
      <legend className="sr-only">Text formatting</legend>
      <div className="contract-format-header">
        <div className="contract-format-heading">
          <span className="contract-format-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V4h16v2M12 4v16M8 20h8" /></svg></span>
          <div><h3>Text formatting</h3><p>Select a section, then style its text.</p></div>
        </div>
        <button type="button" className="contract-format-reset" disabled={!format} onClick={() => onFormatChange(undefined)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></svg>Reset formatting</button>
      </div>
      <div className="contract-format-fields">
        <label className="contract-format-field contract-format-section">Title or paragraph<select className="contract-format-control" value={index} disabled={!blocks.length} onChange={(event) => setSelected(Number(event.target.value))}>{blocks.map((entry, i) => <option value={i} key={i}>{i + 1}. {entry.heading ? 'Title: ' : ''}{entry.text.replace(/\n/g, ' ').slice(0, 75)}</option>)}</select></label>
        <div className="contract-format-tools">
          <label className="contract-format-field">Contract font<select className="contract-format-control" value={format?.fontFamily || 'Arial'} onChange={(event) => onFormatChange({ fontFamily: event.target.value, blocks: format?.blocks || [] })}>{contractFonts.map((font) => <option key={font}>{font}</option>)}</select></label>
          <label className="contract-format-field">Text size (pt)<input className="contract-format-control" type="number" min="8" max="36" step="0.5" value={appearance.fontSize} disabled={!block} onChange={(event) => { const value = Number(event.target.value); if (value >= 8 && value <= 36) style({ fontSize: value }); }} /></label>
          <label className="contract-format-field">Text color<span className="contract-format-color"><input type="color" aria-label="Text color" value={appearance.color} disabled={!block} onChange={(event) => style({ color: event.target.value })} /><span aria-hidden="true">{appearance.color.toUpperCase()}</span></span></label>
          <div className="contract-format-field"><span>Style</span><button className="contract-format-bold" type="button" aria-label="Bold" aria-pressed={appearance.bold} disabled={!block} onClick={() => style({ bold: !appearance.bold })}><strong aria-hidden="true">B</strong><span>Bold</span><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ visibility: appearance.bold ? 'visible' : 'hidden' }}><path d="m4 10 4 4 8-8" /></svg></button></div>
        </div>
      </div>
      <p className="contract-format-note"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 5.5v1" /></svg>Applies to the selected section and PDF. Use **text** to bold a phrase.</p>
    </fieldset>
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Live formatting preview</p>
      <div className="max-h-96 overflow-auto rounded-lg bg-white p-4" aria-label="Contract formatting preview">
        {blocks.map((entry, i) => <div role="button" tabIndex={0} aria-label={`Format ${entry.heading ? 'title' : 'paragraph'} ${i + 1}`} aria-pressed={index === i} key={i} className={`mb-3 cursor-pointer rounded p-2 ${index === i ? 'ring-2 ring-[#817391]' : 'hover:bg-slate-50'}`} style={blockCss(entry, i, format)} onClick={() => setSelected(i)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(i); } }}><ContractInlineText text={entry.text} /></div>)}
        {!blocks.length && <p className="text-sm text-slate-500">Enter contract terms to preview formatting.</p>}
      </div>
    </div>
  </div>;
}
