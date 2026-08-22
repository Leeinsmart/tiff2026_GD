# -*- coding: utf-8 -*-
import io, json, os, re, sys
S = os.path.dirname(os.path.abspath(__file__))
def rd(f): return json.load(io.open(os.path.join(S,f),encoding='utf-8'))
def rt(f): return io.open(os.path.join(S,f),encoding='utf-8').read()

LINKMAP={'#asks':'#track','#timeline':'#now','#operations':'#sched','#screenings':'#book',
         '#questions':'#book','#forms':'#book','#contacts':'#book','#roles':'#sched','#flights':'#sched'}
LINKTEXT={u'待問清單':u'問題追蹤',u'所有問題':u'問題追蹤',u'見所有問題':u'見問題追蹤',
          u'關鍵時程':u'現在要做',u'見關鍵時程':u'見現在要做',u'全團行程一覽':u'全團行程',
          u'放映場次':u'影展手冊的放映場次'}


# 場地地址（取自 V1 已查證的註記，未查證者只用場地名搜尋，不編地址）
VENUE_Q={
 u'Royal Alexandra Theatre': u'Royal Alexandra Theatre, 260 King Street West, Toronto',
 u'Scotiabank': u'Cineplex Scotiabank Theatre Toronto, 259 Richmond Street West, Toronto',
}
def mapurl(v):
    if not v: return ''
    import urllib.parse as _u
    q=None
    for k,val in VENUE_Q.items():
        if k in v: q=val; break
    if q is None: q=v+u', Toronto'
    return u'https://www.google.com/maps/search/?api=1&query='+_u.quote(q)


# ── 人員動向：抵達／離開／入住／退房 ──────────────────────────
# 每一筆都標可信度，並註明依據；不確定的連到對應問題卡。
# conf: ok=已確認  req=需求單（未開票／詢價中）  split=兩說並存  tbd=未定
MOVES=[
 # 阮鳳儀（導演）
 {'d':u'9/9（三）', 'who':u'阮鳳儀','kind':u'抵達','conf':'split',
  'air':1,'text':u'BR36 抵多倫多','why':u'需求單，雄獅詢價中；向大會申報的旅行日期是 9/10–9/20，兩份數字並存','q':'q28'},
 {'d':u'9/15（二）','who':u'阮鳳儀','kind':u'入住','conf':'ok','place':u'Sheraton Centre Toronto',
  'text':u'Sheraton Centre Toronto（5 晚）','why':u'8/21 大會訂房確認；招待 3 晚＋自付 2 晚 CAD $955.84','q':'q13'},
 {'d':u'9/20（日）','who':u'阮鳳儀','kind':u'退房','conf':'ok','place':u'Sheraton Centre Toronto','text':u'Sheraton Centre Toronto','why':u'8/21 大會訂房確認','q':''},
 {'d':u'9/21（一）','who':u'阮鳳儀','kind':u'離開','conf':'req',
  'air':1,'text':u'01:45 BR35 返台','why':u'需求單，雄獅詢價中，尚未開票','q':'q52'},
 # 葉舒華
 {'d':u'9/16（三）','who':u'葉舒華','kind':u'抵達','conf':'ok',
  'air':1,'text':u'BR36 晚 21:20 抵（商務艙）','why':u'e-ticket 8/17 已交；班次時刻取自需求單。接送須於抵達前 5 日內向 Tiffin 預訂','q':''},
 {'d':u'9/16（三）','who':u'葉舒華','kind':u'入住','conf':'ok','place':u'Sheraton Centre Toronto',
  'text':u'Sheraton Centre Toronto 標準房（4 晚）','why':u'8/21 大會訂房確認，明文註記非套房','q':'q13'},
 {'d':u'9/19（六）','who':u'葉舒華','kind':u'離開','conf':'split',
  'air':1,'text':u'22:55 多倫多飛倫敦','why':u'✉33 附件所載回程；但飯店訂到 9/20 退房，離開日仍是兩說','q':'q03'},
 {'d':u'9/20（日）','who':u'葉舒華','kind':u'退房','conf':'split','place':u'Sheraton Centre Toronto',
  'text':u'Sheraton Centre Toronto','why':u'訂房開到 9/20，與 9/19 晚班機衝突；第 4 晚買到的是白天用房還是過夜未核對','q':'q14'},
 # 陳璇
 {'d':u'9/12（六）','who':u'陳璇','kind':u'抵達','conf':'ok',
  'text':u'抵多倫多，先以觀眾身分參與影展','why':u'8/14 已告知大會；機票與住宿自費','q':''},
 # Clifford Miu
 {'d':u'9/9（三）', 'who':u'Clifford Miu','kind':u'抵達','conf':'req','air':1,'text':u'BR36 抵多倫多','why':u'需求單，雄獅詢價中','q':'q52'},
 {'d':u'9/15（二）','who':u'Clifford Miu','kind':u'入住','conf':'req','text':u'雙床房 9/15–9/20','why':u'需求單，雄獅詢價中，飯店未定','q':'q52'},
 {'d':u'9/20（日）','who':u'Clifford Miu','kind':u'退房','conf':'req','text':u'雙床房','why':u'需求單，雄獅詢價中','q':'q52'},
 {'d':u'9/21（一）','who':u'Clifford Miu','kind':u'離開','conf':'req','air':1,'text':u'01:45 BR35 返台（9/22 清晨抵台）','why':u'需求單，雄獅詢價中','q':'q52'},
]
CONF_LBL={'ok':u'已確認','req':u'待確認','split':u'待確認','tbd':u'待確認'}

Q   = rd('questions.json')
SCR = rd('screenings.json')
PPL = rd('people.json')
CT  = rd('contacts.json')
FIELDS = rd('fields.json') if os.path.exists(os.path.join(S,'fields.json')) else []
RETRO  = rd('retro.json')  if os.path.exists(os.path.join(S,'retro.json'))  else []
fmap = {f['id']:f for f in FIELDS}
rmap = {r['id']:r for r in RETRO}

# ── 合併欄位 ──
for q in Q:
    f = fmap.get(q['id'], {})
    q['owner']       = f.get('owner') or []
    q['type']        = f.get('type') or ''
    q['counterparty']= f.get('counterparty') or ''
    q['deadline']    = f.get('deadline')
    q['deadlineNote']= f.get('deadlineNote')
    q['nextStep']    = f.get('nextStep')
    if q['status']=='done' and q['id'] in rmap:
        r = rmap[q['id']]
        q['retro'] = {k:r[k] for k in ('outcome','why','impact','improve')}

# ── 問題 ↔ 日期／人員 ──
DAYMAP = [
 (u'首映|9/17|Premiere|首映日',      u'9/17（四）'),
 (u'第二場|9/18|早午餐',              u'9/18（五）'),
 (u'第三場|P3|9/19',                  u'9/19（六）'),
 (u'第四場|P4|9/20|退房',             u'9/20（日）'),
 (u'機場接送|抵達|入住|9/16',         u'9/16（三）'),
 (u'9/15',                            u'9/15（二）'),
 (u'9/14',                            u'9/14（一）'),
]
PMAP = [(u'舒華|Shuhua',u'葉舒華'),(u'導演|阮鳳儀|Fiona|Roan',u'阮鳳儀'),(u'陳璇|Xuan',u'陳璇'),
        (u'蔡凡熙|Kent',u'蔡凡熙'),(u'Linhan',u'Linhan Zhang'),(u'Clifford',u'Clifford Miu'),
        (u'Anli',u'Anli Lin'),(u'Lisa Ho',u'Lisa Ho'),(u'Leo|王豪',u'Leo 王豪'),
        (u'Fred|銷售代理',u'銷售代理'),(u'隨行|entourage|經紀|保鑣|妝髮',u'舒華隨行 7 人')]
def blob(q):
    return q['title']+' '+re.sub(r'<[^>]+>','',q['fact'])+' '+re.sub(r'<[^>]+>','',q['concl'])+' '+\
           ' '.join(re.sub(r'<[^>]+>','',t['text']) for t in q['thread'])
SRCLBL={'#track':u'問題追蹤','#now':u'現在要做','#sched':u'全團行程','#book':u'影展手冊'}
for q in Q:
    s = blob(q)
    q['relEvents'] = [d for pat,d in DAYMAP if re.search(pat,s)]
    q['relPeople'] = [n for pat,n in PMAP if re.search(pat,s)]
    q['srcs'] = [x if x.startswith('#doc') else LINKMAP.get(x,'#book') for x in q['srcs']]
    q['srcs'] = list(dict.fromkeys(q['srcs']))

# ── 日程 ──
dates = [u'9/9（三）',u'9/10（四）',u'9/11（五）',u'9/12（六）',u'9/13（日）'] + PPL['dates']
PRE = 5  # 前面 5 天矩陣沒有資料
scr_by_date = {}
for s0 in SCR:
    scr_by_date.setdefault(s0['date'], []).append(s0)
# 每張問題卡只掛在最早的那一天（事件開頭），不重複標
_order={d:i for i,d in enumerate(dates)}
for q in Q:
    rel=[d for d in q['relEvents'] if d in _order]
    q['anchorDay']=min(rel,key=lambda x:_order[x]) if rel else ''
days=[]
for i,d in enumerate(dates):
    items=[]; venue=''; vl=''; notes=[]
    for s0 in scr_by_date.get(d,[]):
        items.append(u'%s %s'%(s0['time'], s0['kind']))
        venue = s0['venue']; vl = s0['vl']
    NOTPERSON=(u'本片放映',)
    must=[]
    for p in PPL['people']:
        if p['name'] in NOTPERSON: continue
        j=i-PRE
        if 0<=j<len(p['days']) and p['days'][j].get('must'): must.append(p['name'])
    who=[]
    scr_txt=u' '.join(items)
    for p in PPL['people']:
        if p['name'] in NOTPERSON: continue
        j=i-PRE
        if j<0 or j>=len(p['days']): continue
        ev=p['days'][j]['ev']
        if not ev or ev in (u'—',u'未抵達',u'已離開',u'待定'): continue
        if p['name'] not in must: who.append(p['name'])
        # 只留「不是重述當日場次」的個人事項
        core=re.sub(u'[0-9:：/（）()\s]','',ev)
        _times=re.findall(u'[0-9]{1,2}:[0-9]{2}', scr_txt)
        _dup = any(t in ev for t in _times)
        if ev in (u'在多倫多',) or _dup or (core and core in re.sub(u'[0-9:：/（）()\\s]','',scr_txt)):
            continue
        notes.append(u'%s：%s'%(p['name'],ev))
    qids=[q['id'] for q in Q if q.get('anchorDay')==d and q['status']!='done']
    call=u'18:40 到場（開演前 50 分鐘）' if d.startswith(u'9/17') else ''
    moves=[dict(m, conflbl=CONF_LBL[m['conf']], cls=('ok' if m['conf']=='ok' else 'wait'),
                map=(mapurl(m['place']) if m.get('place') else '')) for m in MOVES if m['d']==d]
    # 當天已有該人的動向，就不再用「異動」重述一次
    _movers={m['who'] for m in moves}
    notes=[n for n in notes if n.split(u'：')[0] not in _movers]
    days.append({'date':d,'items':items,'venue':venue,'vl':vl,'map':mapurl(venue),'people':who,'must':must,'call':call,'moves':moves,
                 'notes':sorted(set(notes)),'qids':qids,
                 'key':bool(scr_by_date.get(d))})

# ── 人員卡 ──
import re as _re
people=[]
for p in PPL['people']:
    if p['name']==u'本片放映': continue
    qids=[q['id'] for q in Q if p['name'] in q['relPeople']]
    flights=[x for x in p['status'] if _re.search(u'機票|班機|BR3|航班|返台|飛',x)]
    hotel=[x for x in p['status'] if _re.search(u'住宿|飯店|退房|入住|Sheraton',x)]
    other=[x for x in p['status'] if x not in flights and x not in hotel]
    itin=[]
    for i2,d2 in enumerate(dates):
        j2=i2-PRE                      # 矩陣只有 9/14 起，前面 PRE 天沒有資料
        if j2<0 or j2>=len(p['days']): continue
        c=p['days'][j2]
        if c['ev'] and c['ev'] not in (u'—',u'未抵達',u'已離開'):
            itin.append({'d':d2,'ev':c['ev'],'note':c['note'],'must':c['must']})
    mymoves=[dict(m, conflbl=CONF_LBL[m['conf']], cls=('ok' if m['conf']=='ok' else 'wait'),
                  map=(mapurl(m['place']) if m.get('place') else ''))
             for m in MOVES if m['who']==p['name']]
    mymoves.sort(key=lambda m:_order.get(m['d'],99))
    people.append({'name':p['name'],'role':p['role'],'status':p['status'],'qids':qids,
                   'flights':flights,'hotel':hotel,'other':other,'itin':itin,'moves':mymoves})

# 基本資料只放「場次」——單元、影展日期已在頁首，不重複
PUB=[x for x in SCR if u'公開' in x['kind']]
NAME={0:u'世界首映',1:u'第二場',2:u'第三場',3:u'第四場'}
facts=[{'k':u'英文片名','v':u'Happily Ever After'},
       {'k':u'影展','v':u'第 51 屆多倫多國際影展'},
       {'k':u'入選單元','v':u'Special Presentations'},
       {'k':u'影展日期','v':u'2026.9.10 – 9.20'}]
facts+=[{'k':NAME.get(i,x['kind']),'v':u'%s %s'%(x['date'],x['time'])} for i,x in enumerate(PUB)]
_p=PUB[0] if PUB else None
summary=(u'<b>首映</b> %s %s　·　共 %d 場放映'%(_p['date'].split(u'（')[0], _p['time'], len(PUB))) if _p else u'基本資料'
META={'facts':facts,'summary':summary}

DATA={'meta':META,'questions':Q,'days':days,'people':people,'contacts':CT,'screenings':SCR}

# ── 手冊 ──
def strip_sec(html):
    html=re.sub(r'^<section[^>]*>','',html.strip())
    html=re.sub(r'</section>$','',html.strip())
    for a,b in LINKMAP.items():
        html=html.replace('href="%s"'%a,'href="%s"'%b)
    for a,b in LINKTEXT.items():
        html=html.replace('>%s</a>'%a,'>%s</a>'%b)
    return html
book = u'<p class="sub">規則、表單、窗口。這裡解釋「規則是什麼」；某條規則現在引發的實際問題，連到問題卡，不在這裡重寫進度。</p>'
book += u'<h2 class="h first"><span class="n">01</span>九大問題</h2>' + strip_sec(rt('handbook_q.html'))
book += u'<h2 class="h"><span class="n">02</span>需填表單</h2>' + strip_sec(rt('handbook_forms.html'))
book += u'<h2 class="h"><span class="n">03</span>放映場次</h2><div class="tw"><table><thead><tr><th>日期</th><th>時間</th><th>台灣</th><th>性質</th><th>場地／VL</th><th>座位</th><th>入場憑證</th></tr></thead><tbody>'
for s0 in SCR:
    _pin=u'<svg class="pin" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>'
    _v=(u'<a class="venue" href="%s" target="_blank" rel="noopener">%s%s</a>'%(mapurl(s0['venue']),_pin,s0['venue'])) if s0['venue'] else u''
    book += u'<tr><td class="n">%s</td><td class="n">%s</td><td class="n">%s</td><td>%s</td><td>%s%s</td><td class="n">%s</td><td>%s</td></tr>'%(
        s0['date'],s0['time'],s0['tw'],s0['kind'],_v,
        (u'<br>VL：'+s0['vl']) if s0['vl'] else '',s0['seats'],s0['ticket'])
book += u'</tbody></table></div>'
book += u'<h2 class="h"><span class="n">04</span>窗口總表</h2><div class="tw"><table><thead><tr><th>事務</th><th>窗口</th></tr></thead><tbody>'
for c in CT:
    book += u'<tr><td>%s</td><td>%s</td></tr>'%(c['topic'],c['who'])
book += u'</tbody></table></div>'

docs = strip_sec(rt('docs.html'))

HTML = u'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>《幸福快樂的日子》TIFF 2026 工作台（V2）</title>
<meta name="robots" content="noindex,nofollow">
<style>%(css)s</style>
</head>
<body>
<header class="appbar"><div class="in">
  <h1 class="brandrow"><span class="t">《幸福快樂的日子》TIFF 2026</span></h1>
  <div class="searchwrap"><input id="q" type="search" placeholder="搜尋問題、人名、窗口、日期…" autocomplete="off"></div>
  <details class="basic"><summary><span>%(bsum)s</span></summary><div class="facts">%(bfacts)s</div></details>
  <nav class="tabs">
    <button data-v="now">現在要做</button>
    <button data-v="sched">全團行程</button>
    <button data-v="track">問題追蹤</button>
    <button data-v="book">影展手冊</button>
    <button data-v="docs">原始文件</button>
  </nav>
</div></header>
<main>
  <section id="now" class="view"></section>
  <section id="sched" class="view"></section>
  <section id="track" class="view"></section>
  <section id="book" class="view"><div class="wrap">%(book)s</div></section>
  <section id="docs" class="view"><div class="wrap">%(docs)s</div></section>
</main>
<script>window.DATA=%(data)s;</script>
<script>%(js)s</script>
</body>
</html>''' % {
  'css': rt('app.css'),
  'js':  rt('app.js'),
  'book': book,
  'docs': docs,
  'data': json.dumps(DATA, ensure_ascii=False, separators=(',',':')),
  'bsum': META['summary'],
  'bfacts': u''.join(u'<div><div class="k">%s</div><div class="v">%s</div></div>'%(f['k'],f['v']) for f in META['facts']),
}
out = os.path.join(S,'index.html')
io.open(out,'w',encoding='utf-8').write(HTML)
print(u'V2 已產生 %d KB｜問題 %d｜日程 %d 天｜人員 %d｜窗口 %d｜已填欄位 %d｜結案判斷 %d' % (
  len(HTML)//1024, len(Q), len(days), len(people), len(CT), len(fmap), len(rmap)))
