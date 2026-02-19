/**
 * Translation module using free Google Translate API.
 * No API key required — uses the same endpoint as translate.google.com.
 */

const TranslateAPI = (() => {
  const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
  const cache = new Map();
  const MAX_CACHE_SIZE = 500;

  /**
   * Translate text using free Google Translate.
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code (e.g., 'hu', 'ru')
   * @param {string} targetLang - Target language code (e.g., 'ru', 'hu')
   * @returns {Promise<string>} Translated text
   */
  async function translate(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';

    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLang,
      tl: targetLang,
      dt: 't',
      q: text
    });

    try {
      const response = await fetch(`${ENDPOINT}?${params}`);
      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      // Response format: [[["translated text","original text",null,null,10]],null,"hu"]
      const translated = data[0]
        .map(segment => segment[0])
        .filter(Boolean)
        .join('');

      // Manage cache size
      if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(cacheKey, translated);

      return translated;
    } catch (error) {
      console.error('[Messenger Translator] Translation error:', error);
      return null;
    }
  }

  /**
   * Translate Hungarian → Russian
   */
  async function huToRu(text) {
    return translate(text, 'hu', 'ru');
  }

  /**
   * Translate Russian → Hungarian
   */
  async function ruToHu(text) {
    return translate(text, 'ru', 'hu');
  }

  /**
   * Detect language of text.
   * Returns language code.
   */
  async function detectLanguage(text) {
    if (!text || !text.trim()) return null;

    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: 'en',
      dt: 't',
      q: text
    });

    try {
      const response = await fetch(`${ENDPOINT}?${params}`);
      const data = await response.json();
      // The detected language is in data[2]
      return data[2];
    } catch (error) {
      console.error('[Messenger Translator] Language detection error:', error);
      return null;
    }
  }

  return { translate, huToRu, ruToHu, detectLanguage };
})();
