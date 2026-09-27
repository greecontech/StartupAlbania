import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/lib/thresholds.ts";

test("within limits → no breach", () => {
  assert.equal(evaluate({ min_threshold: 10, max_threshold: 20 }, 15), null);
  assert.equal(evaluate({ min_threshold: 10, max_threshold: 20 }, 20), null);
  assert.equal(evaluate({ min_threshold: null, max_threshold: null }, 1e9), null);
});

test("above upper limit", () => {
  assert.deepEqual(evaluate({ min_threshold: 10, max_threshold: 20 }, 20.5), { kind: "above", threshold: 20, severity: "warning" });
  assert.equal(evaluate({ min_threshold: 10, max_threshold: 20 }, 21)?.severity, "critical"); // ≥ 10% of the 10-wide band
});

test("below lower limit, single bound scales by threshold", () => {
  assert.deepEqual(evaluate({ min_threshold: 25, max_threshold: null }, 24), { kind: "below", threshold: 25, severity: "warning" });
  assert.equal(evaluate({ min_threshold: 25, max_threshold: null }, 22)?.severity, "critical");
});

test("zero threshold is always critical", () => {
  assert.equal(evaluate({ min_threshold: 0, max_threshold: null }, -0.1)?.severity, "critical");
});
