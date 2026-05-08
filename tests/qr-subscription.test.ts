import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMerchantSubscribeQrData,
  parseMerchantIdFromQrData,
} from "../utils/qr/subscriptionQr";

const merchantId = "123e4567-e89b-12d3-a456-426614174000";

test("buildMerchantSubscribeQrData creates an app deep link payload", () => {
  assert.equal(
    buildMerchantSubscribeQrData(merchantId),
    `vendormapapp://subscribe?merchant_id=${merchantId}&v=1`
  );
});

test("parseMerchantIdFromQrData parses supported QR payload formats", () => {
  assert.equal(
    parseMerchantIdFromQrData(`vendormapapp://subscribe?merchant_id=${merchantId}&v=1`),
    merchantId
  );
  assert.equal(
    parseMerchantIdFromQrData(JSON.stringify({ merchant_id: merchantId })),
    merchantId
  );
  assert.equal(parseMerchantIdFromQrData(merchantId), merchantId);
});

test("parseMerchantIdFromQrData rejects unsupported payloads", () => {
  assert.equal(parseMerchantIdFromQrData(""), null);
  assert.equal(parseMerchantIdFromQrData("not-a-merchant-id"), null);
  assert.equal(parseMerchantIdFromQrData(JSON.stringify({ foo: "bar" })), null);
});
