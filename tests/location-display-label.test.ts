import assert from "node:assert/strict";
import test from "node:test";

import { getLocationDisplayLabel } from "../utils/location/getLocationDisplayLabel";

test("getLocationDisplayLabel translates common saved-location labels", () => {
  assert.equal(getLocationDisplayLabel("Home"), "家");
  assert.equal(getLocationDisplayLabel(" work "), "公司");
  assert.equal(getLocationDisplayLabel("Office"), "辦公室");
  assert.equal(getLocationDisplayLabel("Current Location"), "目前位置");
  assert.equal(getLocationDisplayLabel("Default"), "預設位置");
});

test("getLocationDisplayLabel preserves user-defined labels", () => {
  assert.equal(getLocationDisplayLabel("台北車站出口"), "台北車站出口");
  assert.equal(getLocationDisplayLabel("夜市旁"), "夜市旁");
});

test("getLocationDisplayLabel handles empty labels safely", () => {
  assert.equal(getLocationDisplayLabel(""), "未命名地點");
  assert.equal(getLocationDisplayLabel(null), "未命名地點");
  assert.equal(getLocationDisplayLabel(undefined), "未命名地點");
});
