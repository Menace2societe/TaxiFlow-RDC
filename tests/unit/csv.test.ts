import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

type Row = { name: string; amount: number; flagged: boolean; note: string | null };

const columns = [
  { header: "Nom", value: (row: Row) => row.name },
  { header: "Montant", value: (row: Row) => row.amount },
  { header: "Alerte", value: (row: Row) => row.flagged },
  { header: "Note", value: (row: Row) => row.note }
];

describe("toCsv", () => {
  it("writes an Excel-friendly French CSV", () => {
    const csv = toCsv([{ name: "Kasa", amount: 15000, flagged: true, note: null }], columns);
    expect(csv).toBe("﻿Nom;Montant;Alerte;Note\r\nKasa;15000;oui;\r\n");
  });

  it("quotes separators, quotes and line breaks", () => {
    const csv = toCsv([{ name: 'Mbuyi; "Papa"', amount: 1, flagged: false, note: "ligne1\nligne2" }], columns);
    expect(csv).toContain('"Mbuyi; ""Papa""";1;non;"ligne1\nligne2"');
  });

  it("neutralises spreadsheet formulas but keeps negative numbers", () => {
    const csv = toCsv([{ name: '=HYPERLINK("x")', amount: -5, flagged: false, note: "+1" }], columns);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine.startsWith(`"'=HYPERLINK`)).toBe(true);
    expect(dataLine).toContain(";-5;");
    expect(dataLine.endsWith(";'+1")).toBe(true);
  });
});
