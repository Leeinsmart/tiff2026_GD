# TIFF 網站 V2 工作台 — 開發須知

最後更新：2026-08-23（發布改走 publish_page.sh；本檔角色由「對話視窗交接」改為「V2 開發時要遵守的既定約束」）

這份留下來的理由只有一個：下面的設計決定與踩過的坑，每一條都是實際撞過才寫的，不寫下來就會再撞一次。跨對話視窗的交接功能已經廢止。

## 兩個版本

| | 網址 | 本機檔 | 狀態 |
|---|---|---|---|
| **V1**（原版指南） | https://leeinsmart.github.io/tiff2026_GD/ | `Desktop/Code/TIFF/index.html` | 版面不要動；內容由 `tiff-mail-watcher` 每天依新信更新 |
| **V2**（新工作台） | https://leeinsmart.github.io/tiff2026_GD/v2/ | `Desktop/Code/TIFF/v2-src/` | 開發中，Lee 正在逐項微調 |

兩者放在同一個 repo `Leeinsmart/tiff2026_GD`：V1 是根目錄 `index.html`，V2 是 `v2/index.html`。
發布工具只寫指定的那一個路徑，改 V2 不會動到 V1，不需要再人工比對校驗碼。

## 打勾清單是跨裝置的（2026-08-22 起）

V1 與 V2 的關鍵時程共用同一份打勾，存在既有的 `mv-count` Cloudflare Worker，清單代號 `TIFF-2026`。
不同電腦、不同人都看得到同一份，每條標示是誰哪天勾的。

- 元件唯一來源：`MOTIVIBES-system/_tools/checklist.js`，接法與邊界見同資料夾的 `checklist_SETUP.md`
- **V1 用外部載入**（`<script src="checklist.js">`）：V1 是手工維護的檔案，元件改版時只要重發 `checklist.js`，不必再動 V1
- **V2 在 build 時內嵌**：V2 是產生出來的單檔，`build.py` 每次都從上面那個唯一來源讀進來
- 部署時 repo 根目錄的 `checklist.js` **一律從 `_tools/checklist.js` 複製**，不要從 `Desktop/Code/TIFF/checklist.js` 複製（那份只是本機預覽用）
- 舊的 `localStorage['tiff2026-checklist']` 由元件增量搬上伺服器，只讀不刪；使用者在還沒換版的頁面補勾，下次載入會補搬

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
smoke.js            用 Node 的最小 DOM 模擬跑五條渲染路徑，抓執行期錯誤
```

**四個區塊沒有自己的資料檔，建置時直接從 V1 抽**（2026-08-22 起）：
原始文件 `#docs`、九大問題 `#questions`、需填表單 `#forms`、工作清單確認 `#timeline`。
以前這三個是 `v2-src/` 裡的快照，已經走鐘——原始文件少了 ✉45 的兩份附件、8 個錨點、10,209 字，
搜尋與連結都會指向不存在的東西。`v1_section()` 抽完會檢查字數門檻，抽壞了直接中止建置。
建置訊息最後會報「文件錨點」數，要和 V1 的一致（目前 99）。

工作清單確認的細節：`build_todo()` 抽 `<section id="timeline">`，
轉成 `<ul class="todo">`、補上 `data-roles`，再走既有的 `strip_sec()` 換錨點。抽到少於 40 條就中止建置。
`tiff-mail-watcher` 每天改 V1，V2 重跑 build 就會跟上，不會有兩份期限表各走各的。
打勾由共用元件 `MOTIVIBES-system/_tools/checklist.js` 管，存在 Cloudflare Worker（清單代號 `TIFF-2026`），
**跨裝置、跨人**：太太在她電腦勾的，你打開就看得到，並標示是誰哪天勾的。接法與邊界見
`MOTIVIBES-system/_tools/checklist_SETUP.md`；BIFF 與東京影展照同一份接。
`build.py` 建置時把元件與 `pagecount.conf` 的 ENDPOINT 一起內嵌，本專案不另存一份元件。
舊的 `localStorage['tiff2026-checklist']` 由 `legacyKey` 自動搬家，只搬一次。

改完之後：

```bash
cd /Users/lichanchen/Desktop/Code/TIFF/v2-src
python3 build.py          # 產生 index.html
node smoke.js             # 五條路徑要全綠才算過
```

部署一律走 `publish_page.sh`，**不要用 gh、git 或任何其他方式手動推**（全域規則；2026-08-23 之前這裡寫的是 `gh repo clone` + `git push`，照著做會發出沒有裝置計數器的頁面，四頁裡三頁因此一直沒在計數）。

完整指令、計數代號與線上驗證方式，唯一來源是 `~/.claude/scheduled-tasks/tiff-mail-watcher/SKILL.md` 的〈參數：發布方式〉，這裡不重寫一份。要點只有三個：V1 與 V2 同一個 repo 不同路徑，工具只換指定的那一個檔；兩頁的計數代號分開（`tiff2026_GD` 與 `tiff2026_GD-v2`）；**線上驗證不能用 md5 比對**，工具會把計數器注入到上傳的那一份，線上檔案本來就會和本機差一段。

## V2 的結構（Lee 訂的規格）

六個分頁，同一套資料兩種讀法：

1. **現在要做**（首頁）緊急一行、待我方卡片（依期限）、等待對方表、近期行程
2. **工作清單確認** V1 關鍵時程的 49 條逐項打勾，篩選：還沒勾／已勾、製片／公關／行銷
3. **全團行程** 日期時間軸（9/9–9/21，沒安排的日子不顯示）＋人員卡
4. **問題追蹤** 執行模式／回顧模式；核心資料庫，每個問題只有這裡有完整內容
5. **影展手冊** 九大問題、需填表單、放映場次、窗口總表
6. **原始文件** 沿用 V1 的錨點（目前 99 個，數量隨 V1 變動，不要寫死）

另有 **#find 搜尋結果**，不在分頁列裡，只能從搜尋框跳進去。

## 全站搜尋（2026-08-22 起）

搜尋框涵蓋六個來源：原始文件（含文件標題與檔名）、影展手冊（九大問題／需填表單／放映場次／窗口總表）、
工作清單確認、問題卡（含下一步、期限、結案判斷）、人員、行程。改版前只搜問題卡，
搜得到的字 15,737、搜不到的 146,550——九成三的內容搜尋看不見。

- **索引在執行期建**，不進 build 產物：語料本來就在 DOM 或 `window.DATA` 裡。
  載入後用 `requestIdleCallback` 先建好，第一次打字不必等（第一次建約 1 秒）。
- **折疊 `foldNorm()` 長度不變**：每個字元進去一個出來一個，所以折疊字串裡的位置就是原字串的位置，
  不必維護位移對照表。**不可以改用 `toLowerCase()` 或 `normalize()`**——那兩個會改變長度，位置就全錯。
  處理大小寫、全形 ASCII（「９／１７」對得到「9/17」）、空白、同形標點。
- **DATA 來源要解 HTML 實體**：`questions.json` 等存的是 HTML 片段，`&amp;` 是字面值。
  不解的話搜「Q&A」「P&M」永遠零命中，但畫面上明明看得到。
- 落點連結格式 `#<錨點>~<關鍵字>`。這個後綴換到三件事：結果可以傳給別人、重新整理後高亮還在、
  按上一頁回得到同一份結果。`route()` 用第一個 `~` 切開。
- `route()` 有**泛用錨點分支**：頁面上任何有 id、又住在某個 view 裡的元素都跳得到。
  新增錨點不必再加分支——前綴表是縮短不是加長。

跳過去之後：展開祖先 `details` →「用 TreeWalker 把關鍵字包成 `<mark class="kw">`」→ 捲到位置 → 閃一下。
一律不用 innerHTML 取代，才不會破壞既有的連結、`details` 與打勾。

**資料唯一位置**：處理過程只在問題卡；行程卡與人員卡只顯示標題與狀態並連過去。

## 已經定案、不要改回去的設計決定

- 文字五級各只有一種規格；間距只用刻度 `--s0..--s7`，不得出現 off-scale 數值
- 卡片網格用固定欄數（1/2/3），不用 `auto-fill`
- 問題標籤**只掛在最早的相關日**（事件開頭），不重複標
- 抵離與住宿標可信度，只有 **已確認（綠）／待確認（紅）** 兩種；理由寫在該筆說明行
- 沒有場次的日子不寫「無場次」；「在多倫多」已全部移除，出席一律只用「必出席」
- 場地與飯店前加圖釘、可點開 Google 地圖；**沒查證地址的只用名稱搜尋，不編地址**
- 返回會回到原本的畫面與捲動位置，不是固定回問題追蹤
- **窄版（<1000px）頁首只留一行**：片名＋選單按鈕（按鈕上寫目前所在分頁），搜尋、分頁、基本資料收進展開面板；
  點分頁、點面板外、Esc、搜尋按 Enter 都會收起。吸頂高度從 147px 降到 47px。分頁列不橫滑、不裁切
- 吸頂高度由 `syncStick()` 實測寫進 `--stick`，`scroll-padding-top` 也吃這個變數，不寫死

## 踩過的坑（同類問題先查這裡）

- **class 撞名**：`.split` 同時當版面與狀態用，桌機 media query 把動向列變成 grid。版面 class 現已改名 `.twocol`
- **CSS `margin` 簡寫**會把繼承的左邊距歸零，造成單一區塊左緣不對齊
- **後代選擇器**：`.facts div` 會連內層一起中，要寫 `.facts>div`
- **時間軸前延**：`dates` 加了 5 天（PRE=5），所有拿 `p['days'][i]` 的地方都要減 PRE，否則人員行程整批偏移
- **flex `1 1 auto`** 會把後面的標籤頂到最右緣，看起來像凸出去
- **`closest('[data-tf]')` 會往上抓到容器**：篩選狀態寫在 `#todo` 自己身上時，從按鈕往上找一定先中容器，
  角色篩選整組失效。選擇器要寫成 `closest('button[data-tf]')`
- **內嵌 JS 時 `</script` 會提前關掉標籤**：checklist.js 的註解裡有 `</script>` 範例，直接內嵌會讓整頁 JS 死掉。
  `build.py` 的 `inline_js()` 會換成 `<\/script`，DATA、app.js、元件都要過這一層
- **把任何 200 當成寫入成功會靜靜掉勾**：舊版 Worker 對未知路徑回 200 `ok`，元件只認 204
- **煙霧測試靠 `<script id="app">` 抓 app.js**，不要再用「最後一個 script」的寫法
- **`.panel` 撞名**：影展手冊的表單卡早就在用這個 class，我為選單面板加的 `.panel{display:contents}`
  是全域規則，把那四張卡的方框整個弄不見。已照 `.split → .twocol` 的前例改名 `.navpanel`。
  加新 class 前先 `grep` 一次全站
- **`:target` 會中到 `section.view`**：六個分頁的 id 本身就是 hash 目標，每按一次分頁，
  整段（影展手冊有 6000px 高）就整片閃粉紅。已收斂成 `main :target:not(.view)`
- **閃光不要動 `background`**：卡片、紅底項目、白底文件都有自己的底色，動背景會讓它們先褪成透明再彈回來。
  `.kwhit` 改用 `box-shadow` 外框
- **`mark` 不要生在 flex／grid 容器的裸文字裡**：一個匿名 flex item 被切成三個，容器的 gap 就長在字中間，
  標題會裂開。`markIn()` 會跳過這類父元素，也跳過狀態徽章（深底白字標了會看不見）
- **V1 的關鍵時程有一條 li 自己帶 id**（`schedule-deadline`）。硬補 id 會讓同一個標籤有兩個 id，
  瀏覽器只認第一個，舊錨點就死了，而且 build 不會報錯。已改成有 id 就沿用
- **加第六個分頁把頁首撐出畫面**：`grid-template-columns:1fr 340px` 在 900–999px 塞不下六個分頁，
  搜尋與基本資料被推到視窗右緣外。兩欄格線改成 1000px 起跳，`.basic` 的浮出面板要一起搬
- **改分頁名稱要重量分頁列寬度**：六個分頁在 1000px 只剩約 588px 可用，名稱加長就會切掉最後一頁。
  桌機分頁內距已從 `--s4` 收到 `--s3`（留約 48px 餘裕）；再加字要先量 `.tabs` 的 `scrollWidth-clientWidth`

## 還沒做、等 Lee 決定

- V1 關鍵時程有 18 條標紅底（`class="hot"`），V1 沒有任何說明講紅底代表什麼，
  所以 V2 只沿用紅底、沒有做成篩選按鈕。要做的話得先知道這個標記的判準是什麼
- 舒華隨行團隊的抵達日從頭到尾沒人給過，時間軸放不上去（放上去就是編的）

## 已決、不必再問

- 手機吸頂頁首 176px 的 A／B：改用選單按鈕收合，兩案都不採用（見上面的設計決定）

## 相關檔案

- V1 的信件與問題內容維護方式：見 `Desktop/Code/TIFF/verify.sh`（V1 發布前硬關卡）
- 時程總覽交接檔：`Desktop/Code/釜山影展/TIFF_timeline_待更新.md`
