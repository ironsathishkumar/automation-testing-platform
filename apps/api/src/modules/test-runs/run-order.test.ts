import assert from "node:assert/strict";
import { test } from "node:test";
import { readSession, runOrder, withoutSession } from "./run-order";

test("runs setup first, then numbered tests, then the rest in their original order", () => {
  const cases = [
    { name: "unnumbered-a" },
    { name: "third", sequence: 30 },
    { name: "sign-in", setup: true },
    { name: "first", sequence: 10 },
    { name: "unnumbered-b", sequence: null },
  ];
  assert.deepEqual(
    runOrder(cases).map((item) => item.name),
    ["sign-in", "first", "third", "unnumbered-a", "unnumbered-b"],
  );
});

test("reads only complete session payloads", () => {
  assert.deepEqual(readSession({ key: "0", index: 2, total: 5 }), { key: "0", index: 2, total: 5 });
  assert.equal(readSession({ key: "0", index: "2", total: 5 }), undefined);
  assert.equal(readSession(undefined), undefined);
});

test("drops the shared session when a job is copied for a re-run", () => {
  assert.deepEqual(withoutSession({ browser: "chromium", session: { key: "0", index: 0, total: 2 } }), { browser: "chromium" });
});
