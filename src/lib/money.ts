/* Street Goose 034 — entrada de valores em reais no painel.
   Aceita o jeito que o lojista digita: "197", "197,00", "1.197,50",
   "R$ 197,5", "197.50". Devolve centavos inteiros ou null se inválido. */
export function parseMoneyToCents(input: string): number | null {
  let text = String(input ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return null;
  if (!/^\d[\d.,]*$/.test(text)) return null;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  if (hasComma && hasDot) {
    // padrão BR: ponto separa milhar, vírgula separa centavos
    if (text.lastIndexOf(".") > text.lastIndexOf(",")) return null;
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    if (text.split(",").length > 2) return null;
    text = text.replace(",", ".");
  } else if (hasDot) {
    // "1.197" / "12.500.000" = milhar; "197.5" / "197.50" = decimal
    if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
    else if (text.split(".").length > 2) return null;
  }

  const [, decimals = ""] = text.split(".");
  if (decimals.length > 2) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** 19700 -> "197,00" (sem "R$", para preencher input). */
export function centsToInput(cents: number | null | undefined): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
