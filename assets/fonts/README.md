# 字體檔安裝

像素風 UI 依賴兩個字體檔。Metro 啟動前請務必先把以下兩個 `.ttf` 檔放進這個資料夾,否則 `app/_layout.tsx` 的 `useFonts` 會在 bundle 階段直接 fail。

需要的檔案:

```
assets/fonts/
├── Cubic_11.ttf                 # 中文像素字(11px 黑體)
└── PressStart2P-Regular.ttf     # 英文/數字像素字
```

## 1. Cubic 11(方塊 11)

開源中文 11px 像素字體,授權 OFL。

- Repo: https://github.com/ACh-K/Cubic-11
- 直接下載最新 release 的 zip,解壓縮後找 `fonts/ttf/Cubic_11.ttf`(或同名變體),改名為 `Cubic_11.ttf` 放到本資料夾。

下載指令(macOS / Linux):

```bash
curl -L -o /tmp/cubic11.zip https://github.com/ACh-K/Cubic-11/releases/latest/download/fonts.zip
unzip /tmp/cubic11.zip -d /tmp/cubic11
cp /tmp/cubic11/Cubic_11.ttf assets/fonts/Cubic_11.ttf
```

> 註:如果 release 檔名/路徑略有變動,進去 repo `fonts/` 自己挑 `.ttf` 即可。

## 2. Press Start 2P

Google Fonts 上的 8-bit 英文像素字。

- 來源:https://fonts.google.com/specimen/Press+Start+2P
- 或直接從 Google 倉庫抓:

```bash
curl -L -o assets/fonts/PressStart2P-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf
```

## 3. 安裝完後

```bash
# 清掉 Metro cache,確保新字體被 bundle
npx expo start --clear
```

第一次 build 完,App 啟動時 splash screen 會停留到字體載入完成才隱藏,出現入口頁就代表字體已就緒。

## 4. 字體沒裝會怎樣?

`useFonts` 會把 `require('../assets/fonts/Cubic_11.ttf')` 寫入 bundle。檔案不存在 → Metro 一啟動就直接報錯。所以**請務必先放好檔案再 `expo start`**。
