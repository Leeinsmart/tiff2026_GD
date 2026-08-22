/* MOTIVIBES 跨裝置打勾清單 — 共用元件
 *
 * 用法：頁面在載入本檔前設定
 *   <script>window.MV_CHECKLIST={endpoint:"https://…workers.dev",list:"TIFF-2026",
 *                                  legacyKey:"舊的 localStorage key，選填"};</script>
 *   <script src="checklist.js"></script>          （或把全文內嵌）
 *
 * 契約：頁面上任何帶 data-k 的元素，只要裡面有 checkbox，就自動納管。
 *       V1 參展指南的關鍵時程本來就是這個結構，不必改標記。
 *
 * 行為：
 *   勾下去 → 畫面立刻反應、寫進本機、排入待送佇列、送出；送不出去就留在佇列
 *   開頁面 → 先補送佇列、再讀伺服器狀態覆蓋畫面（伺服器為準）
 *   離線可用，網路斷掉不會掉勾
 *
 * 頁面可選掛鉤：
 *   window.MV_CHECKLIST.onapply = function(map){…}   每次套用狀態後呼叫，map[項目代號]={v,t,d,n}
 */
(function () {
  "use strict";
  var CFG = window.MV_CHECKLIST;
  if (!CFG || !CFG.list) return;
  var online = !!CFG.endpoint;   // 沒設端點就只存本機，功能不停

  var LKEY = "mv_ck_" + CFG.list;          // 本機鏡像
  var QKEY = "mv_ckq_" + CFG.list;         // 待送佇列
  var MKEY = "mv_ckm_" + CFG.list;         // 已從舊 key 搬過的內容
  var DKEY = "mv_device_id";               // 與裝置計數器共用同一組裝置碼
  var NKEY = "mv_device_name";             // 這台裝置的名字，選填

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }
  function jget(k, dflt) { try { return JSON.parse(ls(k) || "") || dflt; } catch (e) { return dflt; } }
  function jput(k, o) { ls(k, JSON.stringify(o)); }

  var dev = ls(DKEY);
  if (!dev) {
    dev = (self.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2);
    ls(DKEY, dev);
  }
  var name = ls(NKEY) || "";

  var items = {};   // 項目代號 → {li, box}
  Array.prototype.forEach.call(document.querySelectorAll("[data-k]"), function (el) {
    var box = el.querySelector('input[type=checkbox]');
    if (box && el.dataset.k) items[el.dataset.k] = { li: el, box: box };
  });
  if (!Object.keys(items).length) return;

  function apply(map) {
    Object.keys(items).forEach(function (k) {
      var rec = map[k], on = !!(rec && rec.v);
      items[k].box.checked = on;
      items[k].li.classList.toggle("done", on);
    });
    if (typeof CFG.onapply === "function") { try { CFG.onapply(map); } catch (e) {} }
  }

  function url(item, val) {
    return CFG.endpoint + "/ck?l=" + encodeURIComponent(CFG.list) +
      (item ? "&i=" + encodeURIComponent(item) + "&v=" + (val ? 1 : 0) +
              "&d=" + encodeURIComponent(dev) + "&n=" + encodeURIComponent(name) : "");
  }

  // 佇列：{項目代號: 0|1}，只留最後一次意圖，同一項重複勾不會累積
  function queue(item, val) {
    var q = jget(QKEY, {}); q[item] = val ? 1 : 0; jput(QKEY, q);
  }
  function flush() {
    var q = jget(QKEY, {}), keys = Object.keys(q);
    if (!online || !keys.length) return Promise.resolve();
    return Promise.all(keys.map(function (k) {
      return fetch(url(k, q[k]), { method: "POST", keepalive: true })
        .then(function (r) {
          // 只有 204 才算真的寫進去：舊版 Worker 對未知路徑回 200 "ok"，
          // 當成成功會把還沒送出的勾直接刪掉，而且沒有人會發現。
          if (r.status === 204) { var c = jget(QKEY, {}); delete c[k]; jput(QKEY, c); }
        })
        .catch(function () {});
    }));
  }

  function pull() {
    if (!online) return Promise.resolve();
    return fetch(url(null), { cache: "no-store" })
      .then(function (r) {
        var ct = r.headers.get("Content-Type") || "";
        return (r.ok && ct.indexOf("json") >= 0) ? r.json() : null;
      })
      .then(function (map) {
        if (!map || typeof map !== "object" || Array.isArray(map)) return;
        // 還沒送出去的勾疊在伺服器狀態上：某一筆 POST 失敗時，
        // 不能讓她剛勾的那條在畫面上當場消失（它其實還在佇列裡等重送）。
        var pending = jget(QKEY, {}), local = jget(LKEY, {});
        Object.keys(pending).forEach(function (k) {
          map[k] = local[k] || { v: pending[k], t: new Date().toISOString(), d: dev, n: name };
        });
        jput(LKEY, map); apply(map);
      })
      .catch(function () {});
  }

  // 舊 key 搬家：增量，每次載入都比對一次。
  // 只搬一次是不夠的——舊版頁面還在線上時，使用者可能繼續在那邊勾，
  // 那些勾只會落在舊 key 裡，永遠上不了伺服器，看起來就是「勾了卻沒同步」。
  // 用 MKEY 記住上次搬過的內容，只處理有變動的項目，不會把她主動取消的勾救回來。
  if (CFG.legacyKey) {
    var legacy = jget(CFG.legacyKey, null);
    if (legacy && typeof legacy === "object") {
      var done = jget(MKEY, {}), mirror = jget(LKEY, {}), q = jget(QKEY, {}),
          now = new Date().toISOString(), moved = 0;
      Object.keys(legacy).forEach(function (k) {
        var v = legacy[k] ? 1 : 0;
        if (done[k] === v) return;               // 這一項上次就搬過了，狀態也沒變
        done[k] = v; moved++;
        mirror[k] = { v: v, t: now, d: dev, n: name };
        q[k] = v;
      });
      if (moved) { jput(MKEY, done); jput(LKEY, mirror); jput(QKEY, q); }
    }
  }

  // 1) 先用本機鏡像上色，離線也看得到自己的進度
  apply(jget(LKEY, {}));

  // 2) 補送離線期間的勾，再以伺服器狀態為準
  if (online) flush().then(pull);

  Object.keys(items).forEach(function (k) {
    items[k].box.addEventListener("change", function () {
      var on = items[k].box.checked;
      items[k].li.classList.toggle("done", on);
      var mirror = jget(LKEY, {});
      mirror[k] = { v: on ? 1 : 0, t: new Date().toISOString(), d: dev, n: name };
      jput(LKEY, mirror);
      if (typeof CFG.onapply === "function") { try { CFG.onapply(mirror); } catch (e) {} }
      queue(k, on);
      if (online) flush();
    });
  });

  // 回到分頁時重讀一次，對方剛勾的會補上來
  document.addEventListener("visibilitychange", function () {
    if (online && !document.hidden) flush().then(pull);
  });

  window.MV_CHECKLIST.refresh = function () { return flush().then(pull); };
  window.MV_CHECKLIST.setName = function (n) { name = String(n || "").slice(0, 24); ls(NKEY, name); };
})();
