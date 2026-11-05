import { useEffect, useRef, useState } from 'react';
import BillingPaymentDetails from './BillingPaymentDetails';

export default function BillingPaymentDetailsButton({ instructions = '', reference }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const element = dialog.current;
    const previousFocus = trigger.current;
    element.showModal();
    return () => { element.close(); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [open]);
  if (!instructions.trim()) return null;
  return <>
    <button ref={trigger} type="button" className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50" onClick={() => setOpen(true)}>Payment details</button>
    {open && <dialog ref={dialog} aria-label="Payment details" className="fixed inset-0 m-auto max-h-[90dvh] w-[94vw] max-w-2xl overflow-y-auto rounded-xl border border-violet-200 bg-white p-4 shadow-xl backdrop:bg-slate-950/60" onCancel={event => { event.preventDefault(); event.stopPropagation(); setOpen(false); }}>
      <div className="mb-3 flex justify-end"><button type="button" autoFocus className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold" onClick={() => setOpen(false)}>Close payment details</button></div>
      <BillingPaymentDetails instructions={instructions} reference={reference} />
    </dialog>}
  </>;
}
