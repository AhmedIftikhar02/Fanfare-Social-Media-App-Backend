// src/modules/news/news.service.js

const axios                                = require('axios');
const config                               = require('../../config');
const { readCache, writeCache, readStale } = require('../../utils/apiCache');

// ─── Constants ────────────────────────────────────────────────────────────────
const NEWS_TTL_SECONDS = 900; // 15 minutes — news headlines stay stable
const MAX_ARTICLES     = 20;
const CURRENTS_BASE    = 'https://api.currentsapi.services/v1';

// ─── Helper: cache key (per language + category parameters) ──────────────────
const newsCacheKey = (language, category) =>
  `news_latest_${language}${category ? `_${category}` : ''}`;

// ─── Helper: shape an article smoothly for Android UI layers ────────────────
const formatArticle = (article) => {
  if (!article) return {};

  let formattedCategory = [];
  if (Array.isArray(article.category)) {
    formattedCategory = article.category;
  } else if (article.category) {
    formattedCategory = [article.category];
  }

  let formattedAuthor = null;
  if (Array.isArray(article.author)) {
    formattedAuthor = article.author.filter(Boolean).join(', ');
  } else if (article.author) {
    formattedAuthor = article.author;
  }

  return {
    id:          article.id || null,
    title:       article.title || 'Untitled',
    description: article.description || null,
    url:         article.url || '#',
    image:       article.image && article.image !== 'None' ? article.image : null,
    published:   article.published || new Date().toISOString(),
    author:      formattedAuthor,
    category:    formattedCategory,
  };
};

// ─── Get Latest News ─────────────────────────────────────────────────────────
exports.getLatestNews = async ({ language = 'en', category } = {}) => {
  const cacheKey = newsCacheKey(language, category);

  // Read fresh memory caching from database layer
  const cached = await readCache(cacheKey, NEWS_TTL_SECONDS);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    const params = {
      language,
      apiKey: config.currents.key,
    };
    if (category) params.category = category;

    const { data } = await axios.get(`${CURRENTS_BASE}/latest-news`, {
      params,
      timeout: 8000,
    });

    const articles = (data?.news || [])
      .filter((a) => a && a.title && a.url) // drop corrupt metadata schemas
      .slice(0, MAX_ARTICLES)
      .map(formatArticle);

    const payload = {
      articles,
      total:     articles.length,
      language,
      category:  category || null,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };

    await writeCache(cacheKey, payload);
    return payload;
  } catch (err) {
    // Graceful degradation layer — serve stale data rather than blowing up with 500
    const stale = await readStale(cacheKey);
    if (stale) return { ...stale, fromCache: true, stale: true };

    return {
      articles:  [],
      total:     0,
      language,
      category:  category || null,
      fetchedAt: null,
      fromCache: false,
      error:     'External News API gateway temporarily down or quota exceeded',
    };
  }
};