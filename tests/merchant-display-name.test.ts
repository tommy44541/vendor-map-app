import assert from "node:assert/strict";
import test from "node:test";

import { getMerchantDisplayName } from "../utils/merchant/getMerchantDisplayName";

test("getMerchantDisplayName uses top-level merchant_name first", () => {
  assert.equal(
    getMerchantDisplayName({
      merchant_name: "阿明滷味",
      store_name: "備用店名",
      merchant: { store_name: "巢狀店名" },
    }),
    "阿明滷味"
  );
});

test("getMerchantDisplayName falls back through known backend shapes", () => {
  assert.equal(
    getMerchantDisplayName({
      merchant: { store_name: "巢狀店名" },
    }),
    "巢狀店名"
  );
  assert.equal(
    getMerchantDisplayName({
      merchant_profile: { name: "Profile 店名" },
    }),
    "Profile 店名"
  );
});

test("getMerchantDisplayName trims blanks and returns empty string when unavailable", () => {
  assert.equal(getMerchantDisplayName({ merchant_name: "  好物小店  " }), "好物小店");
  assert.equal(getMerchantDisplayName({ merchant_name: "   " }), "");
  assert.equal(getMerchantDisplayName(undefined), "");
});
