(() => {
  const button = document.createElement('button');
  button.id = 'wib-create-issue'; button.textContent = '＋ Create GitHub issue';
  button.title = 'Capture the selected WhatsApp messages';
  button.onclick = () => chrome.runtime.sendMessage({type: 'capture'});
  document.documentElement.appendChild(button);

  function textFromNode(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('button, svg, [role="button"], [aria-hidden="true"]').forEach(x => x.remove());
    return copy.innerText?.trim() || '';
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'collect') return;
    const candidates = [...document.querySelectorAll('[data-testid*="msg-container"], [data-pre-plain-text], div[role="row"]')];
    const selected = candidates.filter(n => n.matches('[aria-selected="true"]') || n.querySelector('[aria-checked="true"], input:checked'));
    const nodes = selected.length ? selected : candidates.filter(n => n.querySelector('[data-testid="selectable-text"], [data-pre-plain-text]')).slice(-10);
    sendResponse({messages: nodes.slice(-20).map((n, i) => ({index: i + 1, text: textFromNode(n), timestamp: n.getAttribute('data-pre-plain-text') || '', media: [...n.querySelectorAll('img, video, audio')].map(x => ({src: x.currentSrc || x.src, type: x.tagName.toLowerCase()}))})).filter(x => x.text || x.media.length)});
    return true;
  });
})();
