export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function escapeCell(value: string | number | boolean | null | undefined, separator: string): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "boolean" ? (value ? "oui" : "non") : String(value);
  // Empêche Excel d'interpréter une cellule comme formule (injection CSV).
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") {
    text = `'${text}`;
  }
  if (text.includes(separator) || text.includes('"') || /[\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * CSV prêt pour Excel en français : séparateur « ; », BOM UTF-8 pour les accents,
 * fins de ligne CRLF.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[], separator = ";"): string {
  const lines = [
    columns.map((column) => escapeCell(column.header, separator)).join(separator),
    ...rows.map((row) => columns.map((column) => escapeCell(column.value(row), separator)).join(separator))
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
