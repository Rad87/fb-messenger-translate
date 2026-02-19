/**
 * Popup script for Messenger Translator extension.
 * Controls settings toggles.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  autoTranslateIncoming: true,
  autoTranslateOutgoing: false,
  sourceLang: 'hu',
  targetLang: 'ru',
};

const toggleEnabled = document.getElementById('toggle-enabled');
const toggleIncoming = document.getElementById('toggle-incoming');
const toggleOutgoing = document.getElementById('toggle-outgoing');
const statusBar = document.getElementById('status-bar');

// Load current settings
chrome.runtime.sendMessage({ type: 'getSettings' }, (settings) => {
  settings = settings || DEFAULT_SETTINGS;
  toggleEnabled.checked = settings.enabled;
  toggleIncoming.checked = settings.autoTranslateIncoming;
  toggleOutgoing.checked = settings.autoTranslateOutgoing;
  updateStatusBar(settings.enabled);
});

// Save on change
function saveSettings() {
  const settings = {
    enabled: toggleEnabled.checked,
    autoTranslateIncoming: toggleIncoming.checked,
    autoTranslateOutgoing: toggleOutgoing.checked,
    sourceLang: 'hu',
    targetLang: 'ru',
  };

  chrome.runtime.sendMessage({ type: 'updateSettings', settings });
  updateStatusBar(settings.enabled);
}

function updateStatusBar(enabled) {
  statusBar.textContent = enabled ? 'Active' : 'Disabled';
  statusBar.className = `status-bar ${enabled ? 'on' : 'off'}`;
}

toggleEnabled.addEventListener('change', saveSettings);
toggleIncoming.addEventListener('change', saveSettings);
toggleOutgoing.addEventListener('change', saveSettings);
