import assert from "node:assert/strict";
import { test } from "node:test";
import { mimeFor, safeFileName } from "./file-types";

test("mimeFor only knows allowed document types", () => {
  assert.equal(mimeFor("Requirements.PDF"), "application/pdf");
  assert.equal(mimeFor("cases.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(mimeFor("run.sh"), undefined);
  assert.equal(mimeFor("page.html"), undefined);
});

test("safeFileName strips paths and unsafe characters", () => {
  assert.equal(safeFileName("../../etc/passwd"), "passwd");
  assert.equal(safeFileName("C:\\docs\\Spec v2.docx"), "Spec v2.docx");
  assert.equal(safeFileName(".hidden.txt"), "hidden.txt");
  assert.equal(safeFileName("a<b>c.pdf"), "a_b_c.pdf");
});
