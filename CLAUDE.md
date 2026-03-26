# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Chrome MV3 extension that exports deal search results from Kumo (app.withkumo.com) to CSV or Excel. It intercepts Kumo's API calls to capture search filters and auth tokens, then uses those to paginate through results and fetch deal details for export.

## Build Commands

- `npm run build` — bundles `background.js` → `dist/background.bundle.js` via esbuild
- `npm run watch` — rebuilds on changes

Only `background.js` is bundled (it imports from `lib/`). The other entry points (`content.js`, `page-script.js`, `popup.js`) are loaded directly by the manifest — they are not bundled.

## Architecture

Three execution contexts communicate via message passing:

1. **Page script** (`page-script.js`) — runs in MAIN world on `app.withkumo.com`. Monkey-patches `window.fetch` to intercept deals search API responses and reads `localStorage` for the auth token. Posts data to the content script via `window.postMessage`.

2. **Content script** (`content.js`) — runs in isolated world. Bridges the page script and extension: receives `window.postMessage` events, writes state to `chrome.storage.session`, and forwards to the service worker via `chrome.runtime.sendMessage`.

3. **Service worker** (`background.js`) — bundled with esbuild. Owns export orchestration: paginated search fetch → concurrent detail fetches → CSV/XLSX generation → `chrome.downloads`. Persists state to `chrome.storage.session` to survive SW restarts. Uses `chrome.alarms` keepalive during exports.

4. **Popup** (`popup.js` / `popup.html` / `popup.css`) — reads state from `chrome.storage.session` on open, listens for live updates via `chrome.runtime.onMessage` and `storage.session.onChanged`. State-machine UI with states: nodata, nologin, ready, exporting, complete, error.

### Key `lib/` modules

- `kumo-api.js` — API fetch helpers with timeout, auth, abort signal support. Two-phase export: search pagination then detail fetches with bounded concurrency.
- `columns.js` — column definitions and row extraction logic shared by both CSV and XLSX writers.
- `config.js` — tuneable constants (concurrency, delays, timeouts).
- `csv-writer.js` / `xlsx-writer.js` — generate export files from deals + detail map.
- `utils.js` — `mapWithConcurrency`, `sleep` (abort-aware), `todayString`.

## Key Patterns

- **Request body extraction**: `page-script.js` must handle both `fetch(url, {body})` and `fetch(new Request(...))` forms. Request bodies can only be read once — always `.clone()` before reading.
- **Service worker state**: SW can restart at any time. All state is persisted to `chrome.storage.session` and restored on startup. Active exports cannot resume after restart.
- **Isolated world limits**: Content scripts can't access page JS globals or `localStorage` — that's why the MAIN world page script exists.
- **Downloads in SW**: Service workers can't use `URL.createObjectURL`; files are downloaded via data URLs through `FileReader.readAsDataURL`.

## Distribution

`kumo-export.zip` is the distributable. Users load it unpacked via `chrome://extensions` (developer mode).
