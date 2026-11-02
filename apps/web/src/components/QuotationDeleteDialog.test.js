import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuotationDeleteDialog from './QuotationDeleteDialog';

afterEach(() => jest.restoreAllMocks());
const quotation = { id: 3, reference: 'ZO-2026-00003', document: { title: 'Website' } };

test('requires an emailed code before sending the deletion request', async () => {
  const deleted = jest.fn();
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ challengeId: 'challenge' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Deleted' }) });
  render(<QuotationDeleteDialog token="admin-token" quotation={quotation} onClose={jest.fn()} onDeleted={deleted} />);
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Confirm Delete' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send Deletion Code' }));
  const input = await screen.findByLabelText('Deletion verification code');
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/3/delete-verification'), expect.objectContaining({ method: 'POST' }));
  expect(screen.getByRole('button', { name: 'Confirm Delete' })).toBeDisabled();
  fireEvent.change(input, { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));
  await waitFor(() => expect(deleted).toHaveBeenCalledWith(quotation));
  expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/quotations/3'), expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ challengeId: 'challenge', code: '123456' }) }));
});

test('failed verification leaves the quotation in place', async () => {
  const deleted = jest.fn();
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ challengeId: 'challenge' }) }).mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Incorrect deletion code.' }) });
  render(<QuotationDeleteDialog token="admin-token" quotation={quotation} onClose={jest.fn()} onDeleted={deleted} />);
  fireEvent.click(screen.getByRole('button', { name: 'Send Deletion Code' }));
  fireEvent.change(await screen.findByLabelText('Deletion verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect deletion code.');
  expect(deleted).not.toHaveBeenCalled();
});
