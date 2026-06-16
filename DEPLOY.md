# 部署與迭代手冊

涵蓋 backend (`NomNom-Radar`) + frontend (`vendor-map-app`) + database + GCP infra
的完整部署流程,讓團隊每次迭代都能照著做。

> 這份文件放在 frontend repo 是因為 frontend 工程師最常需要對照整套 deploy 流程,但內容包含
> 後端與 DB 的脈絡,新人也能藉此理解整個系統。

## 目錄

1. [環境拓樸](#1-環境拓樸-gcp-project-對應角色)
2. [後端 deploy 流程](#2-後端-deploy-流程-nomnom-radar)
3. [資料庫 migration 流程](#3-資料庫-migration-流程)
4. [前端 deploy 流程](#4-前端-deploy-流程-vendor-map-app)
5. [Secret / Variable 管理](#5-secret--variable-管理)
6. [推薦的迭代 SOP](#6-推薦的迭代-sop)
7. [還沒做但建議補的事](#7-還沒做但建議補的事)
8. [快速指令參考](#8-快速指令參考)

---

## 1. 環境拓樸 (GCP project 對應角色)

```text
┌─────────────────────────────────────────────────────────────┐
│  radar-469510 (prod)                                        │
│  ├─ Cloud Run service: radar (API, /api/v1/...)             │
│  ├─ Cloud Run service: geoworker                            │
│  ├─ Cloud Run job: device-cleanup                           │
│  ├─ OAuth 2.0 Client IDs (Web/iOS/Android)                  │
│  └─ Postgres prod (Supabase managed)                        │
├─────────────────────────────────────────────────────────────┤
│  radar-dev-491902 (dev)                                     │
│  ├─ Cloud Run service: radar-dev                            │
│  ├─ Cloud Run service: geoworker-dev                        │
│  └─ Postgres dev (Supabase managed)                         │
├─────────────────────────────────────────────────────────────┤
│  radar-frontend (mobile builds)                             │
│  ├─ GCS bucket: gs://radar-frontend                         │
│  ├─ SA: mobile-builds-uploader                              │
│  └─ WIF pool: github-actions / provider: github             │
└─────────────────────────────────────────────────────────────┘
```

GitHub Repos:

- `tommy44541/NomNom-Radar` — Go backend
- `tommy44541/vendor-map-app` — React Native + Expo frontend (this repo)

公開 DNS:

- `https://api.whereisvendor.com` → Cloud Run prod `radar` service

---

## 2. 後端 deploy 流程 (`NomNom-Radar`)

### Cloud Run Services

```text
本機開發
  └─ docker-compose up         postgres master/replica + PostGIS
  └─ go run ./cmd/radar        本機跑 API
  └─ go test ./...

PR
  └─ ci.yml 自動跑 golangci-lint + go test

merge 到 main
  └─ 不會自動 deploy(workflow_dispatch 才會)

手動觸發 Deploy Dev
  └─ Actions → "Deploy Cloud Run Service Dev" → Run workflow
  ├─ target = radar / geoworker(選一)
  ├─ image_ref = <commit SHA 或 tag>
  ├─ run_migration = true/false        ← 有 schema 變動才勾
  └─ run_supabase_migration = true/false ← 只有 Supabase pre/post 才勾

驗證 dev API 正常

手動觸發 Deploy Prod
  └─ Actions → "Deploy Cloud Run Service Prod"
  └─ 同上,但 deploy 到 prod project
```

### Cloud Run Jobs

`device-cleanup` 這類是 **Job** 不是 Service,有獨立 workflow:

- `deploy-cloud-run-job-dev.yml`
- `deploy-cloud-run-job-prod.yml`

執行方式:Cloud Scheduler 排程,或手動 `gcloud run jobs execute`。

### Docker image tag 慣例

從 Dockerfile 是 multi-stage build,各 target 一個 image:

```text
asia-east1-docker.pkg.dev/<project>/radar/radar:<short_sha>
asia-east1-docker.pkg.dev/<project>/radar/radar:latest
asia-east1-docker.pkg.dev/<project>/radar/geoworker:<short_sha>
```

Deploy 時 `image_ref` **填 `<short_sha>`(明確、可重現)**;`latest` 只用於 dev 臨時測試。

---

## 3. 資料庫 migration 流程

### 結構

```text
database/migration/
├─ postgres/              一般 schema 變動
│  ├─ 20260502_baseline_schema.sql
│  ├─ 20260513_add_discovery_foundation.sql
│  └─ 20260515_add_discovery_search_indexes.sql
└─ supabase/              Supabase 特殊 RPC / RLS / function
   ├─ pre/                deploy 前要先跑(例:disable RLS)
   └─ post/               deploy 後再跑(例:enable RLS、function)
```

### 上線 migration 的兩種模式

**A. 跟 deploy 一起跑(推薦,小變動)**

`Deploy Cloud Run Service Prod` 勾:

- `run_migration = true`
- `run_supabase_migration = true`(若有 supabase/pre 或 post)

Workflow 會先跑 migration,失敗就停下不 deploy。

**B. 分開跑(大變動 / 不可逆 schema)**

1. 單獨跑 migration step(只勾 migration、不 deploy)
2. 確認 DB 狀態正常
3. 再 deploy 新 image

### 安全規則

- **向前相容**:每個 migration 要讓「**舊版 backend code 仍能跑、新版 backend code 也能跑**」。
  例如加新欄位用 nullable + default,不要直接 `NOT NULL` 卡住舊 code
- **避免 long-running migration 阻塞 prod**(add index on huge table):
  用 `CREATE INDEX CONCURRENTLY` 或分批
- **Supabase pre/post 順序**:
  - `pre` 在 deploy 之前(讓 deploy 安全)
  - `post` 在 deploy 之後(啟用新 schema 對應功能)

---

## 4. 前端 deploy 流程 (`vendor-map-app`)

### 階段

```text
本機開發
  └─ npx expo start --dev-client
  └─ Expo Go 或自己的 dev client 連上去

PR / commit
  └─ 目前沒有自動 CI(待補:tsc + jest)

手動觸發 Build APK(內部 QA 安裝)
  └─ Actions → "Build Android APK"
  └─ 產出 .apk → 上傳 GCS → signed URL
  └─ QA 用 URL 下載 sideload

手動觸發 Build AAB(正式上架)
  └─ Actions → "Build Android AAB"
  └─ 勾 generate_signed_url
  └─ 產出 .aab → 上傳 GCS + signed URL
  └─ 下載 .aab → Play Console 上傳

Play Console 內部測試 → 封閉測試 → 公開
```

### versionCode 自動遞增

`app.config.js` **不要寫死 `android.versionCode`**,EAS 預設會自動遞增(用 EAS dashboard 上記錄
的 build number)。

每次 release 前看一下 EAS dashboard 確認上一次的 build number,Play Console 上的 versionCode 永遠
要遞增即可。

### versionName 升版規則

`app.config.js` 的 `version` 欄位:

- `1.0.0 → 1.0.1` — 純 bug fix
- `1.0.0 → 1.1.0` — 新功能,向後相容
- `1.0.0 → 2.0.0` — breaking change(很少對 mobile 而言)

### iOS 還沒做

目前 `eas.json` 沒 iOS profile,只能跑 Android。要補需要:

1. Apple Developer Program 帳號(個人或公司,$99/yr)
2. 在 EAS 上設好 iOS distribution credentials
3. 新增 `eas.json` 的 `production-ios` profile
4. 寫一個 `build-ios-ipa.yml`,可直接抄 Android 那份改幾個值
5. (選用)`fastlane` + EAS Submit 自動推到 TestFlight

---

## 5. Secret / Variable 管理

### 三個地方都有 secret

| 位置 | 例子 | 設定方式 |
|---|---|---|
| **NomNom-Radar GitHub Secrets** | DB connection string、JWT signing key、GCP SA JSON | `gh secret set` |
| **vendor-map-app GitHub Secrets** | `EXPO_TOKEN`、Google OAuth Client IDs、API base URL | `gh secret set` |
| **Cloud Run service env vars** | runtime 的 DB URL、bucket name 等 | Cloud Run console 或 deploy workflow 帶 |

### vendor-map-app 目前的 secret / variable 清單

**Secrets**(機密,gh secret set 設定)

| Name | 用途 |
|---|---|
| `EXPO_TOKEN` | CI 觸發 EAS build(從 expo.dev Robot users 建立) |
| `EXPO_PROJECT_ID` | EAS project UUID(`eas init` 後拿到) |
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base(目前 `https://api.whereisvendor.com`) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Web OAuth client(給 backend ID token verify) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` | iOS Google Sign-In client |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` | Android Google Sign-In client |

**Variables**(非機密,gh variable set 設定)

| Name | 值 | 用途 |
|---|---|---|
| `GCS_BUCKET` | `radar-frontend` | build artifact 存放 bucket |
| `GCP_SERVICE_ACCOUNT` | `mobile-builds-uploader@radar-frontend.iam.gserviceaccount.com` | 用來上傳 GCS 的 SA |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/921315042262/locations/global/workloadIdentityPools/github-actions/providers/github` | WIF provider 全名 |
| `GCP_PROJECT_ID` | `radar-frontend` | 明確指定 GCP project |
| `EXPO_PUBLIC_DEBUG_LOGS` | `false` | production build 關閉 verbose log |

### 命名 / 用途規則

- **Secret**(機密)→ GitHub Secrets:token、private key、connection string
- **Variable**(設定但不機密)→ GitHub Variables:project ID、bucket name、region
- 未來要拆 staging / production 環境,建議改用 [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
  讓不同環境吃不同 secret

---

## 6. 推薦的迭代 SOP

### Backend 改動(包含 schema)

```text
1. branch feature/xxx
2. 本機 docker-compose up 起 DB
3. 寫 migration:database/migration/postgres/<timestamp>_xxx.sql
4. 本機跑 migration 確認沒事
5. 改 code、寫 test
6. PR 到 main,CI 自動跑 lint + test
7. merge
8. Actions → Deploy Dev:勾 run_migration,target=radar,image_ref=<short_sha>
9. 在 dev 測:打 dev API、看 log
10. Actions → Deploy Prod:同樣勾 run_migration
11. 監控 5–10 分鐘,沒問題就完成
```

### Frontend 改動(只動 UI / 邏輯)

```text
1. branch feature/xxx
2. 本機 npx expo start 跑 dev client
3. 測 OK
4. PR 到 main(目前沒 CI,人工 review)
5. merge
6. Actions → Build Android AAB:勾 generate_signed_url
7. 等 ~15 分鐘,下載 .aab
8. Play Console 內部測試管道建立新版本,上傳 .aab,填 release notes,推出
9. 內部測試員 opt-in 後從 Play Store 收到更新
10. 測試一輪沒問題後,在 Play Console 把這版本升級到封閉測試或公開
```

### Backend + Frontend 同時動(API contract 改變)

**關鍵原則:Backend 先上,且向後相容**

```text
1. Backend 寫新 endpoint / 新欄位,舊 client 仍能用
2. Backend deploy 到 prod
3. 等舊 client ≥ 24h 確認穩定
4. Frontend 改用新 endpoint / 新欄位
5. Frontend build AAB → Play Console
6. 測試 + 推送
7. Backend 等所有舊 client 都升級了(看 Play Console 升級率)再下線舊 endpoint
```

絕對不要同時 deploy backend + frontend 而又互相依賴 — 一旦使用者在升級半路,app 會直接壞。

### Hotfix(prod 出包)

**Backend hotfix**

1. 從 main 開 `hotfix/xxx` branch,只動最小範圍
2. PR 到 main(可跳過 review,但要有 commit message 說清楚是 hotfix)
3. 直接 Deploy Prod,**先不要 deploy Dev**(節省時間)
4. Prod 修好後,把 hotfix merge 回 dev 環境同步

**Frontend hotfix**

Mobile app 的「hotfix」不像 web,使用者要更新才會吃到。流程:

1. 修 code → bump `version` (1.0.0 → 1.0.1)
2. Build AAB
3. Play Console 上傳到 production track,選 **"Staged rollout"** 先 5% / 20% / 50% 觀察
4. 沒問題逐步推到 100%

如果 bug 嚴重,可以在 Play Console 暫停舊版 rollout(防止新用戶下載到舊版有 bug 的 build)。

---

## 7. 還沒做但建議補的事

### 高優先

1. **vendor-map-app 加 CI** — 每次 PR 跑 `tsc --noEmit` + `jest`,擋住明顯型別錯誤上 main
2. **Backend image build 自動化** — 確認 image build 與 push 到 Artifact Registry 的 trigger
   是否健全
3. **Play Console 自動上傳** — 用 [`r0adkll/upload-google-play`](https://github.com/r0adkll/upload-google-play)
   action,讓 build workflow 完成後直接傳到 Play Console 內部測試,免手動下載拖拽
4. **iOS pipeline** — 對齊 Android,寫 `build-ios-ipa.yml` + EAS + TestFlight

### 中優先

5. **Rollback 文件化** — Cloud Run revision 回滾、Play Console 把上一版 promote 回來,各列一個
   step-by-step
6. **Sentry / Crashlytics** — production mobile 沒上 crash 上報,壞了不知道
7. **Environment 區分** — vendor-map-app 用 GitHub Environments 把 staging / production 拆開,
   對應到 dev / prod backend
8. **DB backup verification** — Supabase 自動 backup 有沒有定期 restore 測試

### 低優先(但重要)

9. **Secret rotation 排程** — `EXPO_TOKEN`、Google OAuth client secret 等定期(例如每 6 個月)
   輪換一次
10. **Cloud Run cost alert** — 設預算警示,避免某天無腦放大 instance
11. **DEPLOY.md 同步到 NomNom-Radar** — 這份文件後端視角的部分可以 copy 一份過去

---

## 8. 快速指令參考

### 觸發前端 build

```bash
# 透過 gh CLI 觸發 (需先 gh auth login)
gh workflow run build-android-aab.yml \
  --repo tommy44541/vendor-map-app \
  --ref main \
  --field generate_signed_url=true

# 列出最近 run
gh run list --repo tommy44541/vendor-map-app --workflow=build-android-aab.yml

# 即時 watch 某次 run
gh run watch <run-id> --repo tommy44541/vendor-map-app
```

### 設定 / 更新 GitHub Secret 或 Variable

```bash
# 互動式設 secret(會 prompt 你貼值,終端機顯示 *)
gh secret set EXPO_TOKEN --repo tommy44541/vendor-map-app

# 設 variable(非機密直接 --body)
gh variable set GCS_BUCKET --repo tommy44541/vendor-map-app --body "radar-frontend"

# 列出
gh secret list --repo tommy44541/vendor-map-app
gh variable list --repo tommy44541/vendor-map-app
```

### Cloud Run revision rollback

```bash
# 列出某 service 的 revisions
gcloud run revisions list --service=radar --region=asia-east1 --project=radar-469510

# 把 100% 流量切回某 revision
gcloud run services update-traffic radar \
  --to-revisions <REVISION-NAME>=100 \
  --region=asia-east1 \
  --project=radar-469510
```

### 切換 gcloud project

```bash
gcloud config set project radar-frontend   # mobile builds
gcloud config set project radar-469510     # backend prod
gcloud config set project radar-dev-491902 # backend dev
```

### 本機跑 backend(in NomNom-Radar)

```bash
docker-compose up -d            # postgres master/replica + PostGIS
go run ./cmd/radar              # 本機跑 API server
go test ./...                   # 跑 test
```

### 本機跑 frontend(in vendor-map-app)

```bash
npm install
npx expo start --dev-client     # dev client mode
# 第一次跑或原生模組改動需要重新 build dev client:
# eas build -p android --profile preview-apk
```

---

## 文件維護

- 每次架構有重大改變(新 GCP project、新 deploy workflow、新 secret)記得更新這份
- 若有疑問或發現過時內容,直接改 PR
