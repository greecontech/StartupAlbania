import { createHash, randomBytes } from "node:crypto";

// Keys look like `gk_<8-char prefix>_<secret>`; only the prefix and a SHA-256 hash are stored.
export function generateApiKey() {
  const prefix = randomBytes(4).toString("hex");
  const key = `gk_${prefix}_${randomBytes(24).toString("base64url")}`;
  return { key, prefix, hash: hashKey(key) };
}

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function parsePrefix(key: string) {
  const match = /^gk_([0-9a-f]{8})_[A-Za-z0-9_-]+$/.exec(key);
  return match?.[1] ?? null;
}
