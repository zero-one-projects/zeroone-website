export default function ResponseCountBadge({ count, reference }) {
  if (!count) return null;
  const label = `${count} unread client ${count === 1 ? 'response' : 'responses'}${reference ? ` for ${reference}` : ''}`;
  return <span role="status" aria-label={label} title={label} className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 align-middle text-xs font-bold text-white">{count}</span>;
}
