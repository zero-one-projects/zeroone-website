import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ContractAcceptancePanel from './ContractAcceptancePanel';
const originalFetch = global.fetch;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
beforeEach(() => { URL.createObjectURL = jest.fn(() => 'blob:client-signed-original'); URL.revokeObjectURL = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; URL.createObjectURL = originalCreateObjectURL; URL.revokeObjectURL = originalRevokeObjectURL; });
const quotation = { id: 42, reference: 'POS-42', documentVersion: 'saved-version', document: { clientName: 'Example Client', acceptancePolicy: { version: 2 } }, contractState: { status: 'pending_admin_confirmation', locked: true, clientSignedAt: '2026-11-05T00:00:00Z', clientPdfSha256: 'original-pdf-sha256' } };

test('confirmation requires reviewing the original signed PDF and records the reviewed hash', async () => {
  global.fetch = jest.fn(async (url) => url.endsWith('/signed-copy')
    ? { ok: true, blob: async () => new Blob(['original signed PDF'], { type: 'application/pdf' }) }
    : { ok: true, json: async () => ({ quotation: { ...quotation, contractState: { ...quotation.contractState, status: 'finalized', providerAcceptance: { name: 'Authorized Staff', confirmedAt: '2026-11-05T01:00:00Z' } } } }) });
  function Harness() { const [row, setRow] = useState(quotation); return <ContractAcceptancePanel quotation={row} token="admin-token" onUpdated={setRow} />; }
  render(<Harness />);
  expect(screen.getByText('Pending Admin Confirmation')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirm Agreement' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Review Signed Contract' }));
  expect(await screen.findByTitle('Client-signed contract review')).toHaveAttribute('src', 'blob:client-signed-original');
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ quotationId: 42, documentHash: 'saved-version', copy: 'client' });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Agreement' }));
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const dialog = screen.getByRole('dialog', { name: 'Confirm agreement?' });
  expect(dialog).toHaveTextContent('Your name and confirmation date will be recorded separately');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Agreement' }));
  expect(await screen.findByText(/ZeroOne confirmed: Authorized Staff/)).toBeInTheDocument();
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ documentVersion: 'saved-version', reviewedClientPdfSha256: 'original-pdf-sha256' });
  expect(screen.queryByRole('button', { name: 'Confirm Agreement' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download Final Contract PDF' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download client-signed original' })).toBeInTheDocument();
});

test('failed review or a different signed version cannot enable confirmation', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({ message: 'Recorded PDF is unavailable.' }) }));
  const { rerender } = render(<ContractAcceptancePanel quotation={quotation} token="admin-token" onUpdated={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review Signed Contract' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Recorded PDF is unavailable.');
  expect(screen.getByRole('button', { name: 'Confirm Agreement' })).toBeDisabled();
  global.fetch = jest.fn(async () => ({ ok: true, blob: async () => new Blob(['PDF']) }));
  fireEvent.click(screen.getByRole('button', { name: 'Review Signed Contract' }));
  await screen.findByTitle('Client-signed contract review');
  expect(screen.getByRole('button', { name: 'Confirm Agreement' })).toBeEnabled();
  rerender(<ContractAcceptancePanel quotation={{ ...quotation, documentVersion: 'different-version' }} token="admin-token" onUpdated={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Confirm Agreement' })).toBeDisabled();
  expect(screen.queryByTitle('Client-signed contract review')).not.toBeInTheDocument();
});

test('unsigned and unsaved agreements cannot be confirmed', () => {
  const { rerender } = render(<ContractAcceptancePanel quotation={{ ...quotation, contractState: {} }} token="admin-token" onUpdated={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Confirm Agreement' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Review Signed Contract' })).not.toBeInTheDocument();
  expect(screen.getByText(/client must sign before/)).toBeInTheDocument();
  rerender(<ContractAcceptancePanel quotation={quotation} dirty token="admin-token" onUpdated={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Confirm Agreement' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Review Signed Contract' })).toBeDisabled();
});
