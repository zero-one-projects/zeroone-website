// Keep fallback selection inside the active modal; browsers make the page behind it inert.
export async function copyText(text, input) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch { /* Try the selection-based clipboard API when permissions are blocked. */ }
  const previousFocus = document.activeElement;
  const temporary = !input;
  const target = input || document.createElement('textarea');
  if (temporary) {
    target.value = text;
    target.readOnly = true;
    target.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;';
    (document.querySelector('dialog[open]') || document.body).appendChild(target);
  }
  try {
    target.focus(); target.select(); target.setSelectionRange(0, text.length);
    if (!document.execCommand?.('copy')) throw new Error('Clipboard access is unavailable.');
  } finally {
    if (temporary) { target.remove(); previousFocus?.focus(); }
  }
}
