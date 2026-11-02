import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

export default function useQuotationResponseCounts(token, enabled = true) {
  const [counts, setCounts] = useState({ unreadCount: 0, quotations: {} });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    function refresh() { setRevision(value => value + 1); }
    window.addEventListener('quotation-notifications-read', refresh);
    window.addEventListener('quotations-deleted', refresh);
    return () => {
      window.removeEventListener('quotation-notifications-read', refresh);
      window.removeEventListener('quotations-deleted', refresh);
    };
  }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      try {
        const result = await fetch(`${getApiBaseUrl()}/api/admin/quotation-notifications/counts`, { signal: controller.signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
        const payload = await result.json();
        if (result.ok && payload.quotations && Number.isInteger(payload.unreadCount) && !controller.signal.aborted) setCounts(payload);
      } catch { /* Keep the last successful counts until the next refresh. */ }
      finally { if (!controller.signal.aborted) timer = setTimeout(refresh, 30000); }
    }
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, revision, enabled]);
  return counts;
}
