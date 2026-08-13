# ABOUT_PAGE_SOURCE_AUDIT

## Scope

- 舊頁面網址：https://www.dsdiamond.com.tw/pages/about-us
- 新頁面網址：/pages/about-us/
- 正式路由檔案：src/pages/pages/about-us.astro
- 結構化內容：data/legacy-content/pages/about.json
- 主要來源 HTML：C:/Users/U01/Desktop/DS/dsdiamond_backup/site/www.dsdiamond.com.tw/pages/about-us.html
- 輔助來源 Markdown：C:/Users/U01/Desktop/DS/dsdiamond_backup/migration/content/pages__about-us.md

## Removed From Formal Page

- `我們相信珠寶不是急著成交的商品，而是需要被理解、比較、確認與長久保存的紀念。`
- `鑽之韻 DIAMOND SYMPHONY 從天然鑽石、彩色鑽石與客製珠寶出發...`
- `舊站內容保留了求婚鑽戒、裸鑽、彩鑽、男戒、女戒、對戒、項鍊、耳環與手鍊等方向...`
- Generic ContactCTA block on the about page.

## Source-To-Formal Comparison

| 順序 | 舊站區塊 | 舊站文字/媒體 | 新站對應區塊 | 狀態 | 問題 |
|---:|---|---|---|---|---|
| 1 | Breadcrumb | 首頁 / 關於我們 | Breadcrumb nav | done | 無 |
| 2 | 歡迎標題 | 歡迎來到 鑽之韻 — 專屬於您的鑽石美學空間。 | Hero intro | done | 無 |
| 3 | 品牌介紹第一段 | 鑽之韻的品牌誕生於對永恆之美的熱愛與對匠心工藝的追求... | Intro paragraph | done | 無 |
| 4 | 創辦人專訪區塊 | 品牌創辦人 專訪 / Founder Interview | Founder section | done | 無 |
| 5 | 創辦人專訪影片 | YouTube ID `Q6DZdrUYy-8`, poster `https://i.ytimg.com/vi/Q6DZdrUYy-8/hqdefault.jpg` | Embedded iframe plus source link | done | 無 |
| 6 | 創辦理念與品牌長文 | 鑽之韻對品質的要求近乎苛刻...珠ㄕ寶... | Founder body copy | done | 舊站原字保留，含原始錯字 |
| 7 | 我們的商品 | 天然鑽石與實驗室培育鑽石首飾 / 訂婚戒、婚戒、項鍊、耳環、手鍊等 / 客製化設計服務 | Product list | done | 無 |
| 8 | 聯繫我們 / 門市資訊 | 台北旗艦門市：敦化南路一段160巷11號 | Contact section | done | 無 |
| 9 | 地圖 | Google Maps iframe | Embedded Google Maps iframe plus map link | done | 無 |
| 10 | 交通資訊 | 捷運轉乘、忠孝敦化站、忠孝復興站 | Transportation section | done | 無 |
| 11 | 外縣市及開車方式 | 市民大道 → 復興南路一段 → 右轉敦化南路一段... | Transportation section | done | 無 |
| 12 | 附近停車場資訊 | 嘟嘟房敦南站、城市車旅敦南站、忠孝敦化停車場 | Transportation section | done | 無 |
| 13 | 營業時間 | 11:00 - 19:00 ( 店休周日 ) | Business hours section | done | 無 |
| 14 | 線上客服資訊 | 線上客服不打烊，歡迎隨時聯繫我們 | Business hours section | done | 無 |
| 15 | Email | zuanzhiyun60@gmail.com | Contact info section | done | 無 |
| 16 | 電話 | 02-27791005 | Contact info section | done | 無 |
| 17 | LINE | https://lin.ee/dY9OiEQ | LINE link | done | 無 |
| 18 | 結尾標語 | ✨ 鑽石，有選擇；閃耀，無侷限 ✨ | Closing text | done | 無 |
| 19 | SEO Title | 關於我們 | BaseLayout title | done | 無 |
| 20 | Meta Description | 關於我們 | BaseLayout description | done | 無 |
| 21 | 舊網址與新網址對應 | `/pages/about-us` -> `/pages/about-us/` | about.json + route | done | 無 |

## Current Counts

These counts are based on the source-backed visible page content in `data/legacy-content/pages/about.json`, excluding global header/footer/account/cart UI noise.

| 指標 | 舊站 | 修正前新站 | 修正後新站 |
|---|---:|---:|---:|
| 可見文字字數 | 739 | 127 | 739 |
| 段落/區塊數 | 11 | 3 | 11 |
| 圖片數 | 1 | 1 | 1 |
| 影片數 | 1 | 0 | 1 |
| 連結數 | 6 | 0 | 6 |

## Content Migration Auditor

- 原始歡迎文字是否保留：pass
- 品牌介紹是否保留：pass
- 創辦人影片是否保留：pass
- 創辦理念長文是否保留：pass
- 商品方向是否保留：pass
- 聯絡資訊是否保留：pass
- 地址是否正確：pass
- 交通方式是否保留：pass
- 營業時間是否保留：pass
- Email 是否正確：pass
- 電話是否正確：pass
- LINE 是否正確：pass
- 圖片是否正確：pass
- 內容順序是否合理：pass
- 正式頁面是否可見完整內容：pass
- 是否仍出現內部搬遷備註：pass

## Status

fully-migrated. Build passed, desktop QA passed, mobile QA passed.
