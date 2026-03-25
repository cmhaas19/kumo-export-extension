const fs = require("fs");

function img(name) {
  const buf = fs.readFileSync("images/" + name);
  return "data:image/png;base64," + buf.toString("base64");
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kumo Export &mdash; Installation Guide</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 720px;
    margin: 40px auto;
    padding: 0 20px;
    color: #1f2937;
    line-height: 1.6;
  }
  h1 { font-size: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
  h2 { font-size: 20px; margin-top: 32px; color: #111827; }
  ol { padding-left: 24px; }
  li { margin-bottom: 12px; }
  ul { padding-left: 24px; }
  ul li { margin-bottom: 6px; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  a { color: #3b82f6; }
  img { max-width: 100%; margin: 12px 0; border: 1px solid #e5e7eb; border-radius: 8px; }
  strong { color: #111827; }
</style>
</head>
<body>

<h1>Kumo Export &mdash; Installation Guide</h1>

<h2>Install</h2>

<ol>
<li>Download <code>kumo-export.zip</code> and unzip it to a folder on your computer (e.g. <code>~/kumo-export</code>). <strong>Don&rsquo;t delete this folder</strong> &mdash; Chrome needs it to run the extension.</li>

<li>Open Chrome and go to <code>chrome://extensions</code></li>

<li>Enable <strong>Developer mode</strong> using the toggle in the top-right corner.
<br><img src="${img("developer-mode-toggle.png")}" alt="Developer mode toggle"></li>

<li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>

<li>You should see Kumo Export in your extensions list.
<br><img src="${img("installed-extension.png")}" alt="Kumo Export installed"></li>

<li>The Kumo Export icon should now appear in your Chrome toolbar. If you don&rsquo;t see it, click the puzzle piece icon in the toolbar and pin <strong>Kumo Export</strong>.
<br><img src="${img("pin.png")}" alt="Pin the extension to your toolbar"></li>
</ol>

<h2>Usage</h2>

<ol>
<li>Go to <a href="https://app.withkumo.com">app.withkumo.com</a> and log in.</li>

<li>Navigate to the <strong>Search Deals</strong> page and apply any filters you want. The badge on the extension icon updates to show the number of matching deals.
<br><img src="${img("toolbar-icon.png")}" alt="Toolbar icon showing deal count badge"></li>

<li>Click the <strong>Kumo Export</strong> icon in the toolbar &mdash; it will show the number of deals matching your current filters. Click <strong>Export CSV</strong> or <strong>Export Excel</strong> to download.
<br><img src="${img("filters.png")}" alt="Popup showing deal count matching Kumo results"></li>

<li>The export runs in the background &mdash; you can close the popup and it will continue. Reopen the popup to check progress.
<br><img src="${img("download-progress.png")}" alt="Export progress bar"></li>

<li>When the export completes, you&rsquo;ll see a confirmation with the filename.
<br><img src="${img("download-complete.png")}" alt="Export complete"></li>
</ol>

<h2>Notes</h2>

<ul>
<li>Chrome may show a &ldquo;Disable developer mode extensions&rdquo; banner on startup. Just dismiss it &mdash; the extension will continue to work.</li>
<li>If the extension stops detecting your searches, try refreshing the Kumo page.</li>
<li>If your Kumo session expires during an export, you&rsquo;ll see a session expired message. Just log back in to Kumo and try again.</li>
</ul>

<h2>Updating</h2>

<p>If you receive a new version of <code>kumo-export.zip</code>:</p>

<ol>
<li>Unzip it and replace the contents of your existing folder.</li>
<li>Go to <code>chrome://extensions</code> and click the reload button (&circlearrowright;) on the Kumo Export card.</li>
</ol>

</body>
</html>`;

fs.writeFileSync("INSTALL.html", html);
const size = Math.round(fs.statSync("INSTALL.html").size / 1024);
console.log(`Created INSTALL.html (${size}KB)`);
