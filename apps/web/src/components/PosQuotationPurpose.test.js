import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PosQuotationPurpose from './PosQuotationPurpose';
const originalFetch = global.fetch;
const base = { quoteType: 'pos', posPurpose: 'new', currency: 'PHP', billingPeriod: 'monthly', clientName: '', clientEmail: '', title: 'POS', items: [{ description: 'Feature work', chargeType: 'addon', quantity: 1, unitPrice: 5000 }], contractDetails: {} };
const subscription = { id: 4, reference: 'ZO-2026-00004', clientName: 'Signed Client', clientEmail: 'client@example.com', clientAddress: 'Client address', currency: 'PHP', currentAmount: 1699, latestRecurringTotal: 1699, taxRate: 0, effectiveOn: '2026-01-01', rateHistory: [{ quotationId: 4, reference: 'ZO-2026-00004', documentHash: 'saved-hash', kind: 'new', effectiveOn: '2026-01-01', recurringTotal: 1699 }] };
afterEach(() => { global.fetch = originalFetch; });
function Harness({ initial = base, changed }) {
  const [document, setDocument] = useState(initial);
  return <PosQuotationPurpose document={document} token="admin-token" onChange={next => { setDocument(next); changed(next); }} />;
}
test('an upgrade loads the signed client and baseline rate and requires an agreed effective date', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ subscriptions: [subscription] }) }));
  const changed = jest.fn(); render(<Harness changed={changed} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Existing POS Subscription Upgrade' }));
  await screen.findByRole('option', { name: /Signed Client/ });
  fireEvent.change(screen.getByLabelText('Existing signed POS subscription'), { target: { value: '4' } });
  expect(changed.mock.calls.at(-1)[0]).toMatchObject({ posPurpose: 'upgrade', baseQuotationId: 4, baseQuotationReference: subscription.reference, clientFlow: 'full', clientName: subscription.clientName, clientEmail: subscription.clientEmail, monthlySubscription: { currentAmount: 1699, additionalAmount: 0 } });
  expect(screen.getByLabelText('Agreed upgrade effective date')).toBeRequired();
  fireEvent.change(screen.getByLabelText('Agreed upgrade effective date'), { target: { value: '2026-12-01' } });
  expect(changed.mock.calls.at(-1)[0].contractDetails.billingCommencement).toContain('2026-12-01');
  expect(screen.getByText('Signed subscription and rate history')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download signed agreement' })).toBeInTheDocument();
});
test('one-time customization keeps the one-time scope and removes recurring items without changing the source subscription', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ subscriptions: [] }) }));
  const changed = jest.fn();
  render(<Harness initial={{ ...base, monthlySubscription: { currentAmount: 1699, additionalAmount: 2000 }, items: [...base.items, { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 3699 }] }} changed={changed} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Additional One-Time Customization Only' }));
  const document = changed.mock.calls.at(-1)[0];
  expect(document.items).toEqual(base.items); expect(document.monthlySubscription).toBeUndefined();
  expect(document.posUpgradeTerms).toBeUndefined();
  expect(screen.getByText(/does not change the client's existing monthly subscription/)).toBeInTheDocument();
  await screen.findByText('No signed monthly POS subscriptions are available yet.');
});
test('subscription lookup errors are visible and can be retried', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({ message: 'Subscription lookup failed' }) }));
  render(<Harness changed={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Existing POS Subscription Upgrade' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Subscription lookup failed');
  expect(screen.getByRole('button', { name: 'Refresh subscriptions' })).toBeInTheDocument();
});
