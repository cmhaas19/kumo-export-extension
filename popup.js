// Popup logic — state display, export triggers, progress.

const STALE_MS = 10 * 60 * 1000;

// Elements
const stateNodata = document.getElementById("state-nodata");
const stateNologin = document.getElementById("state-nologin");
const stateReady = document.getElementById("state-ready");
const stateExporting = document.getElementById("state-exporting");
const stateComplete = document.getElementById("state-complete");
const stateError = document.getElementById("state-error");

const dealCount = document.getElementById("deal-count");
const lastUpdated = document.getElementById("last-updated");

const exportLabel = document.getElementById("export-label");
const progressBar = document.getElementById("progress-bar");
const progressDetail = document.getElementById("progress-detail");

const completeText = document.getElementById("complete-text");
const completeFilename = document.getElementById("complete-filename");
const completeWarning = document.getElementById("complete-warning");

const errorMessage = document.getElementById("error-message");

const copyTokenBtn = document.getElementById("btn-copy-token");

let completeTimer = null;

// --- Show one state, hide all others ---
function showState(id) {
  for (const el of [stateNodata, stateNologin, stateReady, stateExporting, stateComplete, stateError]) {
    el.hidden = true;
  }
  document.getElementById(id).hidden = false;
}

// --- Copy token button ---
let currentToken = null;

function updateCopyTokenBtn(token) {
  currentToken = token || null;
  copyTokenBtn.hidden = !currentToken;
}

copyTokenBtn.addEventListener("click", async () => {
  if (!currentToken) return;
  // Strip "Bearer " prefix for a clean token
  const raw = currentToken.startsWith("Bearer ") ? currentToken.slice(7) : currentToken;
  await navigator.clipboard.writeText(raw);
  copyTokenBtn.textContent = "Copied!";
  setTimeout(() => { copyTokenBtn.textContent = "Copy Token"; }, 1500);
});

// --- Render based on state + exportState ---
function render(state, exportState) {
  updateCopyTokenBtn(state?.token);
  if (exportState?.active) {
    showState("state-exporting");
    renderExporting(exportState);
    return;
  }

  if (exportState?.phase === "complete") {
    showState("state-complete");
    renderComplete(state, exportState);
    // Auto-reset to ready state after 5 seconds
    clearTimeout(completeTimer);
    completeTimer = setTimeout(() => {
      chrome.storage.session.set({ kumoExportState: {} });
    }, 5000);
    return;
  }

  if (exportState?.phase === "error") {
    showState("state-error");
    errorMessage.textContent = "⚠ " + (exportState.error || "Export failed");
    return;
  }

  if (!state?.filters) {
    showState("state-nodata");
    return;
  }

  if (!state?.token) {
    showState("state-nologin");
    return;
  }

  showState("state-ready");
  dealCount.textContent = state.totalCount.toLocaleString();

  if (state.lastUpdated) {
    const ago = Date.now() - state.lastUpdated;
    lastUpdated.textContent = "Last updated: " + formatAgo(ago);
    if (ago > STALE_MS) {
      lastUpdated.classList.add("stale");
      lastUpdated.textContent += " — Refresh the Kumo page for updated results";
    } else {
      lastUpdated.classList.remove("stale");
    }
  }
}

function renderExporting(es) {
  const format = es.format === "csv" ? "CSV" : "Excel";
  exportLabel.textContent = `Exporting to ${format}...`;

  if (es.phase === "search") {
    progressDetail.textContent = `Fetching listings... Page ${es.current} of ${es.total}`;
    const pct = es.total > 0 ? (es.current / es.total) * 30 : 0;
    progressBar.style.width = pct + "%";
  } else if (es.phase === "detail") {
    progressDetail.textContent = `Fetching details: ${es.current} of ${es.total}`;
    const pct = es.total > 0 ? 30 + (es.current / es.total) * 65 : 30;
    progressBar.style.width = pct + "%";
  } else if (es.phase === "generating") {
    progressDetail.textContent = "Generating file...";
    progressBar.style.width = "95%";
  }
}

function renderComplete(state, es) {
  const count = state?.totalCount || 0;
  completeText.textContent = `Exported ${count} deals`;
  completeFilename.textContent = es.filename || "";

  if (es.failedDetails > 0) {
    completeWarning.textContent = `${es.failedDetails} listing(s) exported without details.`;
    completeWarning.hidden = false;
  } else {
    completeWarning.hidden = true;
  }
}

function formatAgo(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min} min ago`;
}

// --- Export button handler ---
function doExport(format) {
  chrome.runtime.sendMessage({ action: "export", format });
}

// All CSV buttons
for (const btn of [document.getElementById("btn-csv"), document.getElementById("btn-csv-2"), document.getElementById("btn-csv-3")]) {
  btn.addEventListener("click", () => doExport("csv"));
}

// All Excel buttons
for (const btn of [document.getElementById("btn-xlsx"), document.getElementById("btn-xlsx-2"), document.getElementById("btn-xlsx-3")]) {
  btn.addEventListener("click", () => doExport("xlsx"));
}

// Cancel button
document.getElementById("btn-cancel").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "cancelExport" });
});

// --- Listen for live updates from service worker ---
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "stateUpdate") {
    render(msg.state, msg.exportState);
  } else if (msg.type === "exportUpdate") {
    // Need state too for rendering — read from storage
    chrome.storage.session.get(["kumoState"], (stored) => {
      render(stored.kumoState || {}, msg.exportState);
    });
  }
});

// --- Listen for storage changes (catches updates even if SW broadcast is missed) ---
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.kumoState || changes.kumoExportState) {
    loadFromStorage();
  }
});

function loadFromStorage() {
  chrome.storage.session.get(["kumoState", "kumoExportState"], (stored) => {
    console.log("[Kumo Export popup] Read from storage:", {
      hasState: !!stored.kumoState,
      hasFilters: !!stored.kumoState?.filters,
      totalCount: stored.kumoState?.totalCount,
    });
    const s = stored.kumoState || {};
    const es = stored.kumoExportState || {};
    render(s, es);
  });
}

// --- Initial load: read directly from storage ---
loadFromStorage();
