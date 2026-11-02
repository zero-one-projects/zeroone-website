import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContractsPanel from './ContractsPanel';
import { openContractPreview } from '../utils/printContract';
jest.mock('../utils/printContract', () => ({ openContractPreview: jest.fn().mockResolvedValue(undefined) }));
afterEach(() => jest.restoreAllMocks());
test('saved default can be previewed and downloaded without an online editor', async () => {
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  URL.createObjectURL = jest.fn(() => 'blob:contract');
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(global, 'fetch').mockImplementation(async (url) => url.endsWith('/default-pdf')
    ? { ok: true, blob: async () => new Blob(['%PDF-example'], { type: 'application/pdf' }) }
    : { ok: true, json: async () => ({ templates: { project: 'My saved original terms' } }) });
  render(<ContractsPanel token="admin-token" />);
  const download = await screen.findByRole('button', { name: 'Download Default PDF' });
  expect(screen.queryByLabelText('Contract terms')).not.toBeInTheDocument();
  expect(screen.queryByText('Text formatting')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Preview Contract' }));
  await waitFor(() => expect(openContractPreview).toHaveBeenCalledWith(expect.objectContaining({ contractText: 'My saved original terms' }), expect.anything(), expect.anything()));
  await waitFor(() => expect(download).toBeEnabled());
  fireEvent.click(download);
  await waitFor(() => expect(click).toHaveBeenCalled());
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/project/default-pdf'), expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }));
});

test('PDF and default contract can be selected without overwriting saved default terms', async () => {
  const templates = { project: 'My original saved default' };
  const contracts = { project: { source: 'pdf', pdf: { id: 'file-id', fileName: 'My contract.pdf', pageCount: 3, byteLength: 12000 } } };
  jest.spyOn(global, 'fetch').mockImplementation(async (url, options = {}) => {
    if (options.method === 'PUT') contracts.project.source = JSON.parse(options.body).source;
    return { ok: true, json: async () => ({ templates, contracts, message: 'Contract source saved.' }) };
  });
  render(<ContractsPanel token="admin-token" />);
  await screen.findByText('My contract.pdf');
  fireEvent.click(screen.getByRole('button', { name: 'Use Default Contract' }));
  await screen.findByText('Contract source saved.');
  expect(JSON.parse(fetch.mock.calls.find(([, options]) => options.method === 'PUT')[1].body)).toEqual({ source: 'default' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download Default PDF' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Use Uploaded PDF' }));
  await waitFor(() => expect(fetch.mock.calls.filter(([, options]) => options.method === 'PUT')).toHaveLength(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download Default PDF' })).toBeEnabled());
});
test('uploading a PDF keeps default text and uses multipart upload', async () => {
  const templates = { project: 'Keep my default contract' };
  jest.spyOn(global, 'fetch').mockImplementation(async (url, options = {}) => ({ ok: true, json: async () => ({ templates, contracts: options.method === 'POST' ? { project: { source: 'pdf', pdf: { id: 'file-id', fileName: 'Uploaded contract.pdf', pageCount: 2, byteLength: 1000 } } } : {}, message: 'PDF uploaded.' }) }));
  render(<ContractsPanel token="admin-token" />);
  await screen.findByRole('button', { name: 'Download Default PDF' });
  fireEvent.change(screen.getByLabelText('Upload PDF contract'), { target: { files: [new File(['%PDF-example'], 'Uploaded contract.pdf', { type: 'application/pdf' })] } });
  expect(await screen.findByText('PDF uploaded.')).toBeInTheDocument();
  expect(screen.getByText('Uploaded contract.pdf')).toBeInTheDocument();
  const options = fetch.mock.calls.find(([, options]) => options.method === 'POST')[1];
  expect(options.body).toBeInstanceOf(FormData);
  expect(options.headers['Content-Type']).toBeUndefined();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download Default PDF' })).toBeEnabled());
});


test('expired sessions request sign-in instead of displaying empty contract templates', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Invalid or expired token.' }) });
  render(<ContractsPanel token="expired-token" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Your admin session has expired');
  expect(screen.getByRole('link', { name: 'Sign In Again' })).toHaveAttribute('href', '/admin/login?returnTo=%2Fadmin%2Fcontracts');
  expect(screen.queryByText('Create default terms below')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
});

test('a failed initial load does not present saved contracts as missing', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, json: async () => ({ message: 'Unable to load contracts.' }) });
  render(<ContractsPanel token="admin-token" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load contracts.');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  expect(screen.queryByText('Create default terms below')).not.toBeInTheDocument();
});
