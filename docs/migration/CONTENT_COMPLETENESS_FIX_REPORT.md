# 內容完整度修正報告

任務名稱：
舊 CYBERBIZ 網站與 Astro 新網站內容完整度稽核

備份來源：

- `../dsdiamond_backup`
- `../dsdiamond_backup/site`
- `../dsdiamond_backup/brand-data`
- `../dsdiamond_backup/migration`
- `../dsdiamond_backup/urls.txt`

舊站頁面總數：47

新站頁面總數：28

已建立對應的新頁面：31

完全缺少的新頁面：16

部分缺少內容的頁面：8

已完整搬遷頁面：0

舊站文章總數：1

新站文章總數：1

缺少文章數量：0

已補回文章數量：0

舊站產品總數：39 個候選產品/款式名稱

新站產品總數：2

缺少產品數量：37 個候選產品/款式仍需人工或產品匯出資料確認

已補回產品數量：0

舊站圖片總數：2308 個圖片/影片引用

已映射圖片數量：0

尚未映射圖片數量：2308

本次發現的主要缺失原因：

- 新 Astro 站初版只建立少量品牌頁、3 個主要系列、2 個產品與 1 篇知識文章，遠少於舊站內容。
- 舊站大量內容存在於 CYBERBIZ HTML、內嵌 JavaScript、輪播設定、srcset、data-src 與 CDN 資源中，新站尚未完整映射。
- 舊站多數圖片檔名來自 CDN 編碼，新站 public/assets 使用重新命名素材，無法自動判定一一對應。
- 舊站產品資訊主要藏在集合頁與平台資料中，目前沒有完整產品匯出檔可供逐欄還原。

本次補回的內容：

- 補回 18 個缺少的 collection data 入口：
  - `bracelet`
  - `earring`
  - `necklace`
  - `pair-ring`
  - `ring-female`
  - `ring-man`
  - `其他彩鑽`
  - `彩色鑽石專區`
  - `求婚`
  - `粉鑽`
  - `紅鑽`
  - `經典女戒`
  - `經典男戒`
  - `綠鑽`
  - `藍鑽`
  - `轉運女戒`
  - `轉運男戒`
  - `黃鑽`
- 為知識文章加入 `legacyUrl`、`legacySource`、`migrationStatus`、`migrationNotes` 來源追蹤。
- 為產品資料加入 `originalSource`、`migrationStatus`、`migrationNotes` 來源追蹤。
- 建立所有指定稽核文件與可重跑腳本。

仍無法取得的內容：

- 每一筆產品的完整規格、價格、證書、角度圖與詳細介紹，因目前備份中沒有獨立產品匯出檔。
- 舊站 2308 個圖片/影片引用與新站資產之間的正確使用位置，需人工或更完整媒體對照表確認。
- 舊文章實際發布日期與文章內所有圖片原始位置，需要人工確認。

使用 Placeholder 的內容：

- 新補回的 collection data 使用既有 `/assets/banners/atelier-service-banner.jpeg` 作為暫時 hero 圖，並已標示 `migrationStatus: "部分缺失"`。

自行摘要或改寫的內容：

- 無。本次沒有用 AI 新文案取代舊文案；新補 collection 入口只建立遺漏路由與來源追蹤，狀態標示為部分缺失。

沒有對應新網址的舊頁面：

- 詳見 `LEGACY_PAGE_MASTER_LIST.md` 中 `無對應新頁面` 的項目。

需要建立轉址的網址：

- 舊站 `/collections/求婚` 與新站既有 `/collections/proposal/` 同時存在，需決定 canonical 與轉址策略。
- 舊站 `/pages/尊榮定製` 與新站 `/pages/custom-service/` 需要轉址或保留中文路由。
- 舊站 `/collections/彩色鑽石專區` 與新站既有 `/collections/color-diamond/` 同時存在，需決定 canonical 與轉址策略。
- 舊站 `/collections/diamond` 與新站 `/collections/diamond/` 可直接對應。

自動檢查腳本：

- `scripts/audit-content-migration.mjs`

執行結果：

- 已產出 `output/content-migration-audit.json`
- 已產出 `output/content-migration-audit.md`
- 已產出 `docs/migration/LEGACY_PAGE_MASTER_LIST.md`
- 已產出 `docs/migration/PAGE_CONTENT_BLOCK_AUDIT.md`
- 已產出 `docs/migration/TEXT_COMPLETENESS_AUDIT.md`
- 已產出 `docs/migration/IMAGE_COMPLETENESS_AUDIT.md`
- 已產出 `docs/migration/PRODUCT_COMPLETENESS_AUDIT.md`
- 已產出 `docs/migration/ARTICLE_COMPLETENESS_AUDIT.md`

Build 結果：

- `npm.cmd run build` 已通過。
- Astro 產出 29 個靜態頁面。

Visual QA 結果：

Critical：

- 無。本次未做視覺改版。

Major：

- 內容完整度不足：產品與圖片未完整搬遷，不得標示完整。

Minor：

- 新補 collection 入口使用暫時 hero 圖，需後續對應正確圖片。

目前內容完整度：

- 頁面：已補回主要 collection 入口，但仍有 16 個舊頁無新頁對應，8 個頁面文字顯著缺失。
- 文章：有對應頁，但仍需逐段核對與圖片核對。
- 產品：僅 2 筆新站產品，舊站候選款式仍大量缺失。
- 圖片：目前無法自動映射，需建立媒體對照與人工確認。

尚未完成項目：

- 完整產品資料回填。
- 舊站圖片/影片與新站資產的一對一映射。
- 舊頁到新頁的 canonical/redirect 策略。
- 品牌故事、FAQ、聯絡資訊等頁面的逐字回填。
- 文章內圖片與段落完整核對。

最終狀態：

- 部分修正
