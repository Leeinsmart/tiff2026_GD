// 最小 DOM 模擬：只為了跑到渲染程式碼，抓資料型別與空值錯誤
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const data=JSON.parse(html.match(/window\.DATA=(\{.*?\});<\/script>/s)[1]);
const js=html.match(/<script>((?:(?!<\/script>)[\s\S])*)<\/script>\s*<\/body>/)[1];

function El(id){ this.id=id; this.dataset={}; this._html=''; this.children=[];
  this.classList={list:new Set(),toggle:(c,on)=>{on?this.classList.list.add(c):this.classList.list.delete(c);},
                  add:c=>this.classList.list.add(c),contains:c=>this.classList.list.has(c)};
}
Object.defineProperty(El.prototype,'innerHTML',{get(){return this._html;},set(v){this._html=v;}});
El.prototype.closest=function(){return null;};
El.prototype.addEventListener=function(){};
El.prototype.scrollIntoView=function(){};
El.prototype.getBoundingClientRect=function(){return {height:99,width:390,top:0,bottom:0,left:0,right:0};};
El.prototype.querySelector=function(){return null;};
El.prototype.querySelectorAll=function(){return [];};

const els={};
['now','sched','track','book','docs','q'].forEach(k=>els[k]=new El(k));
const rendered={};
['now','sched','track'].forEach(k=>{
  Object.defineProperty(els[k],'innerHTML',{get(){return this._html||'';},set(v){this._html=v;rendered[k]=v;}});
});

global.window={DATA:data,addEventListener(){},scrollTo(){}};
global.location={hash:'#now'};
global.document={
  querySelector(s){ const m=/^#(\w+)$/.exec(s); if(m&&els[m[1]])return els[m[1]];
    if(s==='.tabs button'||s==='#track')return els.track; return new El('x'); },
  querySelectorAll(s){ if(s==='.tabs button')return [];
    return []; },
  getElementById(id){ return els[id]||null; },
  addEventListener(){},
  documentElement:{style:{setProperty(){}}},
};
global.setTimeout=(f)=>f;
global.ResizeObserver=function(f){this.observe=function(){}};
global.matchMedia=(q)=>({matches:/min-width:900px/.test(q),addEventListener(){},addListener(){}});
global.window.matchMedia=global.matchMedia;
global.encodeURIComponent=encodeURIComponent;

let ok=true;
for(const h of ['#now','#sched','#track','#q-q07']){
  global.location.hash=h;
  ['now','sched','track'].forEach(k=>{els[k].dataset={};});
  try{ eval(js); console.log('✅',h,'渲染無錯誤'); }
  catch(e){ ok=false; console.log('❌',h,'錯誤：',e.message,'|',(e.stack||'').split('\n')[1]); }
}
if(ok){
  console.log('✅ 初始渲染（現在要做）無錯誤');
  console.log('   卡片數：',(rendered.now.match(/class="card/g)||[]).length);
  console.log('   表格列：',(rendered.now.match(/<tr data-/g)||[]).length);
  console.log('   緊急條：',/class="alert"/.test(rendered.now)?'有':'無');
}
