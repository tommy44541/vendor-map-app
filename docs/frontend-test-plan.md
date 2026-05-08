# Frontend Test Plan

本文件記錄目前前端 App 的核心測試案例。自動化測試先覆蓋純邏輯與易回歸規則；需要真機/模擬器、Google OAuth、推播、相機、地圖權限的流程先列為人工冒煙測試。

## Automated Regression Tests

執行方式：

```bash
npm test
```

目前覆蓋：

- 地點名稱顯示：`Home`、`Work`、`Office`、`Current Location`、`Default` 顯示為中文。
- 攤商名稱顯示：不同後端資料 shape 都能取到可顯示店名。
- 密碼規則：註冊密碼至少符合長度、大寫、小寫、數字、特殊符號。
- QR 訂閱解析：支援 app deep link、JSON、UUID，並拒絕無效 payload。

## Manual Smoke Tests

### Auth

- 使用 email/password 註冊 consumer，完成 onboarding 後應進入 consumer home。
- 使用 email/password 註冊 vendor，補齊店名與攤商編號後應進入 vendor home。
- 使用 Google 登入 consumer，成功後應進入正確角色首頁。
- 使用 Google 登入 vendor，若需補商家資訊，畫面只顯示 Google 補填欄位，不顯示一般註冊欄位。
- 登出後應清除 token/device 狀態，再次開 App 不應直接進入內頁。

### Consumer

- Home 的「已訂閱攤車」在新增訂閱後，返回首頁應刷新。
- Favorites 點擊攤商後可進入該攤商詳情/菜單頁。
- Notifications 中央 tab 可開啟通知列表。
- Profile 推播狀態應使用一般使用者看得懂的描述，不顯示工程欄位。

### Vendor

- Home 今日營業狀態統計在無資料時顯示 `-`。
- Home 發布紀錄最多保留 5 筆，發布後統計應刷新。
- Notifications 中央 tab 可開啟發布通知流程。
- Notifications 可用已保存位置與臨時位置發布通知。
- Menu 可新增、編輯品項，重新進入頁面後狀態符合目前 API 回傳。
- Profile 可提交商家驗證資料，並顯示目前驗證狀態。

### Location

- Consumer/Vendor 地點頁可取得目前位置、保存位置、編輯名稱、設定主要地點、停用/啟用、刪除。
- `Primary`、`Active`、`Inactive`、`Label` 不應出現在 UI 顯示文字中。
- 既有 `Home`、`Work`、`Office` 等地點名稱應以中文顯示。
- 改模擬器座標後，重新按「獲取當前位置」才會取得新座標；已保存地址不會自動改寫。

### QR And Push

- Vendor QR code 頁可取得自己的 QR，不需要手動傳 merchant id。
- Consumer 掃 QR 可訂閱 vendor。
- Consumer 退訂後不應再收到該 vendor 通知。
- Consumer 設定位置與 Vendor 發布位置在距離範圍內時，發布通知應能送到已註冊 device。

### Platform Checks

- iOS 開啟 QR camera 後，左上角關閉按鈕可退出。
- Android 地圖頁使用 Google Map 引擎，開頁不應依賴 Leaflet CDN。
- App 啟動後 console 不應有 Expo Router 缺頁 warning。
