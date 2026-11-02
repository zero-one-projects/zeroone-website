import { monthlySubscriptionSummary } from '../utils/quotation';
export default function MonthlySubscriptionSummary({ document, className = 'quotation-terms' }) {
  const summary = monthlySubscriptionSummary(document);
  if (!summary) return null;
  const money = amount => new Intl.NumberFormat('en-PH', { style: 'currency', currency: document.currency || 'PHP' }).format(amount);
  return <section className={className} aria-label="Monthly subscription after Go-Live"><h3>Monthly subscription after Go-Live</h3><p>{summary.additionalAmount > 0 ? <>This will require an additional monthly charge of <strong>{money(summary.additionalAmount)}</strong>, adjusting your subscription from <strong>{money(summary.currentAmount)}</strong> to <strong>{money(summary.revisedAmount)} per month</strong>. Please note that the revised monthly subscription will only commence after the official Go-Live of your <strong>{summary.systemName}</strong>.</> : <>Your monthly subscription of <strong>{money(summary.revisedAmount)}</strong> will only commence after the official Go-Live of your <strong>{summary.systemName}</strong>.</>}</p>{Number(document.taxRate) > 0 && <p>Monthly amounts include the quoted tax.</p>}</section>;
}
