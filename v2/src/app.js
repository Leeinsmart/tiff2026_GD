(function(){
"use strict";
var D=window.DATA, Q=D.questions, byId={};
Q.forEach(function(q){byId[q.id]=q;});
var $=function(s,r){return (r||document).querySelector(s);};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var LBL={us:'待我方',them:'待對方',done:'已解決'};
var VIEWS=['now','sched','track','book','docs'];

function pill(c,t){return '<span class="pill '+c+'">'+t+'</span>';}
function srcLinks(refs){return (refs||[]).map(function(n){
  return '<a class="src" href="#doc-email-e'+n+'">✉'+n+'</a>';}).join('');}
function dnum(d){ if(!d) return 9999; var m=/(\d+)\/(\d+)/.exec(d); return m?(+m[1])*100+(+m[2]):9999; }
function lastD(q){return q.thread.length?q.thread[q.thread.length-1].d:'';}
function H(n,t,extra){return '<h2 class="h'+(extra||'')+'"><span class="n">'+n+'</span>'+t+'</h2>';}
var PLANE='<svg class="plane" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">'+
  '<path fill="currentColor" d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
var PIN='<svg class="pin" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">'+
  '<path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
function moveRow(m,withDate){
  var k={'抵達':'in','離開':'out','入住':'ci','退房':'co'}[m.kind]||'in';
  var body = m.map ? venueLink(m.text,m.map) : m.text;
  return '<li class="mv '+m.cls+'">'+
    '<div class="mhead">'+
      '<span class="mk k'+k+'">'+(m.air?PLANE:'')+m.kind+'</span>'+
      (withDate?'<span class="mw">'+m.d.split('（')[0]+'</span>':'<span class="mw">'+m.who+'</span>')+
      '<span class="mt">'+body+'</span>'+
      '<span class="pill '+m.cls+'">'+m.conflbl+'</span>'+
    '</div>'+
    (m.why?'<div class="mwhy">'+m.why+
      (m.q&&byId[m.q]?'　<a href="#" data-q="'+m.q+'">'+byId[m.q].title+' →</a>':'')+'</div>':'')+
  '</li>';
}
function venueLink(name,url){
  if(!name) return '';
  return url ? '<a class="venue" href="'+url+'" target="_blank" rel="noopener">'+PIN+name+'</a>'
             : '<span class="venue">'+PIN+name+'</span>';
}

/* ── 問題摘要卡 ── */
function cardHTML(q,o){
  o=o||{};
  var m=[pill(q.status,LBL[q.status])];
  if(q.deadline) m.push(pill('due','期限 '+q.deadline));
  if(q.owner&&q.owner.length) m.push('<span>'+q.owner.join('／')+'</span>');
  if(q.type) m.push('<span>'+q.type+'</span>');
  if(o.showCp&&q.counterparty) m.push('<span>對方：'+q.counterparty+'</span>');
  var foot='';
  if(q.status!=='done'&&q.nextStep) foot='<div class="next"><b>下一步</b>　'+q.nextStep+'</div>';
  else if(q.status==='done'&&q.retro) foot='<div class="next">'+q.retro.outcome+'</div>';
  return '<article class="card'+(o.urgent?' urgent':'')+'" data-q="'+q.id+'">'+
    '<div class="ct">'+q.title+'</div><div class="meta">'+m.join('')+'</div>'+foot+'</article>';
}

/* ── 現在要做 ── */
function renderNow(){
  var el=$('#now');
  var mine=Q.filter(function(q){return q.status==='us';}).sort(function(a,b){return dnum(a.deadline)-dnum(b.deadline);});
  var wait=Q.filter(function(q){return q.status==='them';}).sort(function(a,b){return (a.counterparty||'').localeCompare(b.counterparty||'');});
  var due=Q.filter(function(q){return q.deadline&&q.status!=='done';}).sort(function(a,b){return dnum(a.deadline)-dnum(b.deadline);});
  var h='';
  if(due.length){ var u=due[0];
    h+='<div class="alert" data-q="'+u.id+'">最急：'+u.title+'<span>期限 '+u.deadline+'　'+(u.nextStep||'')+'</span></div>'; }

  h+=H('01','今天與近期要處理')+
     '<p class="sub">'+mine.length+' 件球在我方，依期限排。</p>'+
     '<div class="grid">'+mine.slice(0,9).map(function(q,i){return cardHTML(q,{urgent:i===0&&!!q.deadline});}).join('')+'</div>';
  if(mine.length>9) h+='<p class="sub" style="margin-top:var(--s3)">另有 '+(mine.length-9)+' 件，見<a href="#track">問題追蹤</a>。</p>';

  h+='<div class="twocol">'+
     '<section>'+H('02','等待對方回覆')+'<p class="sub">'+wait.length+' 件，球不在我方。</p>'+
       '<div class="tw"><table><thead><tr><th>對方</th><th>等待</th><th>最後更新</th></tr></thead><tbody>'+
       wait.map(function(q){return '<tr data-q="'+q.id+'"><td class="n">'+(q.counterparty||'—')+'</td><td>'+q.title+'</td><td class="n">'+(lastD(q)||'—')+'</td></tr>';}).join('')+
       '</tbody></table></div></section>'+
     '<section>'+H('03','近期行程')+'<p class="sub">點日期到全團行程。</p>'+
       '<div class="tw"><table><thead><tr><th>日期</th><th>場次／行程</th><th>人</th><th>問題</th></tr></thead><tbody>'+
       D.days.map(function(d){
         return '<tr data-day="'+d.date+'"><td class="n">'+d.date+'</td><td>'+(d.items.join('<br>')||'—')+
           '</td><td class="n">'+(d.must.length?d.must.length+' 必出席':'—')+
           '</td><td class="n">'+(d.qids.length?d.qids.length:'—')+'</td></tr>';}).join('')+
       '</tbody></table></div></section></div>';
  el.innerHTML=h;
}

/* ── 全團行程 ── */
function renderSched(){
  var el=$('#sched');
  var tl=D.days.map(function(d){
    var empty=!d.items.length&&!(d.moves&&d.moves.length)&&!d.notes.length&&!d.qids.length;
    if(empty) return '';
    var s='<div class="tlday'+(d.key?' key':'')+'" id="day-'+encodeURIComponent(d.date)+'">'+
      '<div class="d">'+d.date+'</div>'+
      (d.items.length?'<div class="ttl">'+d.items.join('　·　')+'</div>':'');
    if(d.venue) s+=venueLink(d.venue,d.map);
    var rows='';
    if(d.vl) rows+='<dt>場館窗口</dt><dd>'+d.vl+'</dd>';
    if(d.call) rows+='<dt>集合</dt><dd>'+d.call+'</dd>';
    if(d.must.length) rows+='<dt>必出席</dt><dd>'+d.must.join('、')+'</dd>';
    if(d.notes.length) rows+='<dt>異動</dt><dd>'+d.notes.join('<br>')+'</dd>';
    if(rows) s+='<dl class="dmeta">'+rows+'</dl>';
    if(d.moves&&d.moves.length){
      s+='<div class="msec"><div class="mlab">人員動向</div><ul class="moves">'+
        d.moves.map(function(m){return moveRow(m,false);}).join('')+'</ul></div>';
    }
    if(d.qids.length) s+='<div class="qsec"><div class="qlab">相關問題<span>點擊標籤了解更多</span></div>'+
      '<div class="rel">'+d.qids.map(function(id){
        var q=byId[id]; return '<a href="#" data-q="'+id+'">'+q.title+' '+pill(q.status,LBL[q.status])+'</a>';}).join('')+'</div></div>';
    return s+'</div>';
  }).join('');
  el.innerHTML='<div class="schedsplit">'+
      '<section>'+H('01','日期時間軸','  first')+'<div class="tl">'+tl+'</div></section>'+
      '<section class="people">'+H('02','人員','  first')+'<div class="grid" style="grid-template-columns:1fr">'+
        D.people.map(function(p,i){
          return '<article class="card" data-p="'+i+'"><div class="ct">'+p.name+' '+pill('g',p.role)+'</div>'+
            '<div class="meta">'+(p.itin.length?pill('g',p.itin.length+' 天有行程'):'')+
            (p.qids.length?pill('g','關聯 '+p.qids.length+' 件'):'')+'</div>'+
            '<div class="next">'+((p.other[0]||p.status[0]||'—').slice(0,68))+'</div></article>';}).join('')+
      '</div></section></div>';
}

/* ── 人員詳情 ── */
function personHTML(i){
  var p=D.people[i]; if(!p) return '';
  function blk(t,inner){ return inner?'<div class="blk"><h4>'+t+'</h4>'+inner+'</div>':''; }
  var itin=p.itin.map(function(x){
    return '<tr><td class="n">'+x.d+'</td><td>'+(x.must?'<b>'+x.ev+'</b>':x.ev)+
      (x.note?'<div class="sub" style="margin:2px 0 0">'+x.note+'</div>':'')+'</td></tr>';}).join('');
  var must=p.itin.filter(function(x){return x.must;}).map(function(x){return x.d+' '+x.ev;});
  var qs=p.qids.map(function(id){var q=byId[id];
    return '<a href="#" data-q="'+id+'">'+q.title+' '+pill(q.status,LBL[q.status])+'</a>';}).join('');
  function lines(a){return a.length?a.map(function(x){return '<p>'+x+'</p>';}).join(''):'';}
  var mv=(p.moves&&p.moves.length)
    ? '<ul class="moves">'+p.moves.map(function(m){return moveRow(m,true);}).join('')+'</ul>'
    : '<p class="sub" style="margin:0">信件與需求單裡沒有這個人的抵離與住宿紀錄。</p>';
  return backBtn('sched')+
    '<div class="detail"><h3>'+p.name+' '+pill('g',p.role)+'</h3>'+
    blk('抵離與住宿', mv)+
    blk('已確認行程', itin?'<div class="tw"><table><tbody>'+itin+'</tbody></table></div>':'')+
    blk('需出席場次', must.length?'<p>'+must.join('<br>')+'</p>':'')+
    blk('班機', lines(p.flights))+blk('住宿', lines(p.hotel))+blk('其他權益與現況', lines(p.other))+
    blk('相關問題卡（處理過程在問題卡裡）', qs?'<div class="rel">'+qs+'</div>':'')+'</div>';
}

/* ── 問題卡詳情 ── */
function detailHTML(q){
  var kv='<dl class="kv"><dt>狀態</dt><dd>'+pill(q.status,LBL[q.status])+(q.chip?' '+pill('g',q.chip):'')+'</dd>';
  if(q.status!=='done'&&q.nextStep) kv+='<dt>下一步</dt><dd><b>'+q.nextStep+'</b></dd>';
  if(q.deadline) kv+='<dt>期限</dt><dd>'+q.deadline+(q.deadlineNote?'<div class="sub" style="margin:2px 0 0">'+q.deadlineNote+'</div>':'')+'</dd>';
  if(q.owner&&q.owner.length) kv+='<dt>負責</dt><dd>'+q.owner.join('／')+'</dd>';
  if(q.counterparty) kv+='<dt>對方</dt><dd>'+q.counterparty+'</dd>';
  if(q.type) kv+='<dt>類型</dt><dd>'+q.type+'</dd>';
  kv+='</dl>';
  var chat=q.thread.map(function(t){
    return '<div class="msg '+t.side+(t.flag?' '+t.flag:'')+'"><span class="nm">'+t.who+'</span>'+
      '<div class="bb">'+t.text+srcLinks(t.refs)+'</div><span class="tm">'+t.d+'</span></div>';}).join('');
  var retro=q.retro?'<div class="blk"><h4>結案判斷</h4><div class="retro"><dl>'+
      '<dt>最終安排</dt><dd>'+q.retro.outcome+'</dd><dt>採用原因</dt><dd>'+q.retro.why+'</dd>'+
      '<dt>造成的影響</dt><dd>'+q.retro.impact+'</dd><dt>仍可優化</dt><dd>'+q.retro.improve+'</dd>'+
      '</dl></div></div>':'';
  var VL={'#track':'問題追蹤','#now':'現在要做','#sched':'全團行程','#book':'影展手冊'};
  var rel=[];
  (q.relEvents||[]).forEach(function(d){rel.push('<a href="#" data-day="'+d+'">'+d+'</a>');});
  (q.relPeople||[]).forEach(function(p){rel.push('<a href="#sched">'+p+'</a>');});
  (q.srcs||[]).forEach(function(s){
    rel.push('<a href="'+s+'">'+(/email-e(\d+)/.test(s)?'✉'+/email-e(\d+)/.exec(s)[1]:(VL[s]||'官方文件'))+'</a>');});
  return backBtn('track')+
    '<div class="detail"><h3>'+q.title+'</h3><p class="sub">'+q.fact+'</p>'+kv+
    '<div class="blk"><h4>處理紀錄</h4><div class="chat">'+chat+'</div>'+
    '<p class="sub" style="margin:var(--s3) 0 0">'+q.concl+'</p></div>'+retro+
    (rel.length?'<div class="blk"><h4>相關資料</h4><div class="rel">'+rel.join('')+'</div></div>':'')+'</div>';
}

/* ── 問題追蹤 ── */
var T={mode:'exec',f:'us',role:'',type:''};
function retroStats(done){
  if(!done.length) return '';
  function span(q){ if(!q.thread.length) return null;
    var a=dnum(q.thread[0].d), b=dnum(q.thread[q.thread.length-1].d);
    if(a>9000||b>9000) return null;
    return Math.round(((b/100|0)-(a/100|0))*30.4+((b%100)-(a%100))); }
  var sp=done.map(span).filter(function(x){return x!=null;}).sort(function(a,b){return a-b;});
  var med=sp.length?sp[Math.floor(sp.length/2)]:0, longest=null, lmax=-1;
  done.forEach(function(q){var d=span(q); if(d!=null&&d>lmax){lmax=d;longest=q;}});
  var un={},dec={};
  done.forEach(function(q){q.thread.forEach(function(t){
    if(t.flag==='key'){var k={us:'我方',tiff:'大會',p3:'第三方'}[t.side]||'—'; un[k]=(un[k]||0)+1;}
    if(t.flag==='dec') dec[t.who]=(dec[t.who]||0)+1;});});
  var u=Object.keys(un).map(function(k){return k+' '+un[k];}).join('　');
  var dd=Object.keys(dec).sort(function(a,b){return dec[b]-dec[a];}).slice(0,4).map(function(k){return k+' '+dec[k];}).join('　');
  return '<div class="facts">'+
    '<div><div class="k">已結案</div><div class="v">'+done.length+' 件</div></div>'+
    '<div><div class="k">處理天數中位數</div><div class="v">'+med+' 天</div></div>'+
    (longest?'<div><div class="k">走最久</div><div class="v">'+lmax+' 天</div><div class="k">'+longest.title+'</div></div>':'')+
    (u?'<div><div class="k">解鎖來自</div><div class="v">'+u+'</div></div>':'')+
    (dd?'<div><div class="k">拍板次數</div><div class="v">'+dd+'</div></div>':'')+'</div>';
}
function renderTrack(){
  var el=$('#track'), exec=T.mode==='exec';
  var base=Q.filter(function(q){return exec?q.status!=='done':q.status==='done';});
  var roles=[],types=[];
  Q.forEach(function(q){(q.owner||[]).forEach(function(r){if(roles.indexOf(r)<0)roles.push(r);});
                        if(q.type&&types.indexOf(q.type)<0)types.push(q.type);});
  var side='<div class="modes"><button data-mode="exec"'+(exec?' class="on"':'')+'>執行模式</button>'+
           '<button data-mode="review"'+(!exec?' class="on"':'')+'>回顧模式</button></div>';
  var opts=exec?[['us','待我方'],['them','等待對方'],['due','本週到期'],['all','全部進行中']]
               :[['date','依日期'],['role','依角色'],['cp','依對方單位'],['type','依議題']];
  side+='<div class="filters"><span class="lbl">'+(exec?'狀態':'排序')+'</span>'+
        opts.map(function(o){return '<button data-f="'+o[0]+'"'+(T.f===o[0]?' class="on"':'')+'>'+o[1]+'</button>';}).join('')+'</div>';
  side+='<div class="filters"><span class="lbl">角色</span><button data-role=""'+(!T.role?' class="on"':'')+'>全部</button>'+
        roles.map(function(r){return '<button data-role="'+r+'"'+(T.role===r?' class="on"':'')+'>'+r+'</button>';}).join('')+'</div>';
  side+='<div class="filters"><span class="lbl">類型</span><button data-type=""'+(!T.type?' class="on"':'')+'>全部</button>'+
        types.map(function(t){return '<button data-type="'+t+'"'+(T.type===t?' class="on"':'')+'>'+t+'</button>';}).join('')+'</div>';

  var list=base.slice();
  if(exec){ if(T.f==='us') list=list.filter(function(q){return q.status==='us';});
            else if(T.f==='them') list=list.filter(function(q){return q.status==='them';});
            else if(T.f==='due') list=list.filter(function(q){return q.deadline;}); }
  if(T.role) list=list.filter(function(q){return (q.owner||[]).indexOf(T.role)>=0;});
  if(T.type) list=list.filter(function(q){return q.type===T.type;});
  var keyf=null;
  if(exec) list.sort(function(a,b){return dnum(a.deadline)-dnum(b.deadline);});
  else if(T.f==='date') list.sort(function(a,b){return dnum(lastD(a))-dnum(lastD(b));});
  else if(T.f==='role'){ keyf=function(q){return (q.owner&&q.owner[0])||'未分類';};
                         list.sort(function(a,b){return keyf(a).localeCompare(keyf(b));}); }
  else if(T.f==='cp'){ keyf=function(q){return q.counterparty||'未分類';};
                       list.sort(function(a,b){return keyf(a).localeCompare(keyf(b));}); }
  else if(T.f==='type'){ keyf=function(q){return q.type||'未分類';};
                         list.sort(function(a,b){return keyf(a).localeCompare(keyf(b));}); }

  var body='<p class="sub">'+(exec?'只看還沒完成的，依球在誰手上分。每個問題只有這裡有完整內容。':
      '已結案的問題，連同完整對話與結案判斷。')+'</p>';
  if(!exec) body+=retroStats(base);
  body+='<p class="sub">'+list.length+' 件</p>';
  if(!list.length) body+='<div class="empty">這個條件下沒有問題。</div>';
  else if(!keyf) body+='<div class="grid">'+list.map(function(q){return cardHTML(q,{showCp:true});}).join('')+'</div>';
  else{
    var g=[],ix={};
    list.forEach(function(q){var k=keyf(q); if(!(k in ix)){ix[k]=g.length;g.push([k,[]]);} g[ix[k]][1].push(q);});
    g.forEach(function(x){ body+='<h2 class="h">'+x[0]+'<span class="n">'+x[1].length+' 件</span></h2>'+
      '<div class="grid">'+x[1].map(function(q){return cardHTML(q,{showCp:true});}).join('')+'</div>'; });
  }
  el.innerHTML='<div class="trackwrap"><aside class="side">'+side+'</aside><div>'+body+'</div></div>';
}

/* ── 路由：記住每個畫面的捲動位置與來源 ── */
var lastHash=null, prevHash=null, mem={};
var VNAME={now:'現在要做',sched:'全團行程',track:'問題追蹤',book:'影展手冊',docs:'原始文件'};
function backBtn(fallback){
  var dest=(prevHash && !/^[qp]-/.test(prevHash) && VNAME[prevHash]) ? prevHash : fallback;
  return '<button class="back" data-back="'+dest+'">← 回'+(VNAME[dest]||'問題追蹤')+'</button>';
}
function show(v){
  VIEWS.forEach(function(x){$('#'+x).classList.toggle('on',x===v);});
  $$('.tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.v===v);});
  if(v==='now') renderNow();
  if(v==='sched') renderSched();
  if(v==='track') renderTrack();
}
function toDay(date){
  show('sched');
  var el=document.getElementById('day-'+encodeURIComponent(date));
  if(el) setTimeout(function(){el.scrollIntoView({block:'center'});},30);
}
function route(){
  if(lastHash!=null) mem[lastHash]=window.pageYOffset||0;
  var hash=(location.hash||'#now').slice(1);
  if(hash!==lastHash) prevHash=lastHash;
  var restore=(/^[qp]-/.test(hash)||hash.indexOf('doc-')===0)?0:(mem[hash]||0);
  lastHash=hash;
  setTimeout(function(){ if(!/^doc-/.test(hash)) window.scrollTo(0,restore); },0);
  if(hash.indexOf('doc-')===0){ show('docs');
    var t=document.getElementById(hash);
    if(t){var d=t.closest('details'); if(d)d.open=true; setTimeout(function(){t.scrollIntoView({block:'center'});},30);} return; }
  if(hash.indexOf('q-')===0){ var q=byId[hash.slice(2)]; if(q){ show('track');
    $('#track').innerHTML=detailHTML(q);} return; }
  if(hash.indexOf('p-')===0){ show('sched'); $('#sched').innerHTML=personHTML(+hash.slice(2)); return; }
  if(VIEWS.indexOf(hash)>=0){ show(hash); return; }
  show('now');
}
window.addEventListener('hashchange',route);

document.addEventListener('click',function(e){
  var t=e.target;
  var tab=t.closest('.tabs button'); if(tab){ location.hash=tab.dataset.v; return; }
  var back=t.closest('[data-back]');
  if(back){ var dst=back.dataset.back;
            if((location.hash||'').slice(1)===dst) route(); else location.hash=dst;
            return; }
  var md=t.closest('[data-mode]');
  if(md){ T.mode=md.dataset.mode; T.f=(T.mode==='exec')?'us':'date'; T.role=''; T.type=''; renderTrack(); return; }
  var f=t.closest('[data-f]'); if(f){ T.f=f.dataset.f; renderTrack(); return; }
  var r=t.closest('[data-role]'); if(r){ T.role=r.dataset.role; renderTrack(); return; }
  var ty=t.closest('[data-type]'); if(ty){ T.type=ty.dataset.type; renderTrack(); return; }
  var dy=t.closest('[data-day]'); if(dy){ e.preventDefault(); location.hash='sched'; toDay(dy.dataset.day); return; }
  var pe=t.closest('[data-p]'); if(pe){ e.preventDefault(); location.hash='p-'+pe.dataset.p; return; }
  var qe=t.closest('[data-q]'); if(qe&&!t.closest('.src')){ e.preventDefault(); location.hash='q-'+qe.dataset.q; return; }
});

$('#q').addEventListener('input',function(){
  var v=this.value.trim();
  if(!v){ route(); return; }
  var hits=Q.filter(function(q){
    return (q.title+q.fact+q.concl+(q.counterparty||'')+(q.owner||[]).join('')+(q.type||'')+
      q.thread.map(function(t){return t.who+t.text;}).join('')).indexOf(v)>=0;});
  show('track');
  $('#track').innerHTML='<p class="sub">搜尋「'+v+'」：'+hits.length+' 件</p>'+
    (hits.length?'<div class="grid">'+hits.map(function(q){return cardHTML(q,{showCp:true});}).join('')+'</div>'
                :'<div class="empty">沒有符合的問題。原始文件全文請到<a href="#docs">原始文件</a>用瀏覽器搜尋。</div>');
});

function syncStick(){
  var h=$('.appbar'); if(!h) return;
  document.documentElement.style.setProperty('--stick', (Math.round(h.getBoundingClientRect().height)+12)+'px');
}
syncStick();
window.addEventListener('resize',syncStick);
if(window.ResizeObserver){ new ResizeObserver(syncStick).observe($('.appbar')); }
route();
})();
