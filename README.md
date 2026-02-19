# Facebook Messenger Translator (HU ↔ RU)

Chrome/Edge extension that automatically translates Facebook Messenger messages between Hungarian and Russian.

Built for Russian speakers living in Hungary who need to communicate in Hungarian group chats (school parents, local communities, etc.).

## How It Works

**Reading messages (HU → RU):**
- Hungarian messages are automatically translated to Russian
- Translations appear inline below each message with a purple accent
- Hover over a translation to see the original text

**Sending messages (RU → HU):**
- Type in Russian, press **Enter** — your message is auto-translated to Hungarian and sent
- Or use **Ctrl+Shift+T** to translate before sending
- Click the **RU** button to toggle auto-translate on/off

![Extension popup](https://img.shields.io/badge/status-active-brightgreen)

## Installation

1. Clone or download this repository
2. Open Chrome/Edge → go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the repository folder
6. Open [messenger.com](https://www.messenger.com) or [facebook.com](https://www.facebook.com) and start chatting

## Features

- **Auto-translate incoming** — all Hungarian messages get Russian translations inline
- **Auto-translate outgoing** — type Russian, send as Hungarian (on by default)
- **Keyboard shortcut** — `Ctrl+Shift+T` to translate input text
- **RU button** — visible next to the message input for quick translate/toggle
- **Popup settings** — enable/disable translation, toggle incoming/outgoing independently
- **Translation cache** — repeated phrases are translated instantly
- **Works on both** messenger.com and facebook.com chat popups
- **No API key required** — uses free Google Translate endpoint

## File Structure

```
├── manifest.json          # Chrome extension manifest (v3)
├── icons/                 # Extension icons (16, 48, 128px)
└── src/
    ├── translate.js       # Google Translate API wrapper (no key needed)
    ├── content.js         # DOM observer + inline translation logic
    ├── styles.css         # Translation display styles
    ├── background.js      # Service worker, settings management
    ├── popup.html         # Extension popup UI
    └── popup.js           # Popup settings logic
```

## How Translation Works

The extension uses the free Google Translate endpoint (`translate.googleapis.com`) — the same one used by the Google Translate website. No API key or paid plan is needed.

Translations are cached in memory to avoid repeated API calls for the same text.

## Troubleshooting

**Messages not translating:**
- Make sure the extension is enabled (click the extension icon → check toggles)
- Refresh the Facebook page after installing/updating the extension
- Facebook occasionally changes their DOM structure — if translation stops working, the selectors in `content.js` may need updating

**RU button not visible:**
- The button re-injects every 3 seconds if it disappears (Facebook re-renders the input area)
- Try switching to a different chat and back

**Translation quality:**
- Google Translate handles Hungarian ↔ Russian reasonably well for everyday conversation
- Technical or very colloquial language may be less accurate

## Customization

To change the language pair, edit the `sourceLang` and `targetLang` values in:
- `src/background.js` (default settings)
- `src/content.js` (fallback defaults)

Use standard [ISO 639-1 language codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g., `de` for German, `en` for English, `uk` for Ukrainian).

## License

MIT
