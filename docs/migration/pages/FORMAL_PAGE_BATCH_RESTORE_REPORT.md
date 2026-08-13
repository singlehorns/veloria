# FORMAL_PAGE_BATCH_RESTORE_REPORT

## Scope

本次延續 `ABOUT_PAGE_SOURCE_AUDIT.md` 的標準，將正式前台其他內容頁改為讀取舊站來源整理後的 `data/formal-content`。

## Generated Sources

- 產生器：`scripts/build-formal-content.mjs`
- 共用正式內容元件：`src/components/legacy/FormalContentPage.astro`
- 正式頁資料：`data/formal-content/pages/*.json`
- 正式系列頁資料：`data/formal-content/collections/*.json`

## Formal Pages Connected

| 頁面 | 正式路由 | 來源 JSON | 狀態 |
|---|---|---|---|
| 首頁 | `/` | `data/formal-content/pages/home.json` | formal-source-connected |
| 繁中入口 | `/zh-TW/` | `data/formal-content/pages/zh-tw.json` | formal-source-connected |
| 聯絡我們 | `/contact/` | `data/formal-content/pages/contact.json` | formal-source-connected |
| 知識專欄 | `/blogs/diamond-symphony-guide/` | `data/formal-content/pages/diamond-symphony-guide.json` | formal-source-connected |
| 尊榮定製 | `/pages/custom-service/` | `data/formal-content/pages/custom-service.json` | formal-source-connected |
| 常見問題 | `/pages/qna/` | `data/formal-content/pages/qna.json` | formal-source-connected |
| 隱私政策 | `/pages/privacy/` | `data/formal-content/pages/privacy.json` | formal-source-connected |
| 服務條款 | `/pages/terms/` | `data/formal-content/pages/terms.json` | formal-source-connected |

## Formal Collections Connected

19 個 `/collections/*/` 正式系列頁已改為讀取 `data/formal-content/collections/*.json` 的舊站標題、SEO 與來源資料，並保留現有產品卡呈現。

## Functional Pages

帳號、登入、購物車、搜尋等 CYBERBIZ 功能頁仍不重建功能，維持 legacy archive 備份與路由保留。

## Removed From Formal Output

- `舊站內容保留了...`
- `我們相信珠寶不是急著成交...`
- `若舊站聯絡資料有更新...`
- `CYBERBIZ 舊站內容已整理為 Astro 靜態網站基礎。`
- 錯誤地址：`台北市大安區忠孝東路四段 160 號 11 樓`
- 錯誤營業時間：`13:00 - 19:00`

## Restored Global Source Data

- 電話：`02-27791005`
- Email：`zuanzhiyun60@gmail.com`
- 營業時間：`11:00 ~ 19:00 ( 店休週日 )`
- 地址：`｜◆台北旗艦門市-敦化南路一段 160 巷 11 號｜`
- 統一編號：`00243191`
- LINE：`https://line.me/R/ti/p/@252flmie?oat_content=url&ts=12101714`

## Build

- `npm.cmd run build`
- Result: pass
- Astro check: 0 errors, 0 warnings, 0 hints
- Static output: 233 pages

## Status

partially-migrated-plus

正式使用中的主要內容頁與系列頁已改為舊站來源驅動。仍建議下一輪針對每個系列頁逐頁比對舊站商品格、排序、圖片與新站產品卡的完整對應。
