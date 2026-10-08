/* Street Goose 034 — CSV para exportação do painel (newsletter, clientes).
   Texto começando com = + - @ é prefixado com ' para o Excel/Sheets não
   executar como fórmula (CSV injection: e-mail/nome vêm do cliente). */
export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvCell, delimiter = ","): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = "'" + text;
  const needsQuotes = text.includes(delimiter) || /["\r\n]/.test(text) || text !== text.trim();
  return needsQuotes ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export function toCsv(headers: string[], rows: CsvCell[][], delimiter = ","): string {
  return [headers, ...rows].map((row) => row.map((cell) => csvCell(cell, delimiter)).join(delimiter)).join("\r\n");
}

/** Dispara o download no navegador. BOM para o Excel abrir acentos em UTF-8. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
