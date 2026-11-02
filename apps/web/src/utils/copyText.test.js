import { copyText } from './copyText';
const originalClipboard = navigator.clipboard;
const originalCommand = document.execCommand;
afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
  document.execCommand = originalCommand;
  document.body.innerHTML = '';
});
test('writes directly through the clipboard API when available', async () => {
  const writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await copyText('https://example.test/quotation/original');
  expect(writeText).toHaveBeenCalledWith('https://example.test/quotation/original');
});
test('blocked clipboard uses the selected link inside the dialog', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('blocked')) } });
  document.body.innerHTML = '<dialog open><input readonly value="https://example.test/quotation/original"></dialog>';
  const input = document.querySelector('input');
  document.execCommand = jest.fn(() => {
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    return true;
  });
  await copyText(input.value, input);
  expect(document.execCommand).toHaveBeenCalledWith('copy');
});
test('missing clipboard API copies from a temporary field inside an active dialog and cleans up', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  document.body.innerHTML = '<dialog open><button>Copy</button></dialog>';
  const button = document.querySelector('button'); button.focus();
  document.execCommand = jest.fn(() => {
    expect(document.querySelector('dialog textarea').value).toBe('link'); return true;
  });
  await copyText('link');
  expect(document.querySelector('textarea')).toBeNull();
  expect(document.activeElement).toBe(button);
});
test('failed copying rejects instead of reporting success', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  document.execCommand = jest.fn(() => false);
  await expect(copyText('link')).rejects.toThrow('Clipboard access');
  expect(document.querySelector('textarea')).toBeNull();
});
