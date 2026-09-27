import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, parseCsv } from "../src/lib/csv.ts";

test("parses quoted fields, CRLF, BOM and semicolons", () => {
  const rows = parseCsv('﻿metric,value,timestamp\r\n"soil, moisture",31.4,2026-09-27\r\nair_temp;24.8;\n\n');
  assert.deepEqual(rows, [["metric", "value", "timestamp"], ["soil, moisture", "31.4", "2026-09-27"], ["air_temp", "24.8", ""]]);
});

test("escapes quotes and neutralises formulas", () => {
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell(-3.5), "-3.5");
  assert.equal(csvCell(null), "");
});
