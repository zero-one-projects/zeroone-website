import { render, screen } from '@testing-library/react';
import ContractDocument from './ContractDocument';
const document = { quoteType: 'pos', title: 'POS Plan', clientName: 'Example Client', clientAddress: 'Client Address', currency: 'PHP', billingPeriod: 'monthly', items: [
  { description: 'POS setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }, { description: 'Requested feature', chargeType: 'addon', quantity: 1, unitPrice: 1500 }, { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 700 }
], discount: 0, taxRate: 0, contractText: '1. SERVICE SCOPE\n\nClient-specific agreement terms.', contractDetails: { branches: 'Two branches', paymentTerms: 'Pay on the agreed invoice date' } };
test('contract PDF layout contains the service agreement, dynamic payment annex, and blank unsigned signature fields', () => {
  render(<ContractDocument document={document} reference="ZO-2026-00001" />);
  expect(screen.getByRole('heading', { name: 'POS SYSTEM SUBSCRIPTION & SERVICE AGREEMENT' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'POS SUBSCRIPTION ORDER FORM & PAYMENT AGREEMENT' })).toBeInTheDocument();
  expect(screen.getByText('Client-specific agreement terms.')).toBeInTheDocument();
  expect(screen.getByText('PHP 6,500.00')).toBeInTheDocument();
  expect(screen.getAllByText('PHP 700.00 / month').length).toBeGreaterThan(0);
  expect(screen.getByText('Two branches')).toBeInTheDocument();
  expect(screen.getByText('Pay on the agreed invoice date')).toBeInTheDocument();
  expect(screen.queryByText(/58,000/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Seven \(7\)/)).not.toBeInTheDocument();
});
test('signed contract renders the recorded electronic signature with its saved terms', () => {
  render(<ContractDocument document={document} reference="ZO-2026-00001" signature={{ type: 'typed', typedName: 'Client Signer', signerName: 'Client Signer', email: 'client@example.com', signedAt: '2026-10-26T01:00:00Z', contractText: 'Terms actually signed', consentText: 'I consent to this signature.' }} />);
  expect(screen.getByText('Terms actually signed')).toBeInTheDocument();
    expect(screen.getAllByText('Client Signer').length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText('Client-specific agreement terms.')).not.toBeInTheDocument();
});

test('template preview leaves quotation-specific amounts and billing frequency blank', () => {
  render(<ContractDocument document={{ ...document, items: [], contractDetails: {} }} reference="TEMPLATE PREVIEW" templatePreview />);
  expect(screen.getByText(/Template preview. Client details/)).toBeInTheDocument();
  expect(screen.queryByText(/PHP 0/)).not.toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Total Recurring Subscription' }).nextElementSibling).toBeEmptyDOMElement();
  expect(screen.getByRole('cell', { name: 'Agreement Date' }).nextElementSibling).toBeEmptyDOMElement();
  expect(screen.queryByText('Monthly')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Parties to the agreement' })).not.toHaveTextContent('____');
  expect(screen.getByText('This agreement is entered into by and between:')).toBeInTheDocument();
});

test('formatted contract text uses saved font, color, weight and individual title size in the PDF layout', () => {
  const contractStyle = { fontFamily: 'Helvetica', blocks: [{ index: 0, text: '1. SERVICE SCOPE', bold: false, color: '#173abc', fontSize: 20 }] };
  render(<ContractDocument document={{ ...document, quoteType: 'project', contractStyle }} reference="FORMAT TEST" />);
  expect(screen.queryByRole('heading', { name: 'PROJECT ORDER FORM & PAYMENT AGREEMENT' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: '2. APPROVED FEATURES & SERVICES' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'ACCEPTANCE & SIGNATURES' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '1. SERVICE SCOPE' })).toHaveStyle({ fontFamily: 'Helvetica', fontSize: '20pt', fontWeight: '400', color: '#173abc' });
});

test('agreement body groups parties and clauses, renders lists, and keeps the existing letterhead and footer', () => {
  const { container } = render(<ContractDocument document={{ ...document, contractText: 'PAYMENT TERMS\n\n• Setup fee before implementation\n• Subscription starts at go-live\n\nSUPPORT\n\nAgreed support remains included.' }} reference="ZO-2026-00001" />);
  expect(screen.getByRole('region', { name: 'Parties to the agreement' })).toHaveTextContent('Example Client');
  expect(screen.getByRole('list')).toHaveTextContent('Setup fee before implementation');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByRole('heading', { name: 'ACCEPTANCE & SIGNATURES' })).toBeInTheDocument();
  expect(container.querySelector('.contract-letterhead')).toHaveTextContent('Contact number: 0919-079-7137');
  expect(container.querySelector('.contract-footer')).toHaveTextContent('info@zerooneitinc.com');
});

test('contract emphasis preserves safe text and renders the three milestones as a numbered list', () => {
  const terms = '3. PAYMENT TERMS\n\n1. **20% Down Payment (DP)** — before project start.\n2. **70% Second Payment** — upon completion of development.\n3. **10% Final Payment** — upon system go-live.\n\n**<script>alert(1)</script>**';
  const { container } = render(<ContractDocument document={{ ...document, contractText: terms }} reference="FINAL TEST" />);
  expect(screen.getByText('70% Second Payment').tagName).toBe('STRONG');
  expect(screen.getByRole('list').tagName).toBe('OL');
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  expect(container.querySelector('script')).toBeNull();
});
