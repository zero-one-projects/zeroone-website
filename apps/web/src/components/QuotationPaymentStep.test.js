import { render, screen } from '@testing-library/react';
import QuotationPaymentStep from './QuotationPaymentStep';
const quotation = { reference: 'ZO-2026-00001', contractText: '1. **20% Down Payment (DP)** — before project start.', document: { quoteType: 'project', title: 'Example project', total: 5000, currency: 'PHP' } };
test('payment uses the accepted down-payment milestone and does not invent bank details', () => {
  render(<QuotationPaymentStep quotation={quotation} />);
  expect(screen.getByText(/Amount Currently Due \(20%\)/).nextElementSibling).toHaveTextContent('1,000.00');
  expect(screen.getByText(/contact Zero One’s billing team/)).toBeInTheDocument();
  expect(screen.getByText(/Signing alone does not confirm payment/)).toBeInTheDocument();
});
test('configured bank instructions are shown and initial charges exclude recurring amounts', () => {
  render(<QuotationPaymentStep quotation={{ ...quotation, document: { ...quotation.document, hasRecurring: true, recurringTotal: 1000, initialPaymentPercent: 50, paymentInstructions: 'Example Bank\nAccount name: Example Company' } }} />);
  expect(screen.getByText(/Amount Currently Due \(50%\)/).nextElementSibling).toHaveTextContent('2,500.00');
  expect(screen.getByText(/Example Bank/)).toBeInTheDocument();
});

test('bank details supplied outside a legacy signed document appear after signing', () => {
  render(<QuotationPaymentStep quotation={{ ...quotation, paymentInstructions: 'Bank: AUB (ASIA UNITED BANK)\nAccount name: Zero One Information Technology Inc.\nAccount number: 310-11-003883-1', document: { ...quotation.document, paymentInstructions: '' } }} />);
  expect(screen.getByText(/AUB/)).toHaveTextContent('310-11-003883-1');
  expect(screen.getByText(/AUB/)).toHaveTextContent('Zero One Information Technology Inc.');
});

test('a 50 percent down payment on a 30000 contract shows 15000 due separately from the total', () => {
  render(<QuotationPaymentStep quotation={{ ...quotation, document: { ...quotation.document, total: 30000, initialPaymentPercent: 50 } }} />);
  expect(screen.getByText('Total Contract Amount').nextElementSibling).toHaveTextContent('30,000.00');
  expect(screen.getByText('Amount Currently Due (50%)').nextElementSibling).toHaveTextContent('15,000.00');
  expect(screen.getByText('Balance Scheduled After This Payment').nextElementSibling).toHaveTextContent('15,000.00');
});

test('POS payment summary shows full setup due, zero scheduled balance, and separate go-live subscription', () => {
  const { defaultPosPaymentTerms } = require('../utils/quotation');
  render(<QuotationPaymentStep quotation={{ ...quotation, document: { quoteType: 'pos', title: 'Cloud-Based POS System', currency: 'PHP', total: 10000, initialPaymentPercent: 100, hasRecurring: true, recurringTotal: 1699, billingPeriod: 'monthly', contractDetails: { paymentTerms: defaultPosPaymentTerms }, items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 10000 }] } }} />);
  expect(screen.getByText('Total One-Time Setup Fee').nextElementSibling).toHaveTextContent('10,000.00');
  expect(screen.getByText('Amount Currently Due (100%)').nextElementSibling).toHaveTextContent('10,000.00');
  expect(screen.getByText('Remaining Setup Balance After This Payment').nextElementSibling).toHaveTextContent('₱0.00');
  expect(screen.getByText('Monthly Subscription').nextElementSibling).toHaveTextContent('1,699.00/month');
  expect(screen.getByText(/Monthly subscription billing will begin upon the official go-live/)).toBeInTheDocument();
  expect(screen.getByText(/payable in full \(100%\)/)).toHaveTextContent('before the commencement of system setup');
});
