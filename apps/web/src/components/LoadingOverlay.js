import { createPortal } from 'react-dom';

function LoadingOverlay({ isOpen, message = 'Loading admin data...' }) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[205] grid place-items-center bg-slate-950/45 px-5 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="w-full max-w-xs rounded-lg border border-white/10 bg-white p-5 text-center shadow-2xl shadow-slate-950/30">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f4f1f7]">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#e6e0ec] border-t-[#514568]" />
        </span>
        <p className="mt-4 text-sm font-black text-slate-950">{message}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Please wait a moment.</p>
      </div>
    </div>,
    document.body
  );
}

export default LoadingOverlay;
