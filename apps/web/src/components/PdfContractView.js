import { useEffect, useState } from 'react';
export default function PdfContractView({ url, token, title = 'Uploaded PDF contract', className = 'h-[55dvh] min-h-80 w-full rounded-lg border border-slate-200 bg-white' }) {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let objectUrl;
    setSource(''); setError('');
    fetch(url, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' })
      .then(async (response) => { if (!response.ok) { const payload = await response.json(); throw new Error(payload.message || 'Unable to open contract PDF.'); } return response.blob(); })
      .then((blob) => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); } })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, token]);
  if (error) return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>;
  if (!source) return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600" role="status">Loading PDF contract…</p>;
  return <div><iframe title={title} src={source} className={className} /><p className="mt-2 text-xs text-slate-500">If your browser does not show the PDF, <a className="font-bold text-[#514568] underline" href={source} target="_blank" rel="noreferrer">open it in a new tab</a>.</p></div>;
}
