import { useEffect, useId, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

export default function QuotationNotifications({ token }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const root = useRef(null);
  const trigger = useRef(null);
  const panelId = useId();
  const base = `${getApiBaseUrl()}/api/admin/quotation-notifications`;

  useEffect(() => { setNotifications([]); setUnreadCount(0); setLoading(true); }, [token]);

  useEffect(() => {
    function refresh() { setRevision(value => value + 1); }
    window.addEventListener('quotations-deleted', refresh);
    return () => window.removeEventListener('quotations-deleted', refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function refresh() {
      try {
        const result = await fetch(base, { signal: controller.signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
        const payload = await result.json();
        if (!result.ok || !Array.isArray(payload.notifications) || !Number.isInteger(payload.unreadCount)) throw new Error(payload.message || 'Unable to load notifications.');
        if (!controller.signal.aborted) { setNotifications(payload.notifications); setUnreadCount(payload.unreadCount); setError(''); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
      finally {
        if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(refresh, 30000); }
      }
    }
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [base, token, revision]);

  useEffect(() => {
    if (!open) return undefined;
    function outside(event) { if (!root.current?.contains(event.target)) setOpen(false); }
    function escape(event) { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }
    window.document.addEventListener('pointerdown', outside);
    window.document.addEventListener('keydown', escape);
    return () => { window.document.removeEventListener('pointerdown', outside); window.document.removeEventListener('keydown', escape); };
  }, [open]);

  async function markRead(notification) {
    if (notification?.isRead || saving) return;
    setSaving(true); setError('');
    try {
      const result = await fetch(`${base}/${notification ? `${notification.id}/read` : 'read-all'}`, {
        method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${token}` }
      });
      if (!result.ok) { const payload = await result.json(); throw new Error(payload.message || 'Unable to mark notifications as read.'); }
      window.dispatchEvent(new Event('quotation-notifications-read'));
      setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }

  return <div ref={root} className="relative">
    <button ref={trigger} type="button" className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#514568] shadow-sm hover:bg-slate-50" aria-expanded={open} aria-controls={panelId} aria-label={`Notifications, ${unreadCount} unread`} onClick={() => setOpen(value => !value)}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      Notifications
      {unreadCount > 0 && <span className="rounded-full bg-[#514568] px-2 py-0.5 text-xs text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    <span className="sr-only" role="status">{unreadCount} unread quotation notifications</span>
    {open && <section id={panelId} aria-label="Quotation notifications" className="absolute right-0 z-40 mt-3 w-[min(26rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <h2 className="font-bold">Quotation notifications</h2>
        <button type="button" className="text-xs font-bold text-[#514568] underline disabled:opacity-40" disabled={!unreadCount || saving} onClick={() => markRead()}>Mark all as read</button>
      </div>
      <p className="px-4 pt-3 text-xs text-slate-500">Client acceptances and requote requests. Updates every 30 seconds.</p>
      {error && <p className="m-4 text-sm text-rose-700" role="alert">{error} <button type="button" className="font-bold underline" onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
      {loading ? <p className="p-4 text-sm text-slate-500">Loading notifications…</p> : !notifications.length && !error ? <p className="p-4 text-sm text-slate-500">No quotation responses yet.</p> : <ul className="mt-3 max-h-[60dvh] overflow-y-auto divide-y divide-slate-100">
        {notifications.map(item => <li key={item.id} className={`p-4 ${item.isRead ? '' : 'bg-violet-50/60'}`}>
          <a href={item.href} onClick={() => markRead(item)} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#514568]">
            <div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-slate-300' : 'bg-[#514568]'}`} aria-hidden="true" /><strong className="text-sm text-[#514568]">{item.action === 'accept' ? 'Quotation accepted' : 'Requote requested'}</strong>{!item.isRead && <span className="sr-only">Unread</span>}</div>
            <p className="mt-2 text-sm font-bold">{item.reference}</p>
            <p className="mt-1 break-words text-sm text-slate-700">{item.clientName} · {item.title}</p>
            {item.note && <p className="mt-2 line-clamp-2 break-words text-sm text-slate-600">{item.note}</p>}
            <time className="mt-2 block text-xs text-slate-500" dateTime={item.respondedAt}>{new Date(item.respondedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila)</time>
          </a>
          {!item.isRead && <button type="button" disabled={saving} className="mt-2 text-xs font-bold text-[#514568] underline disabled:opacity-40" onClick={() => markRead(item)}>Mark as read<span className="sr-only"> {item.reference}</span></button>}
        </li>)}
      </ul>}
      <div className="border-t border-slate-200 p-4 text-xs text-slate-500">Latest 50 responses · <a className="font-bold text-[#514568] underline" href="/admin/quotation-list">View quotation list</a></div>
    </section>}
  </div>;
}
