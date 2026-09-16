(() => {
  const button = document.createElement('button');
  button.id = 'wib-create-issue'; button.textContent = '＋ Create GitHub issue';
  button.title = 'Capture the selected WhatsApp messages';
  button.onclick = () => chrome.runtime.sendMessage({type: 'capture'});
  document.documentElement.appendChild(button);

  const syncSelectionButton = () => {
    const forward = [...document.querySelectorAll('button')].find(b => /^(Forward|forward media)$/.test((b.innerText || b.getAttribute('aria-label') || '').trim()));
    const selected = [...document.querySelectorAll('[role="checkbox"], input[type="checkbox"]')].filter(x => x.getAttribute('aria-checked') === 'true' || x.checked).length;
    const existing = document.getElementById('wib-inline-create-issue');
    if (!forward || !selected) { existing?.remove(); return; }
    if (existing) { existing.textContent = `Create issue (${selected})`; return; }
    const inline = document.createElement('button'); inline.id = 'wib-inline-create-issue'; inline.textContent = `Create issue (${selected})`;
    inline.style.cssText = 'margin-left:8px;padding:9px 14px;border:0;border-radius:8px;background:#16a34a;color:#fff;font:600 13px system-ui;cursor:pointer';
    inline.onclick = () => chrome.runtime.sendMessage({type: 'capture'});
    forward.parentElement?.appendChild(inline);
  };
  new MutationObserver(syncSelectionButton).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked', 'aria-selected']});
  syncSelectionButton();

  function textFromNode(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('button, svg, [role="button"], [aria-hidden="true"]').forEach(x => x.remove());
    return copy.innerText?.trim() || '';
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'collect') return;
    const candidates = [...document.querySelectorAll('[data-testid*="msg-container"], [data-pre-plain-text], div[role="row"]')];
    const selected = candidates.filter(n => n.matches('[aria-selected="true"]') || n.querySelector('[aria-checked="true"], input:checked') || n.closest('[role="row"]')?.querySelector('[aria-checked="true"], input:checked'));
    const nodes = selected.length ? selected : candidates.filter(n => n.querySelector('[data-testid="selectable-text"], [data-pre-plain-text]')).slice(-10);
    Promise.all(nodes.slice(-20).map(async (n, i) => ({index: i + 1, text: textFromNode(n), timestamp: n.getAttribute('data-pre-plain-text') || '', media: await Promise.all([...n.querySelectorAll('img, video, audio')].map(async x => { const src = x.currentSrc || x.src; try { const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer()); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return {type: x.tagName.toLowerCase(), data: btoa(binary)}; } catch { return {type: x.tagName.toLowerCase(), src}; } }))}))).then(messages => sendResponse({messages: messages.filter(x => x.text || x.media.length)}));
    return true;
  });
})();
