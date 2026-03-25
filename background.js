import { fetchAllSearchPages, fetchAllDetails, ApiError } from "./lib/kumo-api.js";
import { generateCSV } from "./lib/csv-writer.js";
import { generateXLSX } from "./lib/xlsx-writer.js";
import { todayString } from "./lib/utils.js";

// --- State (persisted to chrome.storage.session to survive SW restarts) ---
let state = {
  filters: null,
  totalCount: 0,
  totalPages: 1,
  token: null,
  lastUpdated: null,
};

let exportState = {
  active: false,
  phase: null,
  current: 0,
  total: 0,
  format: null,
  error: null,
  filename: null,
  failedDetails: 0,
};

let abortController = null;

// Allow storage.session to be accessed from content scripts too
chrome.storage.session.setAccessLevel?.({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });

// Restore state on service worker startup
async function restoreState() {
  try {
    const stored = await chrome.storage.session.get(["kumoState", "kumoExportState"]);
    if (stored.kumoState) {
      state = stored.kumoState;
    }
    if (stored.kumoExportState) {
      // Don't restore an active export — it can't resume
      exportState = { ...stored.kumoExportState, active: false };
    }
    updateBadge();
  } catch (e) {
    console.warn("[Kumo Export bg] Failed to restore state:", e);
  }
}

async function persistState() {
  try {
    await chrome.storage.session.set({
      kumoState: state,
      kumoExportState: exportState,
    });
  } catch (e) {
    console.warn("[Kumo Export bg] Failed to persist state:", e);
  }
}

// Restore on startup
restoreState();

// --- Badge ---
function updateBadge() {
  if (exportState.active) {
    chrome.action.setBadgeText({ text: "..." });
    chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
  } else if (!state.token) {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  } else if (state.filters && state.totalCount > 0) {
    const text = state.totalCount > 999 ? "999+" : String(state.totalCount);
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#1f2937" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// --- Message handling ---
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.action) {
    case "updateState":
      state.filters = msg.filters;
      state.totalCount = msg.totalCount;
      state.totalPages = msg.totalPages;
      if (msg.token) state.token = msg.token;
      state.lastUpdated = Date.now();
      updateBadge();
      persistState();
      broadcastToPopup({ type: "stateUpdate", state, exportState });
      sendResponse({ ok: true });
      break;

    case "updateToken":
      if (msg.token) state.token = msg.token;
      updateBadge();
      persistState();
      sendResponse({ ok: true });
      break;

    case "getState":
      sendResponse({ state, exportState });
      break;

    case "export":
      startExport(msg.format);
      sendResponse({ ok: true });
      break;

    case "cancelExport":
      cancelExport();
      sendResponse({ ok: true });
      break;

    default:
      sendResponse({ error: "Unknown action" });
  }
  return true;
});

function broadcastToPopup(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Popup not open — ignore
  });
}

// --- Export ---
async function startExport(format) {
  if (exportState.active) return;
  if (!state.filters || !state.token) return;

  abortController = new AbortController();
  const signal = abortController.signal;

  // Keep service worker alive during export
  chrome.alarms.create("keepalive", { periodInMinutes: 0.4 });

  exportState = {
    active: true,
    phase: "search",
    current: 0,
    total: state.totalPages,
    format,
    error: null,
    filename: null,
    failedDetails: 0,
  };
  updateBadge();
  persistState();
  broadcastToPopup({ type: "exportUpdate", exportState });

  try {
    // Phase 1: Search pagination
    const deals = await fetchAllSearchPages(state.filters, state.token, {
      signal,
      onProgress: (p) => {
        exportState.phase = "search";
        exportState.current = p.current;
        exportState.total = p.total;
        broadcastToPopup({ type: "exportUpdate", exportState });
      },
    });

    if (signal.aborted) return;

    // Phase 2: Detail fetches
    exportState.phase = "detail";
    exportState.current = 0;
    exportState.total = deals.length;
    broadcastToPopup({ type: "exportUpdate", exportState });

    const detailMap = await fetchAllDetails(deals, state.token, {
      signal,
      onProgress: (p) => {
        exportState.phase = "detail";
        exportState.current = p.current;
        exportState.total = p.total;
        broadcastToPopup({ type: "exportUpdate", exportState });
      },
    });

    if (signal.aborted) return;

    // Count failed details
    let failedDetails = 0;
    for (const [, val] of detailMap) {
      if (val === null) failedDetails++;
    }
    exportState.failedDetails = failedDetails;

    // Phase 3: Generate file
    exportState.phase = "generating";
    broadcastToPopup({ type: "exportUpdate", exportState });

    const dateStr = todayString();
    let blob, filename;

    if (format === "csv") {
      const csvString = generateCSV(deals, detailMap);
      blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
      filename = `kumo-export-${dateStr}.csv`;
    } else {
      const xlsxBuf = generateXLSX(deals, detailMap);
      blob = new Blob([xlsxBuf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      filename = `kumo-export-${dateStr}.xlsx`;
    }

    // Download via data URL (service workers can't use URL.createObjectURL)
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

    await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: false,
    });

    exportState.active = false;
    exportState.phase = "complete";
    exportState.filename = filename;
    updateBadge();
    persistState();

    // Flash green checkmark, then reset to ready state
    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
    setTimeout(() => {
      exportState.phase = null;
      updateBadge();
      persistState();
      broadcastToPopup({ type: "exportUpdate", exportState });
    }, 5000);

    chrome.alarms.clear("keepalive");
    broadcastToPopup({ type: "exportUpdate", exportState });
  } catch (err) {
    chrome.alarms.clear("keepalive");

    if (err.name === "AbortError") {
      exportState.active = false;
      exportState.phase = null;
      updateBadge();
      persistState();
      broadcastToPopup({ type: "exportUpdate", exportState });
      return;
    }

    exportState.active = false;
    exportState.phase = "error";
    exportState.error = err.message;
    updateBadge();
    persistState();
    broadcastToPopup({ type: "exportUpdate", exportState });
  }
}

function cancelExport() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  exportState.active = false;
  exportState.phase = null;
  updateBadge();
  persistState();
  broadcastToPopup({ type: "exportUpdate", exportState });
}

// --- Keep-alive during export ---
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepalive" && !exportState.active) {
    chrome.alarms.clear("keepalive");
  }
});
