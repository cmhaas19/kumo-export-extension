// Column definitions for export
export const COLUMNS = [
  {
    header: "Business Name",
    key: "title",
    width: 30,
    extract: (deal) => deal.attributes?.title || "",
  },
  {
    header: "Location",
    key: "location",
    width: 20,
    extract: (deal) => deal.attributes?.location || "",
  },
  {
    header: "Asking Price",
    key: "price",
    width: 15,
    numFmt: "#,##0",
    extract: (deal) => parseNum(deal.attributes?.calculated_values?.price),
  },
  {
    header: "Revenue",
    key: "revenue",
    width: 15,
    numFmt: "#,##0",
    extract: (deal) => parseNum(deal.attributes?.calculated_values?.revenue),
  },
  {
    header: "Earnings (EBITDA/SDE)",
    key: "earnings",
    width: 18,
    numFmt: "#,##0",
    extract: (deal) => parseNum(deal.attributes?.calculated_values?.earnings),
  },
  {
    header: "Margin %",
    key: "margin",
    width: 12,
    numFmt: "0.0%",
    extract: (deal) => parseNum(deal.attributes?.calculated_values?.earnings_to_revenue),
  },
  {
    header: "Multiple",
    key: "multiple",
    width: 12,
    numFmt: "0.0",
    extract: (deal) => parseNum(deal.attributes?.calculated_values?.multiple),
  },
  {
    header: "Industry",
    key: "industry",
    width: 25,
    extract: (deal) => (deal.attributes?.tags || []).join(" - "),
  },
  {
    header: "Date Added",
    key: "dateAdded",
    width: 20,
    extract: (deal) => deal.attributes?.added_to_kumo_at || "",
  },
  {
    header: "Kumo Link",
    key: "kumoLink",
    width: 35,
    extract: (deal) => `https://app.withkumo.com/deal/${deal.id}`,
  },
  {
    header: "Summary",
    key: "summary",
    width: 50,
    extract: (_deal, detail) => detail?.business_summary || "",
  },
  {
    header: "Top Highlights",
    key: "highlights",
    width: 40,
    extract: (_deal, detail) => detail?.top_highlights || "",
  },
  {
    header: "Additional Information",
    key: "additionalInfo",
    width: 50,
    extract: (_deal, detail) => detail?.additional_information || "",
  },
];

function parseNum(val) {
  if (val == null || val === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export function extractRow(deal, detail) {
  return COLUMNS.map((col) => col.extract(deal, detail));
}
