/**
 * Background service worker for Messenger Translator extension.
 * Manages extension state and badge.
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  autoTranslateIncoming: true,
  autoTranslateOutgoing: true, // Auto-translate outgoing by default
  sourceLang: 'hu',  // Language of incoming messages (Hungarian)
  targetLang: 'ru',  // Language to translate TO (Russian)
};

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get('settings');
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  updateBadge(stored.settings?.enabled ?? DEFAULT_SETTINGS.enabled);
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get('settings').then(({ settings }) => {
      sendResponse(settings || DEFAULT_SETTINGS);
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'updateSettings') {
    chrome.storage.local.set({ settings: message.settings }).then(() => {
      updateBadge(message.settings.enabled);
      // Notify all messenger tabs about settings change
      chrome.tabs.query({
        url: ['https://www.messenger.com/*', 'https://www.facebook.com/messages/*']
      }).then(tabs => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'settingsUpdated',
            settings: message.settings
          }).catch(() => {}); // Tab might not have content script
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }
});

function updateBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? '#2ecc71' : '#e74c3c'
  });
}
