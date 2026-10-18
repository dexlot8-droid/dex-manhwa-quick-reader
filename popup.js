/**
 * Dex Manhwa Quick Reader - Popup Script
 * Handles search, series detail view, chapter listing, and reading progress tracking.
 */

(function () {
  'use strict';

  // --- Constants ---
  const API_BASE = 'https://manhwa-kv-proxy.dexlot8.workers.dev';
  const SITE_BASE = 'https://dexmanhwa.dpdns.org';
  const COVER_BASE = 'https://dexmanhwa.dpdns.org';

  // --- DOM Elements ---
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchStatus = document.getElementById('search-status');
  const continueSection = document.getElementById('continue-reading');
  const continueList = document.getElementById('continue-list');
  const seriesDetail = document.getElementById('series-detail');
  const seriesInfo = document.getElementById('series-info');
  const chapterList = document.getElementById('chapter-list');
  const backBtn = document.getElementById('back-btn');

  // --- State ---
  let allSeries = [];
  let currentSeries = null;
  let searchDebounceTimer = null;

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    bindEvents();
    await fetchAllSeries();
    await loadContinueReading();
  }

  function bindEvents() {
    searchInput.addEventListener('input', onSearchInput);
    backBtn.addEventListener('click', showMainView);
  }

  // --- Continue Reading ---
  async function loadContinueReading() {
    try {
      const data = await chrome.storage.local.get('readingProgress');
      const progress = data.readingProgress || {};

      const entries = Object.entries(progress);
      if (entries.length === 0) {
        continueSection.classList.add('hidden');
        return;
      }

      continueSection.classList.remove('hidden');
      continueList.innerHTML = '';

      // Sort by last read date, most recent first
      entries.sort((a, b) => (b[1].lastReadAt || 0) - (a[1].lastReadAt || 0));

      for (const [slug, info] of entries) {
        const series = allSeries.find(s => s.slug === slug);
        const title = series ? series.title : slug;
        const cover = series ? resolveCoverUrl(series.cover_url) : '';
        const chapterNum = info.chapterNumber || '?';

        const card = createSeriesCard(slug, title, cover, chapterNum, true);
        continueList.appendChild(card);
      }
    } catch (err) {
      console.error('Failed to load continue reading:', err);
    }
  }

  // --- Series Fetching ---
  async function fetchAllSeries() {
    try {
      const resp = await fetch(`${API_BASE}/popular`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      allSeries = data.series || [];
    } catch (err) {
      console.error('Failed to fetch series list:', err);
      showStatus('Failed to load series list. Please try again.');
    }
  }

  // --- Search ---
  function onSearchInput(e) {
    clearTimeout(searchDebounceTimer);
    const query = e.target.value.trim();

    if (!query) {
      searchResults.innerHTML = '';
      searchStatus.classList.add('hidden');
      return;
    }

    searchDebounceTimer = setTimeout(() => performSearch(query), 300);
  }

  function performSearch(query) {
    showStatus('Searching...');

    const q = query.toLowerCase();
    const matches = allSeries.filter(s =>
      s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
    );

    searchResults.innerHTML = '';

    if (matches.length === 0) {
      showStatus(`No results found for "${query}"`);
      return;
    }

    searchStatus.classList.add('hidden');

    for (const series of matches) {
      const cover = resolveCoverUrl(series.cover_url);
      const card = createSeriesCard(series.slug, series.title, cover, series.chapter_count);
      searchResults.appendChild(card);
    }
  }

  function showStatus(msg) {
    searchStatus.textContent = msg;
    searchStatus.classList.remove('hidden');
  }

  // --- Series Card ---
  function createSeriesCard(slug, title, cover, chapterCount, isContinue) {
    const card = document.createElement('div');
    card.className = 'series-card';
    card.dataset.slug = slug;

    const img = document.createElement('img');
    img.src = cover;
    img.alt = title;
    img.loading = 'lazy';
    img.onerror = () => { img.src = 'icons/icon48.png'; };
    img.className = 'cover';

    const info = document.createElement('div');
    info.className = 'series-info';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.className = 'series-title';

    const meta = document.createElement('p');
    meta.className = 'series-meta';
    if (isContinue) {
      meta.textContent = `Chapter ${chapterCount} - Tap to continue`;
    } else {
      meta.textContent = `${chapterCount} chapters`;
    }

    info.appendChild(titleEl);
    info.appendChild(meta);
    card.appendChild(img);
    card.appendChild(info);

    card.addEventListener('click', () => onSeriesClick(slug));

    return card;
  }

  // --- Series Detail ---
  async function onSeriesClick(slug) {
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchStatus.classList.add('hidden');

    seriesDetail.classList.remove('hidden');
    continueSection.classList.add('hidden');

    chapterList.innerHTML = '<p class="loading">Loading chapters...</p>';

    try {
      // Fetch series detail from the site's API or scrape
      const series = allSeries.find(s => s.slug === slug);
      if (!series) {
        chapterList.innerHTML = '<p class="error">Series not found.</p>';
        return;
      }

      currentSeries = series;

      // Display series info
      const cover = resolveCoverUrl(series.cover_url);
      seriesInfo.innerHTML = `
        <div class="detail-header">
          <img src="${cover}" alt="${series.title}" class="detail-cover" onerror="this.src='icons/icon48.png'">
          <div class="detail-meta">
            <h2>${series.title}</h2>
            <p>${series.chapter_count} chapters</p>
            <a href="${SITE_BASE}/series/${slug}" target="_blank" rel="noopener" class="view-site-btn">View on Site</a>
          </div>
        </div>
      `;

      // Fetch chapter list
      await fetchChapters(slug);
    } catch (err) {
      console.error('Failed to load series detail:', err);
      chapterList.innerHTML = '<p class="error">Failed to load series. Please try again.</p>';
    }
  }

  async function fetchChapters(slug) {
    try {
      // Try the API endpoint for chapters
      const resp = await fetch(`${API_BASE}/series/${slug}`);
      let chapters = [];

      if (resp.ok) {
        const data = await resp.json();
        chapters = data.chapters || [];
      }

      if (chapters.length === 0) {
        // Fallback: generate chapter links from chapter count
        const series = allSeries.find(s => s.slug === slug);
        const count = series ? series.chapter_count : 0;
        chapters = Array.from({ length: count }, (_, i) => ({
          number: i + 1,
          title: `Chapter ${i + 1}`
        }));
      }

      renderChapterList(slug, chapters);
    } catch (err) {
      console.error('Failed to fetch chapters:', err);
      chapterList.innerHTML = '<p class="error">Failed to load chapters.</p>';
    }
  }

  function renderChapterList(slug, chapters) {
    chapterList.innerHTML = '';

    // Get saved progress for this series
    chrome.storage.local.get('readingProgress', (data) => {
      const progress = data.readingProgress || {};
      const saved = progress[slug];
      const lastChapter = saved ? saved.chapterNumber : 0;

      // Mark the next chapter to read
      const nextChapter = lastChapter + 1;

      for (const ch of chapters) {
        const chNum = ch.number;
        const item = document.createElement('div');
        item.className = 'chapter-item';

        if (chNum === nextChapter && lastChapter > 0) {
          item.classList.add('next-chapter');
        } else if (chNum <= lastChapter) {
          item.classList.add('read');
        }

        const link = document.createElement('a');
        link.href = `${SITE_BASE}/series/${slug}/chapter/${chNum}`;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'chapter-link';

        const chTitle = document.createElement('span');
        chTitle.className = 'chapter-title';
        chTitle.textContent = ch.title || `Chapter ${chNum}`;

        link.appendChild(chTitle);

        // Save progress on click
        link.addEventListener('click', (e) => {
          e.preventDefault();
          saveReadingProgress(slug, chNum);
          window.open(link.href, '_blank');
        });

        item.appendChild(link);
        chapterList.appendChild(item);
      }
    });
  }

  // --- Reading Progress ---
  async function saveReadingProgress(slug, chapterNumber) {
    try {
      const data = await chrome.storage.local.get('readingProgress');
      const progress = data.readingProgress || {};

      progress[slug] = {
        chapterNumber: chapterNumber,
        lastReadAt: Date.now()
      };

      await chrome.storage.local.set({ readingProgress: progress });
    } catch (err) {
      console.error('Failed to save reading progress:', err);
    }
  }

  // --- Navigation ---
  function showMainView() {
    seriesDetail.classList.add('hidden');
    continueSection.classList.remove('hidden');
    loadContinueReading();
  }

  // --- Utility ---
  function resolveCoverUrl(coverUrl) {
    if (!coverUrl) return 'icons/icon48.png';
    if (coverUrl.startsWith('http')) return coverUrl;
    return `${COVER_BASE}${coverUrl}`;
  }
})();