import { useEffect, useRef, useState } from 'react';
import Seo from '../components/Seo';
import '../admin-theme.css';

export default function VerificationCodePage({ fragment = window.location.hash }) {
  const [details] = useState(() => {
    const params = new URLSearchParams(fragment.replace(/^#/, ''));
    const code = params.get('code') || '';
    const expires = Date.parse(params.get('expires') || '');
    return /^\d{6}$/.test(code) && Number.isFinite(expires) ? { code, expires } : null;
  });
  const [now, setNow] = useState(Date.now);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef(null);
  const remaining = details ? Math.max(0, Math.ceil((details.expires - now) / 1000)) : 0;

  useEffect(() => {
    window.history.replaceState({}, '', '/verification-code');
    const interval = setInterval(() => setNow(Date.now()), 1000);
    const meta = window.document.createElement('meta');
    meta.name = 'referrer'; meta.content = 'no-referrer'; window.document.head.appendChild(meta);
    return () => { clearInterval(interval); meta.remove(); };
  }, []);

  async function copy() {
    if (!remaining) return;
    try {
      await navigator.clipboard.writeText(details.code);
      setCopied(true); setError('');
    } catch {
      const selection = window.getSelection();
      const range = window.document.createRange();
      range.selectNodeContents(codeRef.current); selection.removeAllRanges(); selection.addRange(range);
      setError('The code is selected. Use your keyboard or browser menu to copy it.');
    }
  }

  return (
    <main className="admin-theme grid min-h-screen place-items-center bg-[#f3f4f7] px-5 py-10 text-slate-950">
      <Seo title="Verification Code | Zero One IT Inc." description="Copy your Zero One verification code." canonicalPath="/verification-code" noindex />
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <header className="admin-brand-surface p-7"><p className="text-xl font-bold">Zero One IT Inc.</p><p className="mt-2 text-xs uppercase tracking-widest text-white/70">Client verification</p></header>
        <div className="p-7">
          <h1 className="text-2xl font-bold">{!details ? 'Open your email link' : remaining ? 'Your verification code' : 'This code has expired'}</h1>
          {details && remaining > 0 ? <>
            <p className="mt-3 text-sm leading-6 text-slate-600">Copy the code, then return to your quotation tab to verify and confirm your response.</p>
            <p ref={codeRef} className="mt-6 select-all rounded-xl border border-[#e5dfed] bg-[#f4f1f7] px-3 py-6 text-center font-mono text-4xl font-bold tracking-[0.25em] text-[#26293c]" aria-label="Verification code">{details.code}</p>
            <button type="button" onClick={copy} className="admin-brand-surface mt-5 w-full rounded-xl px-5 py-3.5 font-bold">{copied ? 'Copied!' : 'Copy Code'}</button>
            <p className="mt-3 text-center text-xs text-slate-500">Expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>
            {copied && <p className="mt-4 text-sm text-emerald-800" role="status">Code copied. Return to your quotation to continue.</p>}
            {error && <p className="mt-4 text-sm text-slate-600" role="alert">{error}</p>}
          </> : <p className="mt-3 text-sm leading-6 text-slate-600">{details ? 'Return to your quotation and request a new verification code.' : 'Use the Copy Code button in your verification email to open this page again.'}</p>}
        </div>
      </section>
    </main>
  );
}
