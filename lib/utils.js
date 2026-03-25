/**
 * Run async tasks with bounded concurrency.
 * @param {Array} items
 * @param {number} concurrency
 * @param {(item, index) => Promise} fn
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>}
 */
export async function mapWithConcurrency(items, concurrency, fn, signal) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Sleep for ms milliseconds. Respects AbortSignal.
 */
export function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

/**
 * Format today's date as YYYY-MM-DD.
 */
export function todayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
