// Content script (isolated world) — bridges page script (MAIN world) and extension storage.
// Writes state directly to chrome.storage.session so the popup can read it
// without depending on the service worker being alive.

function normalizeToken(token) {
  if (!token) return null;
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

// Listen for messages from the page script (MAIN world)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const { type } = event.data || {};

  if (type === "KUMO_EXPORT_STATE") {
    const { filters, totalCount, totalPages, token } = event.data;
    console.log("[Kumo Export content] Saving state to storage:", { totalCount, totalPages, hasToken: !!token, hasFilters: !!filters });

    const kumoState = {
      filters,
      totalCount,
      totalPages,
      token: normalizeToken(token),
      lastUpdated: Date.now(),
    };

    chrome.storage.session.set({ kumoState }, () => {
      if (chrome.runtime.lastError) {
        console.error("[Kumo Export content] storage.session.set failed:", chrome.runtime.lastError);
      } else {
        console.log("[Kumo Export content] State saved to storage successfully");
      }
    });

    // Also notify service worker (for badge updates)
    chrome.runtime.sendMessage({
      action: "updateState",
      ...kumoState,
    }).catch(() => {});
  }

  if (type === "KUMO_EXPORT_TOKEN") {
    const token = normalizeToken(event.data.token);
    console.log("[Kumo Export content] Token update, hasToken:", !!token);

    // Only notify service worker — don't write to storage here.
    // The KUMO_EXPORT_STATE handler writes the full state including token.
    // Writing here would race with the state write and overwrite filters.
    chrome.runtime.sendMessage({
      action: "updateToken",
      token,
    }).catch(() => {});
  }
});
