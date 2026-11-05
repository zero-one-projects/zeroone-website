import { useState } from 'react';
import { copyText } from '../utils/copyText';

const button = 'rounded-lg border border-violet-200 px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50';

export default function BillingPaymentDetails({ instructions = '', reference }) {
  const [notice, setNotice] = useState('');
  const [manualCopy, setManualCopy] = useState(null);
  async function copy(value, label) {
    try {
      await copyText(value);
      setManualCopy(null);
      setNotice(`${label} copied.`);
    } catch {
      setManualCopy({ value, label });
      setNotice('Select the text below and press Command+C on Mac or Ctrl+C on Windows to copy.');
    }
  }
  if (!instructions.trim()) return null;
  return <section aria-label="Payment method" className="rounded-xl border border-violet-200 bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-violet-800">Payment method</h2><button type="button" className={button} onClick={() => copy(instructions, 'Payment details')}>Copy payment details</button></div>
    {reference && <p className="mt-2 text-sm text-slate-500">{reference}</p>}
    <dl className="mt-4 divide-y divide-slate-100">{instructions.split('\n').filter(line => line.trim()).map((line, index) => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      const label = match ? match[1].trim() : 'Instruction';
      const value = match ? match[2] : line;
      return <div key={index} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1"><dt className="text-sm font-bold text-slate-600">{label}</dt><dd className="select-text whitespace-pre-wrap break-words font-semibold">{value}</dd></div><button type="button" className={button} aria-label={`Copy ${label.toLowerCase()}`} onClick={() => copy(value, label)}>Copy</button></div>;
    })}</dl>
    {notice && <p role="status" className="mt-3 text-sm text-violet-800">{notice}</p>}
    {manualCopy && <label className="mt-3 grid gap-2 text-sm font-bold">{manualCopy.label} to copy<textarea key={`${manualCopy.label}:${manualCopy.value}`} autoFocus readOnly rows={Math.min(6, manualCopy.value.split('\n').length)} value={manualCopy.value} onFocus={event => event.target.select()} onClick={event => event.target.select()} className="w-full rounded-lg border border-violet-200 p-3 font-normal" /></label>}
    <p className="mt-4 text-sm text-slate-600">Please send payment confirmation or billing questions to <a className="underline" href="mailto:billing@zerooneitinc.com">billing@zerooneitinc.com</a>.</p>
  </section>;
}
