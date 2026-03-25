// Tuneable constants
export const DETAIL_CONCURRENCY = 5;     // parallel detail fetches
export const DETAIL_DELAY_MS = 0;        // delay between batches (ms), increase if rate-limited
export const SEARCH_DELAY_MS = 0;        // delay between search page fetches (ms)
export const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
export const TOKEN_POLL_INTERVAL_MS = 5000; // 5 seconds
export const REQUEST_TIMEOUT_MS = 30000;   // 30 seconds per request
