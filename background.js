/**
 * Dex Manhwa Quick Reader - Background Service Worker
 * Handles context menu creation and cross-tab messaging for reading progress sync.
 */

(function () {
  'use strict';

  // --- Constants ---
  const SITE_BASE = 'https://dexmanhwa.dpdns.org';

  // --- Initialization ---
  chrome.runtime.onInstalled.addListener(onInstalled);
  chrome.runtime.onMessage.addListener(onMessage);

  // --- Context Menu ---
  function onInstalled() {
    chrome.contextMenus.create({
      id: 'dexManhwaSearch',
      title: 'Search Dex Manhwa for "%s"',
      contexts: ['selection']
    });
  }

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'dexManhwaSearch' && info.selectionText) {
      const query = encodeURIComponent(info.selectionText.trim());
      chrome.tabs.create({
        url: `${SITE_BASE}/search?q=${query}`
      });
    }
  });

  // --- Message Handler ---
  function onMessage(request, sender, sendResponse) {
    if (request.action === 'getProgress') {
      chrome.storage.local.get('readingProgress', (data) => {
        sendResponse({ progress: data.readingProgress || {} });
      });
      return true; // Keep message channel open for async response
    }

    if (request.action === 'saveProgress') {
      saveProgress(request.slug, request.chapterNumber);
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'clearProgress') {
      clearProgress(request.slug);
      sendResponse({ success: true });
      return true;
    }
  }

  // --- Storage Helpers ---
  function saveProgress(slug, chapterNumber) {
    chrome.storage.local.get('readingProgress', (data) => {
      const progress = data.readingProgress || {};
      progress[slug] = {
        chapterNumber: chapterNumber,
        lastReadAt: Date.now()
      };
      chrome.storage.local.set({ readingProgress: progress });
    });
  }

  function clearProgress(slug) {
    chrome.storage.local.get('readingProgress', (data) => {
      const progress = data.readingProgress || {};
      delete progress[slug];
      chrome.storage.local.set({ readingProgress: progress });
    });
  }
})();