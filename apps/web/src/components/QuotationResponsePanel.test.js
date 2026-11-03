import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuotationResponsePanel from './QuotationResponsePanel';

const originalFetch = global.fetch;
const quotation = { document: { clientEmail: 'client@gmail.com' }, documentVersion: 'reviewed-version' };
const pageSession = { challengeId: 'challenge', verificationProof: 'open-page-proof', contractText: 'Payment: 20% upfront', consentText: 'I agree to the contract and electronic signature.', documentVersion: 'reviewed-version', expiresAt: '2099-01-01T00:00:00Z', email: 'client@gmail.com', name: 'Client Name' };
beforeAll(() => {
  window.PointerEvent = class extends MouseEvent { constructor(type, init) { super(type, init); this.pointerId = init.pointerId; this.pointerType = init.pointerType; } };
  HTMLElement.prototype.setPointerCapture = jest.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { jest.restoreAllMocks(); window.sessionStorage.clear(); global.fetch = originalFetch; window.history.replaceState({}, '', '/'); });

test('acceptance offers signing now or later, with signature saved separately', async () => {
  const pending = { ...quotation, clientResponse: { action: 'accept', current: true, signaturePending: true } };
  const signed = { ...quotation, clientResponse: { action: 'accept', current: true, signedAt: '2026-10-26T01:00:00Z' } };
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.endsWith('verification') ? { challengeId: 'challenge', message: 'Verification code sent.' } : url.endsWith('/verify') ? { verificationProof: 'verified-proof', contractText: 'Payment: 20% upfront', consentText: 'I agree to the contract and electronic signature.' } : { quotation: url.endsWith('/sign') ? signed : pending, signingSession: pageSession } }));
  function Harness() { const [row, setRow] = useState(quotation); return <QuotationResponsePanel quotation={row} token="link-token" onResponse={setRow} />; }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Accept Quotation' }));
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Continue' }));
  fireEvent.change(await screen.findByLabelText('Your full name'), { target: { value: 'Client Name' } });
  expect(screen.queryByLabelText('Signature method')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Acceptance' }));
  expect(await screen.findByRole('dialog', { name: 'Ready to sign your contract?' })).toBeInTheDocument();
  expect(screen.getByText('Contract pending signature')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign Contract Now' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Sign Later' })).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls[2][1].body).signature).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Sign Contract Now' }));
  expect(await screen.findByTitle('Contract to review')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Print Contract / Save PDF' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Download Signed Contract' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Agree & Sign Contract' })).toBeDisabled();
  expect(screen.queryByLabelText('Signature method')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Type your signature')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Your full name')).toHaveValue('Client Name');
  expect(screen.getByLabelText('Your full name')).toHaveAttribute('readonly');
  const pad = screen.getByLabelText('Draw your signature');
  pad.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 180 });
  fireEvent.pointerDown(pad, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 60, clientY: 36 });
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: 'mouse', clientX: 300, clientY: 90 });
  fireEvent.pointerUp(pad, { pointerId: 1, pointerType: 'mouse' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'I agree to the contract and electronic signature.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Agree & Sign Contract' }));
  await screen.findByRole('dialog', { name: 'Contract Signed – Payment Details' });
  expect(screen.getByRole('button', { name: 'Download Signed Contract' })).toBeInTheDocument();
  expect(screen.getByText(/Agreement electronically signed/)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(fetch.mock.calls[3][0]).toMatch(/\/sign$/);
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toMatchObject({ verificationProof: 'open-page-proof', name: 'Client Name', signature: { type: 'drawn', strokes: [[[0.1, 0.2], [0.5, 0.5]]], agreed: true } });
});

test('sign later keeps acceptance and returning to sign asks for email verification', async () => {
  render(<QuotationResponsePanel quotation={{ ...quotation, clientResponse: { action: 'accept', current: true } }} token="link-token" onResponse={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign Later' }));
  expect(screen.getByText(/You chose to sign later. Your quotation remains accepted/)).toBeInTheDocument();
  expect(screen.getByText('Quotation accepted')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sign Contract Now' }));
  expect(screen.getByRole('dialog', { name: 'Verify your email address' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send Verification Code' })).toBeInTheDocument();
});

test('email signing link opens the contract and verification without automatically sending a code or signing', () => {
  window.history.replaceState({}, '', '/quotation/link-token?sign=1');
  global.fetch = jest.fn();
  render(<QuotationResponsePanel quotation={{ ...quotation, reference: 'ZO-2026-00001', contractText: 'Saved agreement for this accepted quote', clientResponse: { action: 'accept', current: true } }} token="link-token" onResponse={jest.fn()} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Print Contract / Save PDF' })).not.toBeInTheDocument();
  expect(screen.getByText('Saved agreement for this accepted quote')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send Verification Code' })).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test('response popup locks scrolling, closes with Escape, and restores focus', () => {
  render(<QuotationResponsePanel quotation={quotation} token="link-token" onResponse={jest.fn()} />);
  const trigger = screen.getByRole('button', { name: 'Request a Revision' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Verify your email address' });
  expect(document.body.style.overflow).toBe('hidden');
  expect(screen.getByLabelText('Company email or Gmail')).toHaveFocus();
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(trigger).toHaveFocus();
});

test('requote collects requested changes and reports unavailable email delivery', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({ message: 'Client email verification is not available yet.' }) }));
  render(<QuotationResponsePanel quotation={quotation} token="link-token" onResponse={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Request a Revision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('not available yet');
  expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
});

test.each(['Sign Later', 'Escape'])('post-acceptance popup can be deferred with %s and keeps the verified signing session', async (choice) => {
  const pending = { ...quotation, clientResponse: { action: 'accept', current: true } };
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.endsWith('verification') ? { challengeId: 'challenge' } : url.endsWith('/verify') ? { verificationProof: 'proof', contractText: 'Saved contract', consentText: 'I agree.' } : { quotation: pending, signingSession: pageSession } }));
  function Harness() { const [row, setRow] = useState(quotation); return <QuotationResponsePanel quotation={row} token="link-token" onResponse={setRow} />; }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Accept Quotation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Continue' }));
  fireEvent.change(await screen.findByLabelText('Your full name'), { target: { value: 'Client Name' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Acceptance' }));
  const dialog = await screen.findByRole('dialog', { name: 'Ready to sign your contract?' });
  if (choice === 'Escape') fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  else fireEvent.click(screen.getByRole('button', { name: choice }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Quotation accepted')).toBeInTheDocument();
  expect(screen.getByText(/You chose to sign later/)).toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(screen.getByRole('button', { name: 'Sign Contract Now' })).toHaveFocus();
  expect(fetch).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole('button', { name: 'Sign Contract Now' }));
  expect(screen.queryByRole('button', { name: 'Send Verification Code' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Agree & Sign Contract' })).toBeInTheDocument();
  expect(screen.getByTitle('Contract to review')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(3);
});

test('verified signing session survives a refresh in the same tab but another tab session requires verification', () => {
  const pending = { ...quotation, clientResponse: { action: 'accept', current: true } };
  window.sessionStorage.setItem('quotation-signing-session:link-token', JSON.stringify(pageSession));
  window.history.replaceState({}, '', '/quotation/link-token?sign=1');
  const view = render(<QuotationResponsePanel quotation={pending} token="link-token" onResponse={jest.fn()} />);
  expect(screen.getByLabelText('Draw your signature')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Send Verification Code' })).not.toBeInTheDocument();
  view.unmount(); window.sessionStorage.clear();
  render(<QuotationResponsePanel quotation={pending} token="link-token" onResponse={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign Contract Now' }));
  expect(screen.getByRole('button', { name: 'Send Verification Code' })).toBeInTheDocument();
});

test('quotation-only acceptance confirms a separate follow-up without signing or payment', async () => {
  const closeTab = jest.spyOn(window, 'close').mockImplementation(() => {});
  const quote = { ...quotation, document: { ...quotation.document, clientFlow: 'quotation_only' } };
  const accepted = { ...quote, clientResponse: { action: 'accept', current: true, signaturePending: false } };
  global.fetch = jest.fn(async url => ({ ok: true, json: async () => url.endsWith('/verification') ? { challengeId: 'challenge' } : url.endsWith('/verify') ? { verificationProof: 'proof' } : { quotation: accepted } }));
  function Harness() { const [row, setRow] = useState(quote); return <QuotationResponsePanel quotation={row} token="quote-only" onResponse={setRow} />; }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Decide Later' }));
  expect(closeTab).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('You can return to this link before it expires');
  expect(screen.getByRole('status')).toHaveTextContent('No response has been submitted');
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Accept Quotation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Continue' }));
  fireEvent.change(await screen.findByLabelText('Your full name'), { target: { value: 'Client' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Acceptance' }));
  expect(await screen.findByRole('dialog', { name: 'Thank you for accepting' })).toHaveTextContent('another email');
  expect(screen.queryByRole('button', { name: 'Sign Contract Now' })).not.toBeInTheDocument();
  expect(screen.queryByText('Contract pending signature')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Continue to Payment' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByText(/contract, payment details, and terms/)).toBeInTheDocument();
});

test('quotation-only accepted links ignore the sign query and keep the follow-up message after reload', () => {
  window.history.replaceState({}, '', '/quotation/token?sign=1');
  render(<QuotationResponsePanel quotation={{ ...quotation, document: { clientFlow: 'quotation_only' }, clientResponse: { current: true, action: 'accept' } }} token="token" onResponse={jest.fn()} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sign Contract Now' })).not.toBeInTheDocument();
  expect(screen.getByText(/another email/)).toBeInTheDocument();
});

test('requote confirmation warns about expiry, offers a quotation copy and sales contact, and waits for explicit confirmation', async () => {
  const onResponse = jest.fn();
  const onPrintQuotation = jest.fn().mockResolvedValue(undefined);
  global.fetch = jest.fn(async url => ({ ok: true, json: async () => url.endsWith('/verification') ? { challengeId: 'challenge' } : { quotation: { ...quotation, clientResponse: { action: 'requote', current: true } } } }));
  render(<QuotationResponsePanel quotation={quotation} token="token" onResponse={onResponse} onPrintQuotation={onPrintQuotation} />);
  fireEvent.click(screen.getByRole('button', { name: 'Request a Revision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: 'Client' } });
  fireEvent.change(screen.getByLabelText('What would you like changed or added?'), { target: { value: 'Please add online ordering.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Request a Revision' }));
  const dialog = await screen.findByRole('dialog', { name: 'Request a revised quotation?' });
  expect(dialog).toHaveTextContent('link will no longer be available once your request is sent');
  expect(screen.getByRole('link', { name: 'sales@zerooneitinc.com' })).toHaveAttribute('href', 'mailto:sales@zerooneitinc.com');
  expect(screen.getByRole('button', { name: 'Go Back' })).toHaveFocus();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Print / Save Quotation PDF' }));
  await waitFor(() => expect(onPrintQuotation).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Go Back' })).toBeEnabled());
  expect(global.fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Go Back' }));
  expect(screen.getByLabelText('Verification code')).toHaveValue('123456');
  expect(screen.getByLabelText('What would you like changed or added?')).toHaveValue('Please add online ordering.');
  expect(onResponse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Request a Revision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm & Send Request' }));
  await waitFor(() => expect(onResponse).toHaveBeenCalledTimes(1));
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toMatchObject({ action: 'requote', code: '123456', name: 'Client', note: 'Please add online ordering.' });
});

test('closing the requote confirmation returns to the form without submitting the request', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ challengeId: 'challenge' }) }));
  render(<QuotationResponsePanel quotation={quotation} token="token" onResponse={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Request a Revision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
  fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: 'Client' } });
  fireEvent.change(screen.getByLabelText('What would you like changed or added?'), { target: { value: 'More reports.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Request a Revision' }));
  fireEvent(await screen.findByRole('dialog', { name: 'Request a revised quotation?' }), new Event('cancel', { cancelable: true }));
  expect(screen.getByLabelText('What would you like changed or added?')).toHaveValue('More reports.');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
