// Uji book170 -- Alkitab FULL SCREEN di HP (Bebas+Sync 2/3 kolom penuh dari atas ke bawah, 1 garis pemisah tipis, kepala/Sync tersembunyi).
// Jalankan:  NODE_PATH=$(npm root -g) node tests/baca-penuh-fullscreen.browser.test.js
const fs=require("fs"),path=require("path");
const { chromium } = require("playwright");
const root=require("path").join(__dirname,".."), TMP=require("os").tmpdir();
const src=fs.readFileSync(root+"/js/app.js","utf8");
const a=src.indexOf("function isReaderClean()"), a2=src.indexOf("\n",a);
const isClean=src.slice(a,a2+1);
const b=src.indexOf("function recalcReaderPanesHeight() {"), b2=src.indexOf("\n}\n",b)+3;
const recalc=src.slice(b,b2);
function verses(n,len){let o="";for(let i=1;i<=n;i++)o+=`<div class="verse-block"><button class="verse-num verse-num-btn">${i}</button><div class="verse-text-wrap">${"Lalu sahut perempuan itu kepada ular itu ".repeat(len)}</div></div>`;return o;}
function panes(n){let o="";const names=["Indonesia (Recovery)","Notes","English"];for(let c=0;c<n;c++)o+=`<div class="reader-col-pane"><div class="reader-col-pane-head"><span class="reader-col-pane-title">${names[c]}</span><label class="reader-col-sync-toggle"><span><span class="rcs-ico">🔗</span><span class="rcs-word"> Sync</span></span><span class="toggle-switch reader-col-sync-switch"><input type="checkbox" checked><span class="toggle-slider"></span></span></label><button class="reader-col-pane-expand-btn">⤢</button></div><div class="reader-col-pane-body">${verses(20,2)}</div></div>`;return o;}
function grid(n){let o="";const names=["Indonesia","Notes","English"];for(let c=0;c<n;c++)o+=`<div class="reader-column-head grid-head">${names[c]}</div>`;for(let v=1;v<=8;v++)for(let c=0;c<n;c++)o+=`<div class="reader-grid-cell"><div class="verse-block"><button class="verse-num">${v}</button><div class="verse-text-wrap">${"Lalu sahut perempuan ".repeat(2+c)}</div></div></div>`;return o;}
function page(mode,n){return `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href="file://${root}/css/style.css"></head><body class="reader-clean">
<header class="app-header"><button class="icon-btn">☰</button><b>Alkitab</b></header>
<div class="content-wrap"><div class="content-inner"><article id="reader" class="reader">
<div class="reader-nav"><button class="chip-btn">← Sebelumnya</button><h2>Kejadian 3</h2><button class="chip-btn">Berikutnya →</button></div>
<div class="reader-media-slot"><button class="round-media-btn">🎵</button></div>
<div id="readerVerses" class="reader-verses reader-columns ${mode==="panes"?"reader-columns-panes":"reader-columns-grid"}" data-cols="${n}">${mode==="panes"?panes(n):grid(n)}</div>
<div id="readerNavBottomWrap" class="collapsible-toolbar collapsed"><div class="collapsible-toolbar-body"></div><button class="collapsible-toolbar-toggle"><span class="collapsible-toolbar-toggle-arrow">^</span></button></div>
</article></div></div>
<script>${isClean}${recalc}
window.go=()=>{document.documentElement.style.setProperty("--header-h","0px");const h=document.querySelector(".app-header").offsetHeight;document.documentElement.style.setProperty("--hdr-px",h+"px");recalcReaderPanesHeight();};
window.chrome=(on)=>{document.body.classList.toggle("reader-chrome-show",on);recalcReaderPanesHeight();};
</script></body></html>`;}
(async()=>{
  const br=await chromium.launch();
  const ctx=await br.newContext({viewport:{width:390,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const pg=await ctx.newPage();
  let ok=true; const expect=(n,c,x)=>{console.log((c?"PASS":"FAIL")+" - "+n+(c?"":" :: "+JSON.stringify(x)));if(!c)ok=false;};
  for(const [mode,n] of [["panes",2],["panes",3],["grid",2]]){
    const f=`${TMP}/h-${mode}${n}.html`; fs.writeFileSync(f,page(mode,n));
    await pg.goto("file://"+f); await pg.evaluate(()=>go()); await pg.waitForTimeout(150);
    await pg.screenshot({path:`${TMP}/${mode}${n}-clean.png`});
    if(mode==="panes"){
      const m=await pg.evaluate(()=>{const w=document.getElementById("readerVerses").getBoundingClientRect();const ps=[...document.querySelectorAll(".reader-col-pane")].map(p=>p.getBoundingClientRect());const head=getComputedStyle(document.querySelector(".reader-col-pane-head")).display;const bl=getComputedStyle(document.querySelectorAll(".reader-col-pane")[1]).borderLeftWidth;const gap=getComputedStyle(document.getElementById("readerVerses")).columnGap;return{top:w.top,bottom:w.bottom,h:innerHeight,ps:ps.map(r=>[r.left,r.right]),head,bl,gap};});
      expect(`${n} kolom: kotak mulai di tepi ATAS layar`, m.top===0, m);
      expect(`${n} kolom: kotak sampai tepi BAWAH layar`, Math.abs(m.bottom-m.h)<=1, m);
      expect(`${n} kolom: kepala (Sync) tersembunyi`, m.head==="none", m);
      expect(`${n} kolom: tidak ada jarak antar kolom`, m.ps.slice(1).every((r,i)=>Math.abs(r[0]-m.ps[i][1])<0.01), m);
      expect(`${n} kolom: garis pemisah <=1px`, parseFloat(m.bl)<=1 && parseFloat(m.bl)>0, m);
      await pg.evaluate(()=>chrome(true)); await pg.waitForTimeout(150);
      await pg.screenshot({path:`${TMP}/${mode}${n}-chrome.png`});
      const m2=await pg.evaluate(()=>({head:getComputedStyle(document.querySelector(".reader-col-pane-head")).display,word:getComputedStyle(document.querySelector(".rcs-word")).display,top:document.getElementById("readerVerses").getBoundingClientRect().top,hdr:document.querySelector(".app-header").offsetHeight}));
      expect(`${n} kolom: tombol dimunculkan -> kepala muncul, kata Sync tetap tersembunyi`, m2.head!=="none"&&m2.word==="none", m2);
      expect(`${n} kolom: tombol dimunculkan -> kotak turun di bawah header`, m2.top===m2.hdr, m2);
    }
  }
  // komputer: tidak berubah
  const ctx2=await br.newContext({viewport:{width:1280,height:800}}); const p2=await ctx2.newPage();
  await p2.goto("file://"+TMP+"/h-panes2.html"); await p2.evaluate(()=>{document.body.classList.remove("reader-clean");go();});
  const d=await p2.evaluate(()=>({pos:getComputedStyle(document.getElementById("readerVerses")).position,head:getComputedStyle(document.querySelector(".reader-col-pane-head")).display,word:getComputedStyle(document.querySelector(".rcs-word")).display,gap:getComputedStyle(document.getElementById("readerVerses")).columnGap}));
  expect("komputer: kotak TIDAK fixed, kepala & kata Sync tetap, gap 10px", d.pos!=="fixed"&&d.head==="flex"&&d.word!=="none"&&d.gap==="10px", d);
  await br.close(); console.log(ok?"ALL PASS":"SOME FAIL");
})();
