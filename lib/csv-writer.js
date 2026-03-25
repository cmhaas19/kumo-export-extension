import { COLUMNS, extractRow } from "./columns.js";

/**
 * Generate CSV string from deals + details map.
 * RFC 4180 compliant, UTF-8 with BOM.
 */
export function generateCSV(deals, detailMap) {
  const BOM = "\uFEFF";
  const rows = [];

  // Header row
  rows.push(COLUMNS.map((c) => csvEscape(c.header)).join(","));

  // Data rows
  for (const deal of deals) {
    const detail = detailMap.get(deal.id) || null;
    const values = extractRow(deal, detail);
    rows.push(values.map((v) => csvEscape(formatValue(v))).join(","));
  }

  return BOM + rows.join("\r\n") + "\r\n";
}

function formatValue(val) {
  if (val == null) return "";
  if (typeof val === "number") return String(val);
  return String(val);
}

function csvEscape(val) {
  const str = String(val);
  // Escape newlines as literal \n for CSV compatibility
  const escaped = str.replace(/\r\n|\r|\n/g, "\\n");
  if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\\n")) {
    return '"' + escaped.replace(/"/g, '""') + '"';
  }
  return escaped;
}
