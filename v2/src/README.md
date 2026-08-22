# TIFF 網站 V2 工作台 — 交接

最後更新：2026-08-22

## 兩個版本

| | 網址 | 本機檔 | 狀態 |
|---|---|---|---|
| **V1**（原版指南） | https://leeinsmart.github.io/tiff2026_GD/ | `Desktop/Code/TIFF/index.html` | **不要動**。Lee 指定保留這一版 |
| **V2**（新工作台） | https://leeinsmart.github.io/tiff2026_GD/v2/ | `Desktop/Code/TIFF/v2-src/` | 開發中，Lee 正在逐項微調 |

兩者放在同一個 repo `Leeinsmart/tiff2026_GD`：V1 是根目錄 `index.html`，V2 是 `v2/index.html`。
**每次部署 V2 前後都要確認 V1 的 `index.html` 校驗碼沒變**（`md5 -q index.html`）。

## V2 怎麼改、怎麼發布

V2 的 `index.html` 是**產生出來的**，不要直接手改。來源都在 `Desktop/Code/TIFF/v2-src/`：

```
build.py            組裝器：讀下面的資料與樣板，輸出 index.html
app.css             全部樣式
app.js              全部前端邏輯（渲染、路由、篩選、搜尋）
questions.json      66 張問題卡（從 V1 的 #asks 抽出來的，含對話與結論）
fields.json         每張卡的 負責／類型／對方／期限／下一步
retro.json          17 張已結案卡的 結案判斷（最終安排／採用原因／影響／可優化）
screenings.json     放映場次
people.json         人員矩陣（來自 V1 的全團行程一覽）
contacts.json       窗口總表
docs.html           原始文件整段（80 個 ✉ 錨點，原樣沿用 V1）
handbook_q.html     九大問題（沿用 V1）
handbook_forms.html 需填表單（沿用 V1）
smoke.js            用 Node 的最小 DOM 模擬跑四條渲染路徑，抓執行期錯誤
```

改完之後：

```bash
cd /Users/lichanchen/Desktop/Code/TIFF/v2-src
python3 build.py          # 產生 index.html
node smoke.js             # 四條路徑要全綠才算過
```

部署（clone 到暫存區操作，不要在專案資料夾裡建 git）：

```bash
gh repo clone Leeinsmart/tiff2026_GD /tmp/gd && cd /tmp/gd
md5 -q index.html                       # 記下 V1 校驗碼
cp /Users/lichanchen/Desktop/Code/TIFF/v2-src/index.html v2/index.html
md5 -q index.html                       # 必須與上面相同
git add v2/index.html && git commit -m "…" && git push
```

線上驗證：`curl -s "https://leeinsmart.github.io/tiff2026_GD/v2/?cb=$RANDOM" | diff -q - v2-src/index.html`

## V2 的結構（Lee 訂的規格）

五個分頁，同一套資料兩種讀法：

1. **現在要做**（首頁）緊急一行、待我方卡片（依期限）、等待對方表、近期行程
2. **全團行程** 日期時間軸（9/9–9/21，沒安排的日子不顯示）＋人員卡
3. **問題追蹤** 執行模式／回顧模式；核心資料庫，每個問題只有這裡有完整內容
4. **影展手冊** 九大問題、需填表單、放映場次、窗口總表
5. **原始文件** 沿用 V1 的 80 個錨點

**資料唯一位置**：處理過程只在問題卡；行程卡與人員卡只顯示標題與狀態並連過去。

## 已經定案、不要改回去的設計決定

- 文字五級各只有一種規格；間距只用刻度 `--s0..--s7`，不得出現 off-scale 數值
- 卡片網格用固定欄數（1/2/3），不用 `auto-fill`
- 問題標籤**只掛在最早的相關日**（事件開頭），不重複標
- 抵離與住宿標可信度，只有 **已確認（綠）／待確認（紅）** 兩種；理由寫在該筆說明行
- 沒有場次的日子不寫「無場次」；「在多倫多」已全部移除，出席一律只用「必出席」
- 場地與飯店前加圖釘、可點開 Google 地圖；**沒查證地址的只用名稱搜尋，不編地址**
- 返回會回到原本的畫面與捲動位置，不是固定回問題追蹤

## 踩過的坑（同類問題先查這裡）

- **class 撞名**：`.split` 同時當版面與狀態用，桌機 media query 把動向列變成 grid。版面 class 現已改名 `.twocol`
- **CSS `margin` 簡寫**會把繼承的左邊距歸零，造成單一區塊左緣不對齊
- **後代選擇器**：`.facts div` 會連內層一起中，要寫 `.facts>div`
- **時間軸前延**：`dates` 加了 5 天（PRE=5），所有拿 `p['days'][i]` 的地方都要減 PRE，否則人員行程整批偏移
- **flex `1 1 auto`** 會把後面的標籤頂到最右緣，看起來像凸出去

## 還沒做、等 Lee 決定

- 手機吸頂頁首 176px 要不要壓：**A** 只有分頁列吸頂／**B** 捲動時自動收起搜尋與下拉
- 舒華隨行團隊的抵達日從頭到尾沒人給過，時間軸放不上去（放上去就是編的）

## 相關檔案

- V1 的信件與問題內容維護方式：見 `Desktop/Code/TIFF/verify.sh`（V1 發布前硬關卡）
- 時程總覽交接檔：`Desktop/Code/釜山影展/TIFF_timeline_待更新.md`
