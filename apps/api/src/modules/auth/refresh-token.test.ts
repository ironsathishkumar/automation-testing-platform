import assert from "node:assert/strict";
import test from "node:test";
import { formatRefreshToken, hashRefreshSecret, newRefreshSecret, parseRefreshToken, sameHash } from "./refresh-token";

test("a refresh token round-trips through its cookie format", () => {
  const secret = newRefreshSecret();
  const parsed = parseRefreshToken(formatRefreshToken("6ab7befe7ad8ebe935b7ed92", secret));
  assert.deepEqual(parsed, { sessionId: "6ab7befe7ad8ebe935b7ed92", secret });
});

test("malformed refresh tokens are rejected", () => {
  assert.equal(parseRefreshToken(undefined), null);
  assert.equal(parseRefreshToken("not-a-token"), null);
  assert.equal(parseRefreshToken(`6ab7befe7ad8ebe935b7ed92.${newRefreshSecret()}.extra`), null);
  assert.equal(parseRefreshToken(`../etc.${newRefreshSecret()}`), null);
});

test("only the stored hash matches its secret", () => {
  const secret = newRefreshSecret();
  const stored = hashRefreshSecret(secret);
  assert.ok(sameHash(hashRefreshSecret(secret), stored));
  assert.ok(!sameHash(hashRefreshSecret(newRefreshSecret()), stored));
  assert.ok(!sameHash(undefined, stored));
});
