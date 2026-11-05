import { configureMonthlySubscription, quotationTotals } from './quotation';
import { posBillingRate } from './posUpgrade';
test('new POS pricing starts at zero and the initial monthly charge is calculated without example defaults', () => {
  const source = { quoteType: 'pos', posPurpose: 'new', items: [], taxRate: 0 };
  const document = configureMonthlySubscription(source, { additionalAmount: 1234.56 });
  expect(document.monthlySubscription.currentAmount).toBe(0);
  expect(quotationTotals(document).recurringTotal).toBe(1234.56);
});
test('billing preview keeps the signed permanent rate through renewals and selects the old rate for historical statements', () => {
  const subscription = { recurringTotal: 1699, rateHistory: [{ kind: 'new', effectiveOn: '2026-01-01', recurringTotal: 1699 }, { kind: 'upgrade', effectiveOn: '2026-12-01', recurringTotal: 3699 }, { kind: 'customization', effectiveOn: '2027-01-01', recurringTotal: null }] };
  expect(posBillingRate(subscription, '2026-11', '2026-12-02')).toBe(1699);
  expect(posBillingRate(subscription, '2026-12', '2026-12-02')).toBe(3699);
  expect(posBillingRate(subscription, '2028-05', '2028-05-01')).toBe(3699);
});
