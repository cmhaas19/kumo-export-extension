import { DETAIL_CONCURRENCY, DETAIL_DELAY_MS, SEARCH_DELAY_MS, REQUEST_TIMEOUT_MS } from "./config.js";
import { mapWithConcurrency, sleep } from "./utils.js";

const SEARCH_URL = "https://api.withkumo.com/api/deals/index";
const DETAIL_URL = "https://apiv2.withkumo.com/deals";

/**
 * Fetch with timeout and auth.
 */
async function apiFetch(url, token, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Merge signals if caller provides one
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (resp.status === 401) {
      throw new ApiError("Session expired. Please refresh the Kumo page and log in again.", 401);
    }
    if (!resp.ok) {
      throw new ApiError(`API error: ${resp.status} ${resp.statusText}`, resp.status);
    }
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Fetch all search pages. Calls onProgress({ phase: "search", current, total }) for each page.
 * Returns flat array of deal objects.
 */
export async function fetchAllSearchPages(filters, token, { signal, onProgress } = {}) {
  const deals = [];
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const resp = await apiFetch(SEARCH_URL, token, {
      method: "POST",
      body: JSON.stringify({ filters, page }),
      signal,
    });

    const body = await resp.json();
    const pageDeals = body.data || [];
    deals.push(...pageDeals);

    if (page === 1) {
      totalPages = body.meta?.total_pages ?? 1;
    }

    onProgress?.({ phase: "search", current: page, total: totalPages });

    if (page < totalPages && SEARCH_DELAY_MS > 0) {
      await sleep(SEARCH_DELAY_MS, signal);
    }
  }

  return deals;
}

/**
 * Fetch detail for a single deal. Returns the detail data or null on failure.
 */
async function fetchDealDetail(dealId, token, signal) {
  try {
    const resp = await apiFetch(`${DETAIL_URL}/${dealId}`, token, { signal });
    const body = await resp.json();
    return body.data || body;
  } catch (err) {
    if (err.status === 401) throw err; // re-throw auth errors
    // Graceful degradation: skip this deal's details
    console.warn(`Failed to fetch detail for deal ${dealId}:`, err.message);
    return null;
  }
}

/**
 * Fetch details for all deals with bounded concurrency.
 * Returns a Map<dealId, detailData>.
 * Calls onProgress({ phase: "detail", current, total }) after each fetch.
 */
export async function fetchAllDetails(deals, token, { signal, onProgress } = {}) {
  const detailMap = new Map();
  let completed = 0;
  const total = deals.length;

  await mapWithConcurrency(
    deals,
    DETAIL_CONCURRENCY,
    async (deal) => {
      const detail = await fetchDealDetail(deal.id, token, signal);
      detailMap.set(deal.id, detail);
      completed++;
      onProgress?.({ phase: "detail", current: completed, total });

      if (DETAIL_DELAY_MS > 0) {
        await sleep(DETAIL_DELAY_MS, signal);
      }
    },
    signal
  );

  return detailMap;
}
