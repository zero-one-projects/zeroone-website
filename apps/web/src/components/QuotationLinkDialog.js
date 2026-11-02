import { copyText } from '../utils/copyText';
import { useEffect, useId, useRef, useState } from 'react';

export default function QuotationLinkDialog({ quotation, onClose }) {
  const ref = useRef(null);
  const input = useRef(null);
  const title = useId();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const link = `${window.location.origin}${quotation.sharePath}`;
  const expired = quotation.expiresAt && Date.now() >= Date.parse(quotation.expiresAt);

  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = window.document.activeElement;
    const overflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    dialog.showModal();
    input.current?.focus(); input.current?.select();
    return () => {
      dialog.close();
      window.document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  async function copy() {
    try {
      await copyText(link, input.current);
      setCopied(true); setError('');
    } catch {
      setError('Your browser blocked clipboard access. The link is selected—press Command+C on Mac or Ctrl+C on Windows to copy it.');
      input.current?.focus(); input.current?.select();
    }
  }

  return (
    <dialog ref={ref} aria-labelledby={title} onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="quotation-controls fixed inset-0 m-auto max-h-[90dvh] w-[92vw] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[#6b617a]">{quotation.reference}</p><h2 id={title} className="mt-2 text-2xl font-bold">Your client link is ready</h2></div>
        <button type="button" aria-label="Close link popup" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-xl text-slate-600">×</button>
      </div>
      <p className="mt-4 text-sm text-slate-600">Copy this link to share the saved quotation with your client. You can copy it again from Quotation List.</p>
      <label className="mt-5 grid gap-2 text-sm font-bold text-slate-700">Client quotation link
        <input ref={input} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-950" readOnly value={link} onFocus={(event) => event.target.select()} />
      </label>
      <p className={`mt-3 text-xs ${expired ? 'text-amber-800' : 'text-slate-500'}`}>{expired ? 'This quotation is already expired. Open it and update the validity date before sharing.' : `Valid through ${quotation.document.validUntil}, 11:59 PM Manila time.`}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="admin-brand-surface rounded-lg px-5 py-3 text-sm font-bold" type="button" onClick={copy}>{copied ? 'Copied!' : 'Copy Link'}</button>
        <button className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600" type="button" onClick={onClose}>Done</button>
        <a className="text-sm font-bold text-[#514568] underline underline-offset-4" href={`/admin/quotations?id=${quotation.id}`}>Open saved quotation</a>
      </div>
      {copied && <p className="mt-4 text-sm text-emerald-800" role="status">Client link copied.</p>}
      {error && <p className="mt-4 text-sm text-slate-600" role="alert">{error}</p>}
    </dialog>
  );
}
