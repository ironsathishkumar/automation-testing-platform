import assert from "node:assert/strict";
import { test } from "node:test";
import { isReadableText, outlineDocument } from "./document-outline";

test("outlineDocument splits markdown by heading and ignores headings inside code fences", () => {
  const sections = outlineDocument(
    "req.md",
    "# Requirements\nIntro line\n\n## Task\nRequired:\n- title\n\n```text\n# not a heading\n```\n## Status\nDynamic.",
  );
  assert.deepEqual(
    sections.map((section) => [section.title, section.level]),
    [["Requirements", 1], ["Task", 2], ["Status", 2]],
  );
  assert.match(sections[1].body, /# not a heading/);
  assert.equal(sections[2].body, "Dynamic.");
});

test("outlineDocument reads gherkin scenarios and falls back to one section", () => {
  const feature = outlineDocument("login.feature", "Feature: Login\n  Scenario: Valid user\n    Given a user\n  Scenario: Wrong password\n    Then an error");
  assert.deepEqual(feature.map((section) => section.title), ["Login", "Valid user", "Wrong password"]);
  assert.deepEqual(outlineDocument("notes.txt", "just text"), [{ title: "notes", level: 1, body: "just text" }]);
});

test("isReadableText covers text formats only", () => {
  assert.equal(isReadableText("a.MD"), true);
  assert.equal(isReadableText("a.pdf"), false);
});
