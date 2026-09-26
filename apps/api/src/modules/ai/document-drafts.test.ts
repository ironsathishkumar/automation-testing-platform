import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestCaseSchema } from "@atp/validation";
import { engineForApplication, sectionDrafts } from "./document-drafts";

test("sectionDrafts makes one valid draft per section with text", () => {
  const drafts = sectionDrafts(
    "req.md",
    [
      { title: "Requirements", level: 1, body: "" },
      { title: "Task", level: 2, body: "Required:\n- title" },
      { title: "Task", level: 3, body: "Again" },
    ],
    "web",
  );
  assert.deepEqual(drafts.map((draft) => draft.title), ["Task", "Task (2)"]);
  assert.equal(drafts[0].description, "Required:\n- title");
  assert.deepEqual(drafts[0].steps.map((step) => step.action), ["navigate", "assertVisible"]);
  for (const draft of drafts) {
    assert.equal(createTestCaseSchema.safeParse({ ...draft, applicationId: "6ab80b8601b38afdd37758b7" }).success, true);
  }
});

test("api applications get http starter steps", () => {
  assert.equal(engineForApplication("api"), "api");
  assert.equal(engineForApplication("web"), "web");
  const [draft] = sectionDrafts("api.md", [{ title: "Health", level: 2, body: "Returns ok" }], "api");
  assert.equal(draft.type, "api");
  assert.equal(draft.steps[0].action, "httpRequest");
});
