import assert from "node:assert/strict";
import test from "node:test";

import {
  getPushNotificationLocation,
  normalizePushNotificationContent,
} from "../utils/push/notificationContent";

test("normalizePushNotificationContent prefers visible notification fields", () => {
  assert.deepEqual(
    normalizePushNotificationContent({
      title: "阿明滷味",
      body: "今天在車站前",
      data: { title: "data title", message: "data message" },
    }),
    {
      title: "阿明滷味",
      body: "今天在車站前",
      data: { title: "data title", message: "data message" },
    },
  );
});

test("normalizePushNotificationContent reads data-only Android payloads", () => {
  const result = normalizePushNotificationContent({
    data: { title: "夜市牛排", message: "已經開始營業" },
  });

  assert.equal(result.title, "夜市牛排");
  assert.equal(result.body, "已經開始營業");
});

test("normalizePushNotificationContent supports merchant snake_case fields", () => {
  const result = normalizePushNotificationContent({
    data: {
      merchant_name: "小王地瓜球",
      hint_message: "今天提早收攤",
    },
  });

  assert.equal(result.title, "小王地瓜球");
  assert.equal(result.body, "今天提早收攤");
});

test("normalizePushNotificationContent parses nested JSON notification data", () => {
  const result = normalizePushNotificationContent({
    data: {
      notification: JSON.stringify({
        title: "餐車通知",
        body: "移動到公園入口",
      }),
    },
  });

  assert.equal(result.title, "餐車通知");
  assert.equal(result.body, "移動到公園入口");
});

test("normalizePushNotificationContent never returns an empty card", () => {
  assert.deepEqual(normalizePushNotificationContent({ data: {} }), {
    title: "攤商通知",
    body: "有新的攤商動態，請開啟 App 查看。",
    data: {},
  });
});

test("getPushNotificationLocation parses backend string coordinates", () => {
  assert.deepEqual(
    getPushNotificationLocation({
      data: {
        merchant_id: "merchant-123",
        latitude: "24.157700",
        longitude: "120.658000",
        location_name: "草悟道攤位",
        full_address: "台中市西區公益路",
      },
    }),
    {
      latitude: 24.1577,
      longitude: 120.658,
      merchantId: "merchant-123",
      locationName: "草悟道攤位",
      fullAddress: "台中市西區公益路",
    },
  );
});

test("getPushNotificationLocation supports nested JSON payloads", () => {
  assert.deepEqual(
    getPushNotificationLocation({
      data: {
        payload: JSON.stringify({
          lat: 25.033,
          lng: 121.5654,
          locationName: "市政府站",
        }),
      },
    }),
    {
      latitude: 25.033,
      longitude: 121.5654,
      merchantId: undefined,
      locationName: "市政府站",
      fullAddress: undefined,
    },
  );
});

test("getPushNotificationLocation rejects missing or invalid coordinates", () => {
  assert.equal(
    getPushNotificationLocation({ data: { latitude: "24.1" } }),
    null,
  );
  assert.equal(
    getPushNotificationLocation({
      data: { latitude: "not-a-number", longitude: "120.6" },
    }),
    null,
  );
  assert.equal(
    getPushNotificationLocation({
      data: { latitude: "91", longitude: "120.6" },
    }),
    null,
  );
  assert.equal(
    getPushNotificationLocation({
      data: { latitude: " ", longitude: " " },
    }),
    null,
  );
});
