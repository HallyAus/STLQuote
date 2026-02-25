/**
 * Generate a CSV string from headers and rows.
 * Includes BOM for Excel compatibility.
 */
export function generateCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const BOM = "\uFEFF";

  function escapeCell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // Escape if contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCell).join(","));

  return BOM + [headerLine, ...dataLines].join("\r\n");
}
