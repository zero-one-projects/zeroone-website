import { render, screen } from '@testing-library/react';
import ContractPartiesSummary from './ContractPartiesSummary';
test('shows the completed identity and agreement date before signing', () => {
  render(<ContractPartiesSummary document={{ clientName: 'Example Client', clientAddress: 'Pagadian City', issuedOn: '2026-11-05', contractDetails: { agreementDate: '2026-11-10' } }} />);
  const details = screen.getByRole('region', { name: 'Completed agreement details' });
  expect(details).toHaveTextContent('Example Client'); expect(details).toHaveTextContent('Pagadian City'); expect(details).toHaveTextContent('2026-11-10');
  expect(details).toHaveTextContent('Zero One Information Technology Inc.');
});

test('shows the agreed signing trigger before signing and the recorded date afterward, using the frozen provider profile', () => {
  const document = { clientName: 'Accepted Client', clientAddress: 'Accepted business address', issuedOn: '2026-01-01', contractDetails: { agreementDateRule: 'signing' }, providerProfile: { name: 'Recorded Provider', address: 'Recorded provider address' } };
  const { rerender } = render(<ContractPartiesSummary document={document} />);
  expect(screen.getByText('Upon electronic signing')).toBeInTheDocument();
  expect(screen.getByText('Recorded Provider')).toBeInTheDocument();
  expect(screen.getByText('Recorded provider address')).toBeInTheDocument();
  rerender(<ContractPartiesSummary document={document} signature={{ signedAt: '2026-11-05T16:15:00Z', agreementEffectiveDate: '2026-11-06' }} />);
  expect(screen.getByText('2026-11-06')).toBeInTheDocument();
  expect(screen.queryByText('Upon electronic signing')).not.toBeInTheDocument();
  expect(screen.getByText('Accepted Client')).toBeInTheDocument();
});
