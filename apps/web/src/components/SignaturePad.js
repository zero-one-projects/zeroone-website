import { useRef } from 'react';

export function SignatureDrawing({ strokes, className = '' }) {
  return <svg className={className} viewBox="0 0 600 180" role="img" aria-label="Electronic signature" preserveAspectRatio="none">
    {(strokes || []).map((stroke, index) => <polyline key={index} points={stroke.map(([x, y]) => `${x * 600},${y * 180}`).join(' ')} fill="none" stroke="#26293c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}

export default function SignaturePad({ value, onChange, disabled }) {
  const current = useRef(null);
  const area = useRef(null);
  function point(event) {
    const rect = area.current.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height].map((value) => Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000);
  }
  function finish() {
    if (!current.current) return;
    const stroke = current.current;
    current.current = null;
    if (stroke.length < 2) onChange(value.filter((entry) => entry !== stroke));
  }
  return <div className="grid gap-2">
    <p className="text-sm font-bold text-slate-700">Your signature</p>
    <p className="text-xs text-slate-500" id="signature-instructions">Draw with your mouse, finger, or stylus.</p>
    <div ref={area} className="relative h-40 w-full touch-none overflow-hidden rounded-lg border border-slate-300 bg-white" aria-label="Draw your signature" aria-describedby="signature-instructions"
      onPointerDown={(event) => {
        if (disabled || current.current || value.length >= 50 || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
        const stroke = [point(event)]; current.current = stroke; onChange([...value, stroke]);
      }}
      onPointerMove={(event) => {
        if (disabled || !current.current || value.reduce((count, stroke) => count + stroke.length, 0) >= 3000) return;
        current.current.push(point(event)); onChange([...value]);
      }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
      {!value.length && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-400">Sign here</span>}
      <SignatureDrawing strokes={value} className="pointer-events-none h-full w-full" />
    </div>
    <button type="button" className="justify-self-start text-sm font-bold text-[#514568] disabled:opacity-40" disabled={disabled || !value.length} onClick={() => { current.current = null; onChange([]); }}>Clear signature</button>
  </div>;
}
