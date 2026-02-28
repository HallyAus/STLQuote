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
    let str = String(value);

    // Prevent formula injection in spreadsheet applications
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape if contains comma, quote, newline, or single quote (from formula prefix)
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes("'")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCell).join(","));

  return BOM + [headerLine, ...dataLines].join("\r\n");
}
