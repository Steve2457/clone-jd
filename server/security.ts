import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return salt + ":" + scryptSync(password, salt, 32).toString("hex");
}
export function checkPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
