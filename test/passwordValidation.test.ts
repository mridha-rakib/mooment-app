import assert from "node:assert/strict";
import test from "node:test";
import {
  PASSWORD_RULE_ERRORS,
  getFirstPasswordError,
  getPasswordRuleChecklist,
  isPasswordValid,
} from "../lib/passwordValidation";

test("isPasswordValid is true only when every rule is met", () => {
  assert.equal(isPasswordValid("Str0ng!Pass"), true);
  assert.equal(isPasswordValid("weakpass"), false);
});

test("getPasswordRuleChecklist reports live per-rule status", () => {
  const checklist = getPasswordRuleChecklist("abcABC12");
  const status = Object.fromEntries(checklist.map((rule) => [rule.id, rule.met]));

  assert.deepEqual(status, {
    minLength: true,
    lowercase: true,
    uppercase: true,
    number: true,
    special: false,
  });
});

test("getPasswordRuleChecklist always returns all five rules in order", () => {
  const ids = getPasswordRuleChecklist("").map((rule) => rule.id);
  assert.deepEqual(ids, ["minLength", "lowercase", "uppercase", "number", "special"]);
});

test("getFirstPasswordError surfaces the first unmet rule message", () => {
  assert.equal(getFirstPasswordError("short1!A"), null);
  assert.equal(getFirstPasswordError("Ab1!c"), PASSWORD_RULE_ERRORS.minLength);
  assert.equal(getFirstPasswordError("password1!"), PASSWORD_RULE_ERRORS.uppercase);
  assert.equal(getFirstPasswordError("Password!!"), PASSWORD_RULE_ERRORS.number);
  assert.equal(getFirstPasswordError("Password11"), PASSWORD_RULE_ERRORS.special);
});

test("getFirstPasswordError returns null for a fully valid password", () => {
  assert.equal(getFirstPasswordError("Str0ng!Pass"), null);
});
