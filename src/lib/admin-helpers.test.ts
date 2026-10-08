import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";
import { centsToInput, parseMoneyToCents } from "./money";

describe("parseMoneyToCents", () => {
  it.each([
    ["197", 19700],
    ["197,00", 19700],
    ["197,5", 19750],
    ["R$ 197,50", 19750],
    ["1.197,50", 119750],
    ["1.197", 119700],
    ["197.50", 19750],
    ["0", 0],
    ["0,99", 99],
  ])("%s -> %d", (input, cents) => {
    expect(parseMoneyToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-10", "1,2,3", "19,999", "1,197.50", "12..5"])("rejects %s", (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });

  it("formats cents back for inputs", () => {
    expect(centsToInput(19750)).toBe("197,50");
    expect(centsToInput(0)).toBe("0,00");
    expect(centsToInput(null)).toBe("");
  });
});

describe("csv", () => {
  it("quotes delimiters, quotes and newlines", () => {
    expect(csvCell("a;b", ";")).toBe('"a;b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("plain")).toBe("plain");
  });

  it("neutralizes spreadsheet formulas in text but not in numbers", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("+5511")).toBe("'+5511");
    expect(csvCell(-5)).toBe("-5");
  });

  it("builds rows with CRLF", () => {
    expect(toCsv(["email", "ativo"], [["a@b.com", true], [null, false]], ";")).toBe("email;ativo\r\na@b.com;true\r\n;false");
  });
});
