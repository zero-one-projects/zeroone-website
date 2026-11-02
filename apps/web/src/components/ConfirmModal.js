import { createPortal } from 'react-dom';

function ConfirmModal({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  isOpen,
  message,
  onCancel,
  onConfirm,
  title
}) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <section
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl shadow-slate-950/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <h2 className="text-xl font-black" id="confirm-modal-title">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="h-11 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="h-11 rounded-md admin-brand-surface px-4 text-sm font-bold text-white transition hover:bg-blue-950"
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export default ConfirmModal;
