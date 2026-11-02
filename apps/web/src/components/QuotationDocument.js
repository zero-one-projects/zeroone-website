import MonthlySubscriptionSummary from './MonthlySubscriptionSummary';
import { quotationTotals } from '../utils/quotation';
import quotationLogo from '../assets/landing/Newlogo.png';

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
}

export default function QuotationDocument({ document, reference }) {
  const totals = quotationTotals(document);
  const money = (value) => `${document.currency} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2
  }).format(value)}`;

  return (
    <section className="quotation-paper" aria-label="Quotation preview">
      <header className="quotation-letterhead">
        <div className="quotation-issuer">
          <div className="quotation-brand">
            <img className="quotation-logo" src={quotationLogo} alt="ZeroOne Information Technology Inc." />
          </div>
          <p className="quotation-company-name">Zero One Information Technology Inc.</p>
          <p>Zone 12, Alta Tierra, Tiguma</p>
          <p>Pagadian City, Zamboanga del Sur</p>
          <p>info@zeroroneitinc.com | +63 919 079 7137</p>
          <p>TIN &amp; Branch Code: 801-375-987-00000</p>
        </div>
        <div className="quotation-reference">
          <h2>QUOTATION</h2>
          {document.quoteType && document.quoteType !== 'project' && <p>{document.quoteType === 'pos' ? 'POS setup & add-ons' : 'Custom subscription'}</p>}
          <p><strong>QUOTE #</strong> {reference || 'DRAFT'}</p>
          <p><strong>DATE</strong> {formatDate(document.issuedOn)}</p>
          <p className="quotation-expiry">Valid until {formatDate(document.validUntil)}</p>
        </div>
      </header>

      <div className="quotation-recipient">
        <div><p><strong>TO</strong> {document.clientName || 'Client name'}</p>
          {document.clientAddress && <p className="quotation-client-detail">{document.clientAddress}</p>}
          {document.clientEmail && <p className="quotation-client-detail">{document.clientEmail}</p>}
        </div>
        <p className="quotation-purpose"><strong>FOR</strong> {document.title || 'Project title'}</p>
      </div>

      <table className="quotation-description-table">
        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
        <tbody>{document.items.map((item, index) => (
          <tr key={index}>
            <td>
              <p className="quotation-item-title">{item.description || 'Item description'}</p>
              {item.chargeType && item.chargeType !== 'one_time' && <p className="quotation-item-quantity">{item.chargeType === 'recurring' ? `Subscription · ${document.billingPeriod || 'monthly'}` : item.chargeType === 'milestone' ? 'Milestone payment' : item.chargeType === 'setup' ? 'Setup fee · one-time' : 'Additional feature · one-time'}</p>}
              {Number(item.quantity) !== 1 && <p className="quotation-item-quantity">{item.quantity} × {money(Number(item.unitPrice) || 0)}</p>}
              {item.scope?.length > 0 && <ul className="quotation-scope">{item.scope.map((group, groupIndex) => (
                <li key={groupIndex}>
                  <p className="quotation-scope-title">{group.title}</p>
                  {group.details && <p className="quotation-scope-details">{group.details}</p>}
                </li>
              ))}</ul>}
            </td>
            <td className="quotation-item-amount">{money(totals.amounts[index])}{item.chargeType === 'recurring' && <small className="block text-xs">/ {document.billingPeriod === 'yearly' ? 'year' : 'month'}</small>}</td>
          </tr>
        ))}</tbody>
      </table>

      {document.notes && <div className="quotation-terms"><h3>Notes / payment terms</h3><p>{document.notes}</p></div>}
      {totals.hasRecurring && !document.monthlySubscription && document.contractDetails?.billingCommencement && <div className="quotation-terms"><h3>Subscription billing commencement</h3><p>{document.contractDetails.billingCommencement}</p><p>One-time setup and additional feature charges are separate from the recurring subscription.</p></div>}
      <MonthlySubscriptionSummary document={document} />
      <div className="quotation-summary">
        <p className="quotation-timeline">{document.timeline && <>Timeline: &nbsp;{document.timeline}</>}</p>
        <dl>
          {(Number(document.discount) > 0 || Number(document.taxRate) > 0) && <><dt>Subtotal:</dt><dd>{money(totals.subtotal)}</dd></>}
          {Number(document.discount) > 0 && <><dt>Discount:</dt><dd>−{money(Number(document.discount))}</dd></>}
          {Number(document.taxRate) > 0 && <><dt>Tax ({document.taxRate}%):</dt><dd>{money(totals.tax)}</dd></>}
          <dt className="quotation-grand-total">{totals.hasRecurring ? 'One-time total:' : 'Total:'}</dt><dd className="quotation-grand-total">{money(totals.total)}</dd>
          {totals.hasRecurring && <><dt>Subscription subtotal:</dt><dd>{money(totals.recurringSubtotal)}</dd>{Number(document.taxRate) > 0 && <><dt>Subscription tax:</dt><dd>{money(totals.recurringTax)}</dd></>}<dt className="quotation-grand-total">Subscription:</dt><dd className="quotation-grand-total">{money(totals.recurringTotal)} / {document.billingPeriod === 'yearly' ? 'year' : 'month'}</dd></>}
        </dl>
      </div>
      <footer className="quotation-document-end">*** NOTHING FOLLOWS ***</footer>
    </section>
  );
}
