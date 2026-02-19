/**
 * Content script for Messenger Translator.
 * Observes messenger.com / facebook.com DOM for new messages and translates them.
 *
 * Strategy:
 * - Use MutationObserver to detect new messages
 * - Identify message text elements using Messenger's DOM patterns
 * - Translate incoming (HU → RU) messages inline
 * - Provide a button to translate outgoing (RU → HU) messages
 */

(() => {
  'use strict';

  // ---- State ----
  let settings = {
    enabled: true,
    autoTranslateIncoming: true,
    autoTranslateOutgoing: true,
    sourceLang: 'hu',
    targetLang: 'ru',
  };
  let observer = null;
  const processedMessages = new WeakSet();
  const MARKER_ATTR = 'data-mt-translated';

  // ---- Init ----
  async function init() {
    console.log('[Messenger Translator] Initializing');

    // Load settings
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
      if (response) settings = response;
    } catch (e) {
      console.warn('[Messenger Translator] Could not load settings, using defaults');
    }

    // Listen for settings updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'settingsUpdated') {
        settings = message.settings;
        if (!settings.enabled) {
          removeAllTranslations();
        } else {
          translateExistingMessages();
        }
      }
    });

    if (settings.enabled) {
      startObserving();
      // Initial scan after a short delay to let Messenger load
      setTimeout(() => {
        translateExistingMessages();
        injectTranslateButton();
      }, 2000);
    }

    // Re-inject button periodically (Messenger re-renders the input area)
    setInterval(() => {
      if (settings.enabled && !document.querySelector('.mt-translate-btn')) {
        injectTranslateButton();
      }
    }, 3000);
  }

  // ---- DOM Selectors ----

  /**
   * Find all message text elements in the chat.
   * Messenger wraps message text in <div dir="auto"> inside message rows.
   * We try specific selectors first, then fall back to broader ones.
   */
  function getMessageElements() {
    const selectors = [
      'div[role="row"] div[dir="auto"]',
      'div[role="gridcell"] div[dir="auto"]',
      'div[data-scope="messages_table"] div[dir="auto"]',
      'div[role="list"] div[dir="auto"]',
      'div[role="listitem"] div[dir="auto"]',
      'div[class] > div[dir="auto"]',
      'div[dir="auto"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0 && elements.length < 200) {
        const filtered = Array.from(elements).filter(el => {
          const text = el.textContent?.trim();
          if (!text || text.length < 2 || text.length > 2000) return false;
          if (el.closest('[contenteditable="true"]')) return false;
          if (el.closest('nav, header, [role="banner"], [role="navigation"]')) return false;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;
          return true;
        });
        if (filtered.length > 0) return filtered;
      }
    }
    return [];
  }

  /**
   * Check if text contains Cyrillic (Russian) characters.
   */
  function isCyrillic(text) {
    return /[\u0400-\u04FF]/.test(text);
  }

  /**
   * Check if text contains Latin characters.
   */
  function isLatin(text) {
    return /[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(text);
  }

  // ---- Translation Logic ----

  /**
   * Translate a single message element and insert translation below it.
   */
  async function translateMessageElement(element) {
    if (processedMessages.has(element) || element.hasAttribute(MARKER_ATTR)) {
      return;
    }

    const text = element.textContent?.trim();
    if (!text || text.length < 2) return;

    // Skip emojis/reactions
    if (/^[\p{Emoji}\s]+$/u.test(text)) return;

    // Skip if text is already in Russian (Cyrillic only, no Latin)
    if (isCyrillic(text) && !isLatin(text)) return;

    // Mark as being processed
    processedMessages.add(element);
    element.setAttribute(MARKER_ATTR, 'true');

    // Create translation element
    const translationDiv = document.createElement('div');
    translationDiv.className = 'mt-translation mt-loading';
    translationDiv.textContent = '...';

    // Insert after the message text
    element.parentElement.insertBefore(translationDiv, element.nextSibling);

    try {
      const translated = await TranslateAPI.huToRu(text);
      if (translated) {
        translationDiv.textContent = translated;
        translationDiv.classList.remove('mt-loading');
        translationDiv.title = `Original: ${text}`;
      } else {
        translationDiv.textContent = '[Translation failed]';
        translationDiv.classList.remove('mt-loading');
        translationDiv.classList.add('mt-error');
      }
    } catch (error) {
      translationDiv.textContent = '[Translation error]';
      translationDiv.classList.remove('mt-loading');
      translationDiv.classList.add('mt-error');
      console.error('[Messenger Translator]', error);
    }
  }

  /**
   * Scan and translate all visible messages.
   */
  function translateExistingMessages() {
    if (!settings.enabled || !settings.autoTranslateIncoming) return;
    const messages = getMessageElements();
    for (const msg of messages) {
      translateMessageElement(msg);
    }
  }

  /**
   * Remove all injected translations.
   */
  function removeAllTranslations() {
    document.querySelectorAll('.mt-translation').forEach(el => el.remove());
    document.querySelectorAll(`[${MARKER_ATTR}]`).forEach(el => {
      el.removeAttribute(MARKER_ATTR);
      processedMessages.delete(el);
    });
  }

  // ---- Outgoing Message Translation ----

  function getInputArea() {
    const selectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"][aria-label]',
      'p[contenteditable="true"]',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function getInputText(inputArea) {
    return inputArea.textContent?.trim() || '';
  }

  function setInputText(inputArea, text) {
    inputArea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));
    inputArea.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Inject the translate button near the input area.
   */
  function injectTranslateButton() {
    if (document.querySelector('.mt-translate-btn')) return;

    const inputArea = getInputArea();
    if (!inputArea) return;

    const inputContainer = inputArea.closest('div[role="toolbar"]')?.parentElement
      || inputArea.parentElement?.parentElement
      || inputArea.parentElement;

    if (!inputContainer) return;

    const btn = document.createElement('button');
    btn.className = 'mt-translate-btn';
    btn.textContent = 'RU';
    btn.title = 'Translate Russian → Hungarian (Ctrl+Shift+T)';

    let autoMode = settings.autoTranslateOutgoing;
    if (autoMode) btn.classList.add('mt-active');

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = getInputText(inputArea);
      if (text && isCyrillic(text)) {
        btn.textContent = '...';
        const translated = await TranslateAPI.ruToHu(text);
        if (translated) {
          setInputText(inputArea, translated);
          showStatus(`Translated: "${text}" → "${translated}"`);
        }
        btn.textContent = 'RU';
      } else {
        autoMode = !autoMode;
        btn.classList.toggle('mt-active', autoMode);
        btn.title = autoMode
          ? 'Auto-translate ON — Russian text will be sent as Hungarian'
          : 'Translate Russian → Hungarian (click or Ctrl+Shift+T)';
        showStatus(autoMode ? 'Auto-translate: ON' : 'Auto-translate: OFF');
      }
    });

    try {
      const toolbar = inputArea.closest('form') || inputContainer;
      toolbar.style.position = 'relative';
      inputContainer.insertBefore(btn, inputArea.parentElement || inputArea);
    } catch {
      inputContainer.appendChild(btn);
    }

    // Keyboard shortcut: Ctrl+Shift+T
    document.addEventListener('keydown', async (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        const text = getInputText(inputArea);
        if (text && isCyrillic(text)) {
          const translated = await TranslateAPI.ruToHu(text);
          if (translated) {
            setInputText(inputArea, translated);
            showStatus('Translated to Hungarian');
          }
        }
      }
    });

    // Intercept Enter key for auto-translate mode
    inputArea.addEventListener('keydown', async (e) => {
      if (!autoMode) return;
      if (e.key !== 'Enter' || e.shiftKey) return;

      const text = getInputText(inputArea);
      if (!text || !isCyrillic(text)) return;

      e.preventDefault();
      e.stopPropagation();

      btn.textContent = '...';
      const translated = await TranslateAPI.ruToHu(text);
      if (translated) {
        setInputText(inputArea, translated);
        showStatus('Translated → sending...');

        setTimeout(() => {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          inputArea.dispatchEvent(enterEvent);
          btn.textContent = 'RU';
        }, 200);
      } else {
        btn.textContent = 'RU';
        showStatus('Translation failed — sending original');
      }
    }, true);
  }

  // ---- Status Notification ----

  let statusEl = null;
  let statusTimeout = null;

  function showStatus(message) {
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'mt-status';
      document.body.appendChild(statusEl);
    }
    statusEl.textContent = message;
    statusEl.classList.add('mt-visible');
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      statusEl.classList.remove('mt-visible');
    }, 2500);
  }

  // ---- MutationObserver ----

  function startObserving() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      if (!settings.enabled || !settings.autoTranslateIncoming) return;

      let hasNewMessages = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          const textElements = node.querySelectorAll
            ? node.querySelectorAll('div[dir="auto"]')
            : [];

          if (textElements.length > 0) {
            hasNewMessages = true;
            for (const el of textElements) {
              translateMessageElement(el);
            }
          }

          if (node.matches && node.matches('div[dir="auto"]')) {
            hasNewMessages = true;
            translateMessageElement(node);
          }
        }
      }

      if (hasNewMessages && !document.querySelector('.mt-translate-btn')) {
        injectTranslateButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('[Messenger Translator] Observer started');
  }

  // ---- Start ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
