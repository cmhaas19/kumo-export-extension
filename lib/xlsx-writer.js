import * as XLSX from "xlsx";
import { COLUMNS, extractRow } from "./columns.js";

/**
 * Generate XLSX ArrayBuffer from deals + details map.
 */
export function generateXLSX(deals, detailMap) {
  const wb = XLSX.utils.book_new();

  // Build data array: header + rows
  const header = COLUMNS.map((c) => c.header);
  const data = [header];

  for (const deal of deals) {
    const detail = detailMap.get(deal.id) || null;
    data.push(extractRow(deal, detail));
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Apply number formats and styles per column
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const col = COLUMNS[C];
    if (!col) continue;

    // Bold header
    const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[headerAddr]) {
      ws[headerAddr].s = { font: { bold: true } };
    }

    // Number format for data cells
    if (col.numFmt) {
      for (let R = 1; R <= range.e.r; R++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[addr] && ws[addr].v != null) {
          ws[addr].z = col.numFmt;
        }
      }
    }

    // Kumo Link column: make hyperlinks
    if (col.key === "kumoLink") {
      for (let R = 1; R <= range.e.r; R++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[addr] && ws[addr].v) {
          ws[addr].l = { Target: ws[addr].v, Tooltip: "Open in Kumo" };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Kumo Export");

  // Write to ArrayBuffer
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf;
}
