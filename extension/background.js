chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== 'capture' || !sender.tab?.id) return;
  chrome.tabs.sendMessage(sender.tab.id, {type: 'collect'}, response => {
    if (chrome.runtime.lastError) return;
    chrome.storage.local.set({capturedMessages: response?.messages || [], capturedAt: new Date().toISOString()});
    chrome.action.setBadgeText({text: String(response?.messages?.length || 0)});
    chrome.action.setBadgeBackgroundColor({color: '#16a34a'});
  });
});
