# Dex Manhwa Quick Reader

A Chrome extension (Manifest V3) that provides quick search and reading progress tracking for the [Dex Manhwa](https://dexmanhwa.dpdns.org/) manhwa reading platform.

## Features

- **Search**: Instantly search across the Dex Manhwa library from the browser action popup
- **Continue Reading**: Automatically tracks your last-read chapter per series and shows a "Continue Reading" section
- **Chapter Listing**: View all chapters for a series with visual indicators for read and next-up chapters
- **Progress Sync**: Reading progress is saved locally via `chrome.storage.local`
- **Context Menu**: Right-click any selected text to search for it on Dex Manhwa

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dex-manhwa-quick-reader` directory
5. The extension icon will appear in your browser toolbar

## Usage

1. Click the extension icon in the toolbar to open the popup
2. **Search** for a series by typing in the search box
3. Click on a series to view its chapter list
4. Click any chapter to open it in a new tab — your progress is saved automatically
5. Return to the popup anytime to see your **Continue Reading** section with series you've been reading

## API

The extension uses the Dex Manhwa API at `https://manhwa-kv-proxy.dexlot8.workers.dev/`:

| Endpoint | Description |
|----------|-------------|
| `/popular` | Returns a list of popular series with slug, title, cover_url, and chapter_count |

### Series Data Structure

```json
{
  "slug": "solo-leveling",
  "title": "Solo Leveling",
  "cover_url": "/covers/solo-leveling.webp",
  "chapter_count": 179
}
```

## File Structure

```
dex-manhwa-quick-reader/
├── manifest.json       # Chrome MV3 manifest
├── popup.html          # Extension popup UI
├── popup.js            # Search, detail view, and progress logic
├── popup.css           # Popup styling
├── background.js       # Service worker (context menu, messaging)
├── icons/              # Extension icons (16px, 48px, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # This file
```

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save reading progress per series |
| `contextMenus` | Add right-click context menu for search |

## Technical Details

- **Manifest V3** compliant
- No external dependencies or frameworks
- Vanilla JavaScript throughout
- Debounced search input (300ms)
- Lazy-loaded cover images with fallback
- Chapter list with read/next indicators
- All data stored locally — no server required

## Development

To modify the extension:

1. Make your changes to the relevant files
2. Go to `chrome://extensions/`
3. Click the **Refresh** button on the extension card
4. Reopen the popup to test

## License

MIT