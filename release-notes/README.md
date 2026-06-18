# Release Notes

每次推 `v*.*.*` tag 觸發 CI build + 自動上架前,請更新這個資料夾的兩個檔案:

- `whatsnew-en-US` — 英文 release notes
- `whatsnew-zh-TW` — 繁中 release notes

CI 會把這兩個檔案的內容當成 Google Play Console 該次 release 的 "What's new" 顯示給內部
測試者看。

## 限制

- **單檔最多 500 字元**(Google Play 強制),超過會被截斷
- 純文字,不支援 Markdown 與 HTML
- locale 名稱必須與 Play Console 支援清單對齊,常用:
  - `whatsnew-en-US` — 英文(美國)
  - `whatsnew-zh-TW` — 繁體中文(台灣)
  - `whatsnew-zh-CN` — 簡體中文(中國)
  - `whatsnew-ja-JP` — 日文
- 至少要有預設語系(英文),沒有就 CI 會 fail

## 範例

```
Fix internal server error during registration.
- API base URL is now correctly bundled at build time via EAS env.
```

## 完整流程

1. 改完想 release 的 code,merge 進 main
2. 更新本資料夾兩個 whatsnew 檔
3. commit + push
4. `git tag v1.0.2 && git push origin v1.0.2`
5. GitHub Actions 自動 build AAB → 上傳 Play Console 內部測試 → 完成
