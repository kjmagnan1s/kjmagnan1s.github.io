/* Clipboard is progressive enhancement. Every instruction stays selectable without JS. */
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.hidden = false;
  const label = button.textContent;
  let resetTimer;
  button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copy);
    const status = document.getElementById('copy-status');
    if (!source) return;
    clearTimeout(resetTimer);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(source.textContent.trim());
      button.textContent = 'Copied';
      if (status) status.textContent = 'Copied to clipboard.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(source);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Select & copy';
      if (status) status.textContent = 'Clipboard unavailable. The instruction is selected. Copy it manually.';
    }
    resetTimer = setTimeout(() => { button.textContent = label; }, 2200);
  });
});
