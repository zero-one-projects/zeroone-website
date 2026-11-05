import { render, screen, within } from '@testing-library/react';
import PosContractSummary from './PosContractSummary';

const document = { title: 'Cloud-Based POS System', clientName: 'Approved Client', currency: 'PHP', billingPeriod: 'monthly', discount: 1000, taxRate: 12, items: [
  { description: 'Setup', chargeType: 'setup', quantity: 2, unitPrice: 15000 },
  { description: 'Inventory integration', chargeType: 'addon', quantity: 1, unitPrice: 2500 },
  { description: 'Printer', chargeType: 'hardware', quantity: 1, unitPrice: 8000 },
  { description: 'Subscription', chargeType: 'recurring', quantity: 1, unitPrice: 1200 }
], contractDetails: { billingCommencement: 'Upon official Go-Live', minimumPeriod: 'Agreed twelve months' } };
const detail = label => screen.getByRole('cell', { name: label }).nextElementSibling;

test('POS order details use the approved line items and keep setup, addons, hardware, and recurring tax separate', () => {
  render(<PosContractSummary document={document} reference="POS-APPROVED" />);
  expect(detail('Client / Business Name')).toHaveTextContent('Approved Client');
  expect(detail('Quotation Reference')).toHaveTextContent('POS-APPROVED');
  expect(detail('One-Time Setup & Implementation Fee')).toHaveTextContent('PHP 30,000.00');
  expect(detail('Monthly Subscription Fee')).toHaveTextContent('PHP 1,344.00');
  expect(detail('Additional Features')).toHaveTextContent('Inventory integration — PHP 2,500.00');
  expect(detail('Additional Features')).not.toHaveTextContent('Printer');
  expect(detail('Subscription Effective Date')).toHaveTextContent('Upon official Go-Live');
  expect(detail('Minimum Subscription Period')).toHaveTextContent('Agreed twelve months');
  expect(screen.queryByText(/38,000|1,699/)).not.toBeInTheDocument();
});

test('different approved prices and yearly billing update the contract without changing its template', () => {
  render(<PosContractSummary document={{ ...document, billingPeriod: 'yearly', taxRate: 0, items: document.items.map(item => ({ ...item, unitPrice: item.chargeType === 'setup' ? 19000 : item.unitPrice })) }} reference="POS-YEARLY" />);
  expect(detail('One-Time Setup & Implementation Fee')).toHaveTextContent('PHP 38,000.00');
  expect(detail('Yearly Subscription Fee')).toHaveTextContent('PHP 1,200.00');
  expect(screen.queryByRole('cell', { name: 'Monthly Subscription Fee' })).not.toBeInTheDocument();
});

test('template previews leave client-specific table values blank', () => {
  render(<PosContractSummary document={document} reference="PREVIEW" templatePreview />);
  for (const row of screen.getAllByRole('row').slice(1)) expect(within(row).getAllByRole('cell')[1]).toBeEmptyDOMElement();
});

test('missing subscription items do not introduce an example price or an assumed subscription period', () => {
  render(<PosContractSummary document={{ ...document, items: [], contractDetails: {} }} reference="POS-EMPTY" />);
  expect(detail('Monthly Subscription Fee')).toHaveTextContent('No recurring subscription quoted');
  expect(detail('Minimum Subscription Period')).toHaveTextContent('Based on agreed terms');
});
