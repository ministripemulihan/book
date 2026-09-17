// ============================================================
// 🌱 BookScene -- pemandangan animasi "7 Hari Penciptaan" (SVG murni,
// 100% OFFLINE, tanpa gambar/aset luar sama sekali).
//
// SATU file ini dipakai di TIGA tempat sekaligus, supaya gambarnya
// tidak perlu ditulis ulang 3x:
//   1. Layar Masuk (index.html #loginBookScene) -- jadi latar animasi
//      di belakang kartu login. Dipasang OTOMATIS di bawah file ini.
//   2. Layar 2 / present.html (#penciptaanView) -- game "🌱 Penciptaan".
//   3. (cadangan) kotak pratinjau mana pun -- tinggal panggil mount().
//
// CARA PAKAI:
//   var sc = BookScene.mount(divKosong, { hari:1, ikutiJam:false });
//   sc.setHari(4);            // ganti hari 1..7
//   sc.setJam(19.5);          // pratinjau jam tertentu (hari 7)
//   sc.ikutiJamPerangkat();   // kembali ke jam asli perangkat
//   sc.destroy();             // lepas semua timer & hapus dari DOM
//
// CATATAN ID: semua id di dalam SVG diberi awalan unik per instance
// (mis. "book1_L7") saat dipasang -- jadi AMAN kalau suatu saat ada
// dua scene di satu halaman, dan tidak mungkin bentrok dengan id milik
// index.html/present.html yang sudah ada.
//
// CATATAN CSS: semua kelas diberi awalan "bk-" dan seluruh animasinya
// ada di css/book-scene.css (ikut dimuat di index.html & present.html).
// ============================================================
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var seq = 0;

  var SVG_TPL = String.raw`<svg class="bk-sky" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="{{UID}}_langit" x1="0" y1="0" x2="0" y2="1">
        <stop id="{{UID}}_s0" offset="0%" stop-color="#04070F"/>
        <stop id="{{UID}}_s1" offset="46%" stop-color="#071426"/>
        <stop id="{{UID}}_s2" offset="78%" stop-color="#0C2136"/>
        <stop id="{{UID}}_s3" offset="100%" stop-color="#13314A"/>
      </linearGradient>
      <radialGradient id="{{UID}}_cahaya" cx="50%" cy="50%" r="50%">
        <stop id="{{UID}}_g0" offset="0%" stop-color="#FFE3A8" stop-opacity=".95"/>
        <stop id="{{UID}}_g1" offset="45%" stop-color="#F0B863" stop-opacity=".36"/>
        <stop id="{{UID}}_g2" offset="100%" stop-color="#F0B863" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="{{UID}}_terang" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
        <stop offset="22%" stop-color="#FFFFFF" stop-opacity=".62"/>
        <stop offset="55%" stop-color="#EAF3FF" stop-opacity=".18"/>
        <stop offset="100%" stop-color="#EAF3FF" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="{{UID}}_cahayaBulan" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#CFE2F5" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#CFE2F5" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="{{UID}}_laut" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3FA7C8"/>
        <stop offset="55%" stop-color="#1F6FA8"/>
        <stop offset="100%" stop-color="#114A7C"/>
      </linearGradient>
      <linearGradient id="{{UID}}_darat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#77B56A"/>
        <stop offset="100%" stop-color="#3C7A4E"/>
      </linearGradient>
      <linearGradient id="{{UID}}_kabut" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#DCE7E0" stop-opacity="0"/>
        <stop offset="55%" stop-color="#DCE7E0" stop-opacity=".85"/>
        <stop offset="100%" stop-color="#DCE7E0" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="{{UID}}_depan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#14402F"/><stop offset="100%" stop-color="#0A2A1F"/>
      </linearGradient>
      <clipPath id="{{UID}}_atasHorizon"><rect x="0" y="0" width="1200" height="470"/></clipPath>
      <clipPath id="{{UID}}_dalamLaut"><rect x="0" y="380" width="1200" height="520"/></clipPath>
    </defs>

    <rect width="1200" height="900" fill="url(#{{UID}}_langit)"/>

    <!-- HARI 1: terang -->
    <g id="{{UID}}_L1" class="bk-lay">
      <g class="bk-rays" opacity=".5">
        <g id="{{UID}}_rayset" fill="#FFFFFF" opacity=".22"></g>
      </g>
      <circle class="bk-pulse" cx="600" cy="420" r="330" fill="url(#{{UID}}_terang)"/>
      <circle cx="600" cy="420" r="66" fill="#FFFFFF"/>
    </g>

    <!-- HARI 4: benda penerang -->
    <g id="{{UID}}_L4" class="bk-lay">
      <g id="{{UID}}_bintang4" fill="#F4F8FF"></g>
      <g transform="translate(940,180)">
        <circle class="bk-glow" r="190" fill="url(#{{UID}}_cahaya)"/>
        <circle r="62" fill="#FFD87E"/>
      </g>
      <g transform="translate(230,170)">
        <circle r="120" fill="url(#{{UID}}_cahayaBulan)"/>
        <circle r="40" fill="#E8EFF7"/>
        <circle cx="-13" cy="-9" r="7" fill="#D2DCE8" opacity=".7"/>
        <circle cx="11" cy="12" r="10" fill="#D2DCE8" opacity=".55"/>
        <circle cx="17" cy="-16" r="5" fill="#D2DCE8" opacity=".5"/>
      </g>
    </g>

    <!-- matahari siang untuk hari 5 & 6 -->
    <g id="{{UID}}_Lsun" class="bk-lay" transform="translate(960,170)">
      <circle class="bk-glow" r="180" fill="url(#{{UID}}_cahaya)"/>
      <circle r="58" fill="#FFE08A"/>
    </g>

    <!-- HARI 2: cakrawala, awan, air -->
    <g id="{{UID}}_L2" class="bk-lay">
      <g class="bk-clouds--slow bk-clouds" opacity=".55" fill="#FFFFFF">
        <g id="{{UID}}_awanA">
          <ellipse cx="180" cy="150" rx="120" ry="34"/><ellipse cx="268" cy="136" rx="76" ry="26"/>
          <ellipse cx="640" cy="206" rx="150" ry="30"/><ellipse cx="740" cy="192" rx="88" ry="24"/>
          <ellipse cx="1000" cy="120" rx="104" ry="26"/>
        </g>
        <use href="#{{UID}}_awanA" x="1200"/><use href="#{{UID}}_awanA" x="2400"/>
      </g>
      <g class="bk-clouds" opacity=".38" fill="#FFFFFF">
        <g id="{{UID}}_awanB">
          <ellipse cx="420" cy="292" rx="170" ry="22"/><ellipse cx="880" cy="320" rx="130" ry="18"/>
          <ellipse cx="60" cy="330" rx="100" ry="16"/>
        </g>
        <use href="#{{UID}}_awanB" x="1200"/><use href="#{{UID}}_awanB" x="2400"/>
      </g>
      <rect x="0" y="380" width="1200" height="520" fill="url(#{{UID}}_laut)"/>
      <g clip-path="url(#{{UID}}_dalamLaut)" id="{{UID}}_ombak" fill="none" stroke="#BFE6F2" stroke-width="3" opacity=".55"></g>
    </g>

    <!-- HARI 5: ikan (di dalam air, digambar sebelum darat) -->
    <g id="{{UID}}_L5fish" class="bk-lay" clip-path="url(#{{UID}}_dalamLaut)"><g id="{{UID}}_ikan"></g></g>

    <!-- HARI 3: darat & tumbuhan -->
    <g id="{{UID}}_L3" class="bk-lay">
      <path d="M-20 900 L-20 618 C 200 586, 420 608, 640 576 S 1000 540, 1220 536 L1220 900 Z" fill="url(#{{UID}}_darat)"/>
      <path d="M-20 640 C 220 608, 430 630, 650 598 S 1000 562, 1220 558 L1220 586 C 980 592, 780 626, 560 646 S 180 670, -20 662 Z"
            fill="#8CC77A" opacity=".45"/>
      <g id="{{UID}}_pohon"></g>
      <g id="{{UID}}_rumput"></g>
    </g>

    <!-- HARI 5: burung -->
    <g id="{{UID}}_L5bird" class="bk-lay"><g id="{{UID}}_burung5" fill="none" stroke-linecap="round"></g></g>
    <g id="{{UID}}_L5jump" class="bk-lay"></g>

    <!-- HARI 6: binatang darat & manusia -->
    <g id="{{UID}}_L6" class="bk-lay"><g id="{{UID}}_satwa"></g></g>

    <!-- HARI 7: sawah -->
    <g id="{{UID}}_L7" class="bk-lay">
      <g clip-path="url(#{{UID}}_atasHorizon)">
        <g id="{{UID}}_bintang" opacity="0" fill="#EAF2FF"></g>
        <g id="{{UID}}_bulanG" opacity="0" transform="translate(300,200)">
          <circle r="150" fill="url(#{{UID}}_cahayaBulan)"/><circle r="34" fill="#E8EFF7"/>
          <circle cx="-11" cy="-8" r="6" fill="#D2DCE8" opacity=".7"/>
          <circle cx="9" cy="10" r="9" fill="#D2DCE8" opacity=".55"/>
        </g>
        <g id="{{UID}}_matahariG" transform="translate(880,320)">
          <circle class="bk-glow" id="{{UID}}_sunGlow" r="240" fill="url(#{{UID}}_cahaya)"/>
          <circle id="{{UID}}_sunDisc" r="56" fill="#FFD98E"/>
        </g>
        <g class="bk-clouds--slow bk-clouds" id="{{UID}}_awan1" opacity=".3" fill="#E7EDE4">
          <use href="#{{UID}}_awanA"/><use href="#{{UID}}_awanA" x="1200"/><use href="#{{UID}}_awanA" x="2400"/>
        </g>
        <g id="{{UID}}_burung" fill="none" stroke-linecap="round"></g>
      </g>
      <path d="M0 470 L150 352 L236 402 L352 292 L470 398 L560 348 L700 470 Z" fill="#2B4650" opacity=".85"/>
      <path d="M560 470 L700 372 L790 420 L900 336 L1020 424 L1110 386 L1200 470 Z" fill="#26404A" opacity=".8"/>
      <rect class="bk-mist" x="-120" y="430" width="1440" height="72" fill="url(#{{UID}}_kabut)"/>
      <rect class="bk-mist bk-mist--b" x="-120" y="486" width="1440" height="58" fill="url(#{{UID}}_kabut)"/>
      <path d="M-20 474 C 240 456, 470 500, 720 478 S 1060 452, 1220 486 L1220 540 L-20 540 Z" fill="#6E9A6E"/>
      <path d="M-20 528 C 200 506, 520 556, 760 528 S 1080 500, 1220 538 L1220 602 L-20 602 Z" fill="#598A63"/>
      <path d="M-20 592 C 260 566, 480 620, 780 588 S 1090 560, 1220 600 L1220 676 L-20 676 Z" fill="#417458"/>
      <path d="M-20 664 C 220 634, 540 696, 820 656 S 1100 626, 1220 672 L1220 760 L-20 760 Z" fill="#2E5D4A"/>
      <path d="M-20 748 C 280 712, 560 784, 860 738 S 1110 706, 1220 756 L1220 900 L-20 900 Z" fill="url(#{{UID}}_depan)"/>
      <g id="{{UID}}_airGlow" opacity=".22" fill="#FFE3A8">
        <ellipse cx="300" cy="556" rx="120" ry="5"/><ellipse cx="820" cy="546" rx="150" ry="5"/>
        <ellipse cx="560" cy="632" rx="180" ry="6"/>
      </g>
      <g id="{{UID}}_kunang" opacity="0" fill="#DCF37E"></g>
      <g id="{{UID}}_anak"></g>
      <g id="{{UID}}_padi" stroke-linecap="round"></g>
      <rect id="{{UID}}_tintMalam" width="1200" height="900" fill="#050D1C" opacity="0"/>
      <rect id="{{UID}}_tintHangat" width="1200" height="900" fill="#FF9A4D" opacity="0" style="mix-blend-mode:overlay"/>
    </g>
  </svg>`;

  function mount(container, opts) {
    if (!container) return null;
    opts = opts || {};
    var uid = "book" + (++seq);
    var BIRDS = [];
    var timers = [];
    var manual = false;                 // true = sedang pakai jam pratinjau, bukan jam perangkat
    var jamManual = null;
    var onJam = typeof opts.onJam === "function" ? opts.onJam : function () {};

    container.classList.add("bk-scene");
    container.innerHTML = SVG_TPL.replace(/\{\{UID\}\}/g, uid);

    function $(i) { return document.getElementById(uid + "_" + i); }
    function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); return e; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function setInterval_(fn, ms) { var t = setInterval(fn, ms); timers.push(t); return t; }

    // jam yang dipakai seluruh scene: jam perangkat, KECUALI kalau
    // sedang dipratinjau lewat setJam() dari panel Studio/penggeser.
    function jamSekarang() {
      if (manual && jamManual != null) return jamManual;
      var d = new Date();
      return d.getHours() + d.getMinutes() / 60;
    }

    /* ================= HARI 1 : sinar ================= */
    (function(){
      var g=$('rayset');
      for(var i=0;i<18;i++){
        var a=i*20*Math.PI/180, len=520, w=16;
        var x1=600+Math.cos(a)*70, y1=420+Math.sin(a)*70;
        var x2=600+Math.cos(a-0.02)*len, y2=420+Math.sin(a-0.02)*len;
        var x3=600+Math.cos(a+0.05)*len, y3=420+Math.sin(a+0.05)*len;
        g.appendChild(el('path',{d:'M'+x1+' '+y1+' L'+x2+' '+y2+' L'+x3+' '+y3+' Z'}));
      }
    })();

    /* ================= HARI 2 : ombak ================= */
    (function(){
      var g=$('ombak'), ys=[416,444,474,506];
      ys.forEach(function(y,i){
        var d='M-260 '+y, x=-260;
        while(x<1500){ d+=' q 30 -'+(7+i*2)+' 60 0 t 60 0'; x+=120; }
        var p=el('path',{d:d});
        p.setAttribute('class','bk-wave'+(i%3===1?' bk-wave--b':(i%3===2?' bk-wave--c':'')));
        p.setAttribute('opacity',(0.5-i*0.07).toFixed(2));
        g.appendChild(p);
      });
    })();

    /* ================= HARI 3 : pohon & rumput ================= */
    (function(){
      var g=$('pohon');
      var spot=[[120,640],[300,622],[470,618],[700,592],[860,576],[1060,556],[1160,550]];
      spot.forEach(function(s,i){
        var sc=rnd(.8,1.25), x=s[0], y=s[1];
        var t=el('g',{transform:'translate('+x+','+y+') scale('+sc.toFixed(2)+')'});
        t.setAttribute('class','bk-hop');
        t.style.animationDelay=(-rnd(0,3)).toFixed(2)+'s';
        t.appendChild(el('rect',{x:-7,y:-56,width:14,height:58,rx:6,fill:'#8A5A36'}));
        var hijau=['#3E9B5B','#57B06A','#2F8A55'][i%3];
        t.appendChild(el('circle',{cx:0,cy:-96,r:40,fill:hijau}));
        t.appendChild(el('circle',{cx:-30,cy:-72,r:28,fill:hijau}));
        t.appendChild(el('circle',{cx:30,cy:-74,r:26,fill:hijau}));
        t.appendChild(el('circle',{cx:-10,cy:-112,r:22,fill:'#6FC47E',opacity:.7}));
        g.appendChild(t);
      });
      var r=$('rumput');
      for(var i=0;i<60;i++){
        var x=rnd(-20,1220), y=rnd(800,896);
        r.appendChild(el('path',{d:'M'+x+' '+y+' q 4 -14 9 -18',stroke:'#2F7A4A','stroke-width':3,fill:'none','stroke-linecap':'round',opacity:.7}));
      }
      var f=['#F2C94C','#EF6B8B','#B98CE0','#FFFFFF'];
      for(var j=0;j<26;j++){
        var fx=rnd(0,1200), fy=rnd(790,890);
        r.appendChild(el('circle',{cx:fx,cy:fy,r:rnd(3,5),fill:f[j%4],opacity:.85}));
      }
    })();

    /* ================= HARI 5 : ikan & burung ================= */
    (function(){
      var g=$('ikan'), warna=['#F2994A','#56CCF2','#EB5757','#F2C94C','#BB6BD9','#E8F0F2'];
      for(var i=0;i<9;i++){
        var s=rnd(.5,1.35), y=rnd(420,520);
        var maju=(i%2===0);
        var wrap=el('g',{class:maju?'bk-swim':'bk-swim-rev'});
        wrap.style.animationDuration=(34-s*10+rnd(-4,4)).toFixed(1)+'s';
        wrap.style.animationDelay=(-rnd(0,34)).toFixed(1)+'s';
        /* gambar dasar ikan menghadap kiri, jadi yang bergerak ke kanan perlu dibalik */
        var skala=maju? ('-'+s.toFixed(2)) : s.toFixed(2);
        var f=el('g',{transform:'translate(0,'+y+') scale('+skala+',1) scale(1,'+s.toFixed(2)+')',opacity:rnd(.6,.95).toFixed(2)});
        var c=warna[i%warna.length];
        f.appendChild(el('ellipse',{cx:0,cy:0,rx:26,ry:15,fill:c}));
        f.appendChild(el('path',{d:'M22 0 L44 -14 L44 14 Z',fill:c}));
        f.appendChild(el('path',{d:'M-2 -14 L10 -26 L16 -12 Z',fill:c,opacity:.8}));
        f.appendChild(el('circle',{cx:-13,cy:-3,r:3.4,fill:'#16303A'}));
        wrap.appendChild(f); g.appendChild(wrap);
      }
      var arc=['M 150 420 C 210 330, 300 330, 360 420','M 760 440 C 820 350, 910 350, 970 440'];
      arc.forEach(function(p,i){
        var j=el('g',{class:'bk-jump'});
        j.style.offsetPath='path("'+p+'")';
        j.style.animationDuration=(6.5+i*2.5)+'s';
        j.style.animationDelay=(-i*3)+'s';
        var c=i?'#56CCF2':'#F2994A';
        var body=el('g',{transform:'scale(-1,1)'});
        body.appendChild(el('ellipse',{cx:0,cy:0,rx:24,ry:14,fill:c}));
        body.appendChild(el('path',{d:'M20 0 L40 -13 L40 13 Z',fill:c}));
        body.appendChild(el('circle',{cx:-12,cy:-3,r:3.2,fill:'#16303A'}));
        j.appendChild(body);
        $('L5jump').appendChild(j);
      });

      var jalur=['M-80 190 C 240 130, 520 250, 900 150 C 1080 104, 1260 150, 1340 120',
                 'M1320 240 C 980 300, 700 180, 380 260 C 180 310, 40 250, -80 290',
                 'M-80 330 C 260 380, 560 280, 880 350 C 1060 390, 1220 330, 1330 360',
                 'M-80 120 C 300 60, 640 170, 1000 90 C 1160 56, 1270 90, 1340 70'];
      var wn=['#11202A','#2E3F4A','#6D5540','#C7CEC3','#8B6F4E','#3F5560','#E2E8E0'];
      function buatBurung(target,store){
        for(var i=0;i<11;i++){
          var s=rnd(.45,1.75), b=el('g',{class:'bk-bird'});
          b.style.offsetPath='path("'+jalur[i%jalur.length]+'")';
          b.style.animationDuration=(46-s*12+rnd(-6,6)).toFixed(1)+'s';
          b.style.animationDelay=(-rnd(0,45)).toFixed(1)+'s';
          var inner=el('g',{});
          inner.style.transform='scale('+s.toFixed(2)+') translateY('+rnd(-70,70).toFixed(0)+'px)';
          var w=el('path',{class:'bk-wing',d:'M-9 0 q9 -8 9 0 q0 -8 9 0',
            stroke:wn[Math.floor(Math.random()*wn.length)],'stroke-width':(2.8/Math.max(s,.5)).toFixed(2)});
          w.style.animationDuration=(0.55+s*0.75).toFixed(2)+'s';
          w.style.animationDelay=(-rnd(0,2)).toFixed(2)+'s';
          inner.appendChild(w); b.appendChild(inner); target.appendChild(b);
          if(store) store.push({node:b,base:rnd(.45,.95)});
        }
      }
      buatBurung($('burung5'),null);
      BIRDS=[]; buatBurung($('burung'),BIRDS);
    })();

    /* ================= orang kartun ================= */
    function orang(o){
      o=o||{};
      var kulit=o.kulit||'#F2C49B', baju=o.baju||'#3AA05A', celana=o.celana||'#2F5E9E',
          rambut=o.rambut||'#3A2A1E', pita=o.pita, s=o.scale||1, rok=!!o.rok, kaki=o.kaki||'sepatu';
      var g=el('g',{transform:'translate('+(o.x||0)+','+(o.y||0)+') scale('+s+')'});

      if(rok){
        /* rok: satu bentuk melebar menutup kedua kaki, betis kecil di bawahnya */
        g.appendChild(el('path',{d:'M-24 -50 L24 -50 L32 -10 L-32 -10 Z',fill:celana,'data-part':'bawah'}));
        g.appendChild(el('rect',{x:-15,y:-14,width:11,height:16,rx:5,fill:kulit}));
        g.appendChild(el('rect',{x:4,y:-14,width:11,height:16,rx:5,fill:kulit}));
      } else {
        g.appendChild(el('rect',{x:-24,y:-48,width:20,height:50,rx:9,fill:celana,'data-part':'bawah'}));
        g.appendChild(el('rect',{x:4,y:-48,width:20,height:50,rx:9,fill:celana,'data-part':'bawah'}));
      }

      if(kaki==='sepatu'){
        g.appendChild(el('ellipse',{cx:-14,cy:4,rx:14,ry:7,fill:'#3B2E28'}));
        g.appendChild(el('ellipse',{cx:14,cy:4,rx:14,ry:7,fill:'#3B2E28'}));
      } else if(kaki==='sandal'){
        g.appendChild(el('ellipse',{cx:-14,cy:5,rx:13,ry:4.4,fill:'#C79A5B'}));
        g.appendChild(el('ellipse',{cx:14,cy:5,rx:13,ry:4.4,fill:'#C79A5B'}));
        g.appendChild(el('path',{d:'M-20 1 L-8 1',stroke:'#8A6636','stroke-width':2.4,'stroke-linecap':'round'}));
        g.appendChild(el('path',{d:'M8 1 L20 1',stroke:'#8A6636','stroke-width':2.4,'stroke-linecap':'round'}));
      } else {
        g.appendChild(el('ellipse',{cx:-14,cy:4,rx:10,ry:5,fill:kulit}));
        g.appendChild(el('ellipse',{cx:14,cy:4,rx:10,ry:5,fill:kulit}));
      }

      g.appendChild(el('rect',{x:-28,y:-104,width:56,height:62,rx:20,fill:baju,'data-part':'atas'}));
      g.appendChild(el('rect',{x:-44,y:-98,width:18,height:46,rx:9,fill:baju,'data-part':'atas'}));
      g.appendChild(el('circle',{cx:-35,cy:-54,r:9,fill:kulit}));
      var lengan=el('g',{class:'bk-wavehand'});
      lengan.style.animationDelay=(-rnd(0,1.5)).toFixed(2)+'s';
      lengan.appendChild(el('rect',{x:26,y:-138,width:17,height:54,rx:8,fill:baju,'data-part':'atas'}));
      lengan.appendChild(el('circle',{cx:34,cy:-142,r:10,fill:kulit}));
      g.appendChild(lengan);
      /* rambut sebagai lingkaran besar di belakang, kepala di depannya, supaya wajah selalu penuh terlihat */
      g.appendChild(el('circle',{cx:0,cy:-140,r:34,fill:rambut}));
      g.appendChild(el('circle',{cx:0,cy:-130,r:29,fill:kulit}));
      g.appendChild(el('ellipse',{cx:-27,cy:-124,rx:6,ry:8,fill:kulit}));
      g.appendChild(el('ellipse',{cx:27,cy:-124,rx:6,ry:8,fill:kulit}));
      g.appendChild(el('circle',{cx:-20,cy:-122,r:5.5,fill:'#F29B9B',opacity:.55}));
      g.appendChild(el('circle',{cx:20,cy:-122,r:5.5,fill:'#F29B9B',opacity:.55}));
      g.appendChild(el('circle',{cx:-11,cy:-132,r:6.6,fill:'#FFFFFF'}));
      g.appendChild(el('circle',{cx:11,cy:-132,r:6.6,fill:'#FFFFFF'}));
      g.appendChild(el('circle',{cx:-9.5,cy:-132,r:3.2,fill:'#2A2320'}));
      g.appendChild(el('circle',{cx:12.5,cy:-132,r:3.2,fill:'#2A2320'}));
      g.appendChild(el('path',{d:'M-10 -117 q10 9 20 0',stroke:'#B5533C','stroke-width':3.2,fill:'none','stroke-linecap':'round'}));
      if(pita){
        g.appendChild(el('circle',{cx:-24,cy:-160,r:8,fill:pita}));
        g.appendChild(el('circle',{cx:-38,cy:-156,r:6,fill:pita}));
      }
      return g;
    }

    /* ================= ayam jago ================= */
    function ayamJago(id,x,y){
      var g=el('g',{id:uid+'_'+id,transform:'translate('+x+','+y+')',opacity:0});
      g.style.transition='opacity 1s ease';
      var badan=el('g',{class:'bk-kokok'});
      badan.appendChild(el('path',{d:'M6 -20 q26 -6 22 -26 q14 10 8 26 q10 4 6 16 q-4 10 -14 8 Z',fill:'#7C4A2D'}));
      badan.appendChild(el('path',{d:'M10 -22 q22 -4 18 -20 q10 8 6 20',fill:'#3E7CB1',opacity:.85}));
      badan.appendChild(el('ellipse',{cx:-6,cy:-24,rx:22,ry:18,fill:'#E4572E'}));
      badan.appendChild(el('circle',{cx:-24,cy:-44,r:11,fill:'#E4572E'}));
      badan.appendChild(el('path',{d:'M-28 -56 q3 -8 8 -2 q3 -8 8 0 q2 -7 7 -1',stroke:'#C1272D','stroke-width':4,fill:'none','stroke-linecap':'round'}));
      badan.appendChild(el('path',{d:'M-35 -42 q-6 2 -6 6 q4 2 7 -1 Z',fill:'#C1272D'}));
      badan.appendChild(el('path',{class:'bk-beak',d:'M-34 -46 l-9 3 l9 5 Z',fill:'#F2C230'}));
      badan.appendChild(el('circle',{cx:-27,cy:-47,r:2,fill:'#241A15'}));
      badan.appendChild(el('path',{d:'M-2 -6 l-3 10 M6 -6 l2 10 M-9 -6 l-6 9',stroke:'#F2C230','stroke-width':3,'stroke-linecap':'round'}));
      g.appendChild(badan);
      var suara=el('g',{class:'bk-suara'});
      suara.appendChild(el('path',{d:'M-46 -58 q-6 -4 -3 -10',stroke:'#FFE9A8','stroke-width':3,fill:'none','stroke-linecap':'round'}));
      suara.appendChild(el('path',{d:'M-50 -50 q-8 -2 -7 -9',stroke:'#FFE9A8','stroke-width':3,fill:'none','stroke-linecap':'round'}));
      g.appendChild(suara);
      return g;
    }

    /* ================= HARI 6 : binatang darat ================= */
    (function(){
      var g=$('satwa'), dasar=712;

      /* anjing */
      var dog=el('g',{transform:'translate(330,'+dasar+') scale(1.2)'});
      var ekor=el('path',{d:'M30 -40 q22 -10 26 -26',stroke:'#B8794A','stroke-width':8,fill:'none','stroke-linecap':'round',class:'bk-tail'});
      dog.appendChild(ekor);
      dog.appendChild(el('ellipse',{cx:0,cy:-32,rx:38,ry:24,fill:'#B8794A'}));
      [-22,-4,14,28].forEach(function(x){dog.appendChild(el('rect',{x:x,y:-18,width:11,height:20,rx:5,fill:'#A66C40'}));});
      dog.appendChild(el('circle',{cx:-38,cy:-54,r:22,fill:'#C88A57'}));
      dog.appendChild(el('ellipse',{cx:-54,cy:-52,rx:9,ry:16,fill:'#8E5A34'}));
      dog.appendChild(el('ellipse',{cx:-52,cy:-40,rx:11,ry:8,fill:'#E8CBAE'}));
      dog.appendChild(el('circle',{cx:-58,cy:-42,r:4,fill:'#33241A'}));
      dog.appendChild(el('circle',{cx:-40,cy:-58,r:3.4,fill:'#33241A'}));
      g.appendChild(dog);

      /* singa */
      var lion=el('g',{transform:'translate(500,'+dasar+') scale(1.26)'});
      lion.appendChild(el('path',{d:'M44 -54 q28 -6 30 -34',stroke:'#D89A44','stroke-width':7,fill:'none','stroke-linecap':'round',class:'bk-tail'}));
      lion.appendChild(el('circle',{cx:76,cy:-92,r:9,fill:'#8A5A2B'}));
      lion.appendChild(el('ellipse',{cx:0,cy:-42,rx:50,ry:30,fill:'#E0A34B'}));
      [-34,-12,14,32].forEach(function(x){lion.appendChild(el('rect',{x:x,y:-22,width:13,height:24,rx:6,fill:'#CE9040'}));});
      lion.appendChild(el('circle',{cx:-50,cy:-70,r:40,fill:'#C77B32'}));
      lion.appendChild(el('circle',{cx:-50,cy:-70,r:26,fill:'#F0C07A'}));
      lion.appendChild(el('circle',{cx:-59,cy:-76,r:3.6,fill:'#3A2415'}));
      lion.appendChild(el('circle',{cx:-41,cy:-76,r:3.6,fill:'#3A2415'}));
      lion.appendChild(el('path',{d:'M-54 -64 l4 4 l4 -4 Z',fill:'#8A4B2A'}));
      lion.appendChild(el('path',{d:'M-58 -58 q8 7 16 0',stroke:'#8A4B2A','stroke-width':2.6,fill:'none','stroke-linecap':'round'}));
      g.appendChild(lion);

      /* jerapah */
      var gir=el('g',{transform:'translate(790,'+dasar+') scale(1.2)'});
      [-40,-16,14,36].forEach(function(x){gir.appendChild(el('rect',{x:x,y:-52,width:14,height:54,rx:7,fill:'#E8B85C'}));});
      gir.appendChild(el('ellipse',{cx:0,cy:-74,rx:58,ry:36,fill:'#F0C468'}));
      [[-30,-80],[-6,-66],[18,-84],[34,-62],[-16,-96]].forEach(function(p){
        gir.appendChild(el('ellipse',{cx:p[0],cy:p[1],rx:9,ry:7,fill:'#C08838',opacity:.75}));});
      var leher=el('g',{class:'bk-neck'});
      leher.appendChild(el('path',{d:'M26 -96 L44 -226 L70 -222 L54 -92 Z',fill:'#F0C468'}));
      [[38,-130],[44,-166],[50,-200]].forEach(function(p){
        leher.appendChild(el('ellipse',{cx:p[0],cy:p[1],rx:7,ry:6,fill:'#C08838',opacity:.7}));});
      leher.appendChild(el('ellipse',{cx:62,cy:-236,rx:26,ry:18,fill:'#F0C468'}));
      leher.appendChild(el('ellipse',{cx:82,cy:-230,rx:13,ry:10,fill:'#E4B072'}));
      leher.appendChild(el('circle',{cx:56,cy:-244,r:3.4,fill:'#3A2415'}));
      leher.appendChild(el('path',{d:'M52 -252 l-3 -12',stroke:'#C08838','stroke-width':4,'stroke-linecap':'round'}));
      leher.appendChild(el('path',{d:'M66 -254 l2 -12',stroke:'#C08838','stroke-width':4,'stroke-linecap':'round'}));
      leher.appendChild(el('circle',{cx:49,cy:-266,r:3.6,fill:'#8A5A2B'}));
      leher.appendChild(el('circle',{cx:68,cy:-268,r:3.6,fill:'#8A5A2B'}));
      gir.appendChild(leher);
      g.appendChild(gir);

      /* gajah */
      var ele=el('g',{transform:'translate(990,'+dasar+') scale(1.26)'});
      ele.appendChild(el('ellipse',{cx:0,cy:-64,rx:78,ry:52,fill:'#9AA7B5'}));
      [-56,-20,18,50].forEach(function(x){ele.appendChild(el('rect',{x:x,y:-28,width:26,height:30,rx:11,fill:'#8C99A7'}));});
      ele.appendChild(el('circle',{cx:-74,cy:-78,r:42,fill:'#A6B3C0'}));
      ele.appendChild(el('ellipse',{cx:-64,cy:-84,rx:26,ry:33,fill:'#8C99A7'}));
      ele.appendChild(el('path',{class:'bk-trunk',d:'M-108 -66 q-18 30 -8 58',stroke:'#A6B3C0','stroke-width':19,fill:'none','stroke-linecap':'round'}));
      ele.appendChild(el('circle',{cx:-90,cy:-88,r:4,fill:'#2E3942'}));
      ele.appendChild(el('path',{d:'M-100 -50 q-10 8 -14 18',stroke:'#F2F3F0','stroke-width':6,fill:'none','stroke-linecap':'round'}));
      ele.appendChild(el('path',{d:'M74 -74 q18 6 16 26',stroke:'#8C99A7','stroke-width':6,fill:'none','stroke-linecap':'round',class:'bk-tail'}));
      g.appendChild(ele);

      /* manusia — HARI 6 tidak mengikuti jam: selalu tampil, pakaian tetap */
      g.appendChild(orang({x:210,y:dasar,scale:1.26,rambut:'#2B2019',
        baju:'#3AA05A',celana:'#2F5E9E',kaki:'sepatu'}));
    })();

    /* ================= jadwal pakaian & kemunculan (HARI 7) =================
       05.00–07.00  kaos rumah, baru bangun, tanpa alas kaki
       07.00–10.00  seragam sekolah: atas putih, celana/rok merah, bersepatu
       10.00–13.00  baju pergi, bersepatu
       13.00–18.00  kaos rumah sore, bersandal
       18.00–21.00  baju tidur, tanpa alas kaki
       21.00–05.00  menghilang (tidur)
       05.00–06.00  ayam jago muncul di samping, berkokok               */
    function pakaianSekarang(jam){
      if(jam>=21 || jam<5)  return null;                                                              /* tidur */
      if(jam<7)             return {fase:'bangun',  atas:'#8ED1FC', bawah:'#8D6E63', kaki:'none'};
      if(jam<10)            return {fase:'sekolah', atas:'#FFFFFF', bawah:'#D7263D', kaki:'sepatu', sekolah:true};
      if(jam<13)            return {fase:'pergi',   atas:'#F2994A', bawah:'#2F4156', kaki:'sepatu'};
      if(jam<18)            return {fase:'sore',    atas:'#56CCF2', bawah:'#6D4C41', kaki:'sandal'};
      return                       {fase:'tidur',   atas:'#9575CD', bawah:'#7E57C2', kaki:'none'};
    }

    /* menempatkan penampung kosong dulu; isinya dibangun ulang oleh terapkanOrangWaktu() */
    function orangPlaceholder(id,x,y,scale,rambut,pitaWarna,pakaiRok){
      var holder=el('g',{id:uid+'_'+id+'-slot','data-x':x,'data-y':y,'data-scale':scale,
        'data-rambut':rambut,'data-pita':pitaWarna||'','data-rok':pakaiRok?'1':'0','data-id':id});
      return holder;
    }

    function terapkanOrangWaktu(slotId,jam){
      var slot=$(slotId+'-slot');
      if(!slot) return;
      var p=pakaianSekarang(jam);
      var fase=p?p.fase:'hilang';
      if(slot.getAttribute('data-fase')===fase) return; /* fase belum berganti: biarkan saja */
      slot.setAttribute('data-fase',fase);

      var lama=$(slot.getAttribute('data-id'));
      if(lama){
        lama.style.opacity=0;                                   /* memudar dulu, lalu dihapus */
        (function(n){ setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); },850); })(lama);
        lama.id='';
      }
      if(!p) return; /* 21.00–05.00: sedang tidur, tidak digambar sama sekali */

      var pita=slot.getAttribute('data-pita');
      var baru=orang({
        x:+slot.getAttribute('data-x'), y:+slot.getAttribute('data-y'), scale:+slot.getAttribute('data-scale'),
        baju:p.atas, celana:p.bawah, kaki:p.kaki, rambut:slot.getAttribute('data-rambut'),
        pita: pita?pita:undefined,
        rok: slot.getAttribute('data-rok')==='1'   /* yang berok tetap berok sepanjang hari */
      });
      baru.id=uid+'_'+slot.getAttribute('data-id');
      baru.style.opacity=0; baru.style.transition='opacity .8s ease';
      slot.parentNode.insertBefore(baru, slot.nextSibling);
      requestAnimationFrame(function(){ baru.style.opacity=1; });
    }

    /* jam boleh dititipkan (untuk pratinjau geser); kalau kosong pakai jam asli perangkat */
    function terapkanSemuaJadwal(jam){
      if(typeof jam!=='number') jam=jamSekarang();
      ['anak1','anak2'].forEach(function(id){ terapkanOrangWaktu(id,jam); });
      var ayamTampil=(jam>=5 && jam<6), a=$('ayam7');
      if(a) a.style.opacity = ayamTampil?1:0;
    }

    /* ================= HARI 7 : sawah ================= */
    (function(){
      var g=$('padi');
      for(var i=0;i<46;i++){
        var x=-20+i*27+rnd(-7,7), h=rnd(62,116), base=906, lean=rnd(-8,8);
        var grp=el('g',{class:'bk-stalk'});
        grp.style.animationDuration=rnd(4.2,7).toFixed(2)+'s';
        grp.style.animationDelay=(-rnd(0,5)).toFixed(2)+'s';
        grp.appendChild(el('path',{d:'M'+x+' '+base+' C '+(x+lean*.3)+' '+(base-h*.5)+', '+(x+lean)+' '+(base-h*.78)+', '+(x+lean*1.5)+' '+(base-h),stroke:'#0E3226','stroke-width':2.4,fill:'none'}));
        grp.appendChild(el('ellipse',{cx:x+lean*1.5,cy:base-h-5,rx:3.4,ry:8.5,fill:'#C79A45',opacity:.9}));
        g.appendChild(grp);
      }
      var st=$('bintang'), st4=$('bintang4');
      for(var j=0;j<110;j++){
        var c=el('circle',{cx:rnd(0,1200),cy:rnd(0,440),r:rnd(.5,1.7),class:'bk-star'});
        c.style.animationDuration=rnd(2.5,7).toFixed(2)+'s';
        c.style.animationDelay=(-rnd(0,7)).toFixed(2)+'s';
        st.appendChild(c);
        var c2=c.cloneNode(true); st4.appendChild(c2);
      }
      var k=$('kunang');
      for(var m=0;m<22;m++){
        var f=el('circle',{cx:rnd(0,1200),cy:rnd(600,880),r:rnd(1.6,3.2),class:'bk-fly-bug'});
        f.style.animationDuration=rnd(3.5,8).toFixed(2)+'s';
        f.style.animationDelay=(-rnd(0,8)).toFixed(2)+'s';
        k.appendChild(f);
      }
      var a=$('anak');
      a.appendChild(orangPlaceholder('anak1',150,648,.92,'#3A2A1E',null,false));
      a.appendChild(orangPlaceholder('anak2',1060,648,.92,'#4A2E20','#F2C94C',true));
      a.appendChild(ayamJago('ayam7',230,652));
    })();
    terapkanSemuaJadwal();                 /* pertama kali */
    setInterval_(function(){ if(!manual) terapkanSemuaJadwal(); }, 30000);

    /* ================= siklus waktu (hari 7) ================= */
    var KUNCI=[
     {t:0,top:'#04070F',mid:'#071426',low:'#0C2136',hor:'#13314A',malam:.72,hangat:0},
     {t:4.8,top:'#0A1226',mid:'#1D2E4A',low:'#3E4361',hor:'#6B5560',malam:.55,hangat:.05},
     {t:6.2,top:'#24365E',mid:'#6E5A72',low:'#C2795E',hor:'#F0A868',malam:.20,hangat:.24},
     {t:7.6,top:'#2F6B9C',mid:'#79A9C8',low:'#CFD9C2',hor:'#F3DFB4',malam:.05,hangat:.10},
     {t:12,top:'#1F74C0',mid:'#8CC4E6',low:'#CFE4EA',hor:'#E8F1E4',malam:0,hangat:0},
     {t:16,top:'#2E7FBB',mid:'#9FC2D8',low:'#D9D6BC',hor:'#F2E0B4',malam:0,hangat:.07},
     {t:18,top:'#2A3E66',mid:'#97605C',low:'#E08A4E',hor:'#F6B368',malam:.17,hangat:.28},
     {t:19.2,top:'#101C36',mid:'#2A3550',low:'#5B4A5E',hor:'#8A6A66',malam:.45,hangat:.10},
     {t:20.5,top:'#060C1C',mid:'#0B1A2C',low:'#14283E',hor:'#1A3A52',malam:.66,hangat:0},
     {t:24,top:'#04070F',mid:'#071426',low:'#0C2136',hor:'#13314A',malam:.72,hangat:0}];
    function hx(h){h=h.replace('#','');return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];}
    function campur(a,b,t){var A=hx(a),B=hx(b),o='#';for(var i=0;i<3;i++){var v=Math.round(A[i]+(B[i]-A[i])*t).toString(16);o+=v.length<2?'0'+v:v;}return o;}
    function palet(j){for(var i=0;i<KUNCI.length-1;i++){var a=KUNCI[i],b=KUNCI[i+1];
      if(j>=a.t&&j<=b.t){var t=(j-a.t)/(b.t-a.t);return{top:campur(a.top,b.top,t),mid:campur(a.mid,b.mid,t),
        low:campur(a.low,b.low,t),hor:campur(a.hor,b.hor,t),malam:a.malam+(b.malam-a.malam)*t,
        hangat:a.hangat+(b.hangat-a.hangat)*t};}}return KUNCI[0];}
    var TERBIT=5.9,TERBENAM=18.2;
    function busur(j,naik,turun){var r=turun-naik;if(r<0)r+=24;var d=j-naik;if(d<0)d+=24;var p=d/r;
      if(p>1)return null;return{x:60+p*1080,y:430-Math.sin(p*Math.PI)*330,p:p};}
    function langit(top,mid,low,hor){
      $('s0').setAttribute('stop-color',top);$('s1').setAttribute('stop-color',mid);
      $('s2').setAttribute('stop-color',low);$('s3').setAttribute('stop-color',hor);}

    function perbaruiSawah(jam){
      var p=palet(jam);
      langit(p.top,p.mid,p.low,p.hor);
      $('tintMalam').setAttribute('opacity',p.malam.toFixed(3));
      $('tintHangat').setAttribute('opacity',p.hangat.toFixed(3));
      var siang=1-Math.min(p.malam/.72,1), pekat=Math.max(0,Math.min(1,(p.malam-.28)/.35));
      var m=busur(jam,TERBIT,TERBENAM);
      if(m){
        var rendah=1-Math.sin(m.p*Math.PI), w=campur('#FFF4C8','#FF9A46',rendah);
        $('matahariG').setAttribute('opacity',1);
        $('matahariG').setAttribute('transform','translate('+m.x.toFixed(1)+','+m.y.toFixed(1)+')');
        $('sunDisc').setAttribute('fill',w);$('sunDisc').setAttribute('r',(52+rendah*14).toFixed(1));
        $('sunGlow').setAttribute('r',(200+rendah*130).toFixed(0));
        $('g0').setAttribute('stop-color',w);$('g1').setAttribute('stop-color',w);$('g2').setAttribute('stop-color',w);
        $('airGlow').setAttribute('fill',w);$('airGlow').setAttribute('opacity',(0.08+0.2*(1-rendah)).toFixed(2));
      }else{
        $('matahariG').setAttribute('opacity',0);
        $('airGlow').setAttribute('fill','#BFD8F0');$('airGlow').setAttribute('opacity',(0.05+0.09*pekat).toFixed(2));
      }
      var bl=busur(jam,TERBENAM,TERBIT);
      $('bulanG').setAttribute('opacity',bl?Math.min(1,pekat*1.2).toFixed(2):0);
      if(bl)$('bulanG').setAttribute('transform','translate('+bl.x.toFixed(1)+','+bl.y.toFixed(1)+')');
      $('bintang').setAttribute('opacity',(pekat*.95).toFixed(2));
      $('kunang').setAttribute('opacity',(pekat*.9).toFixed(2));
      $('awan1').setAttribute('opacity',(.08+siang*.26).toFixed(2));
      (BIRDS||[]).forEach(function(b){b.node.setAttribute('opacity',(b.base*(0.12+siang*0.88)).toFixed(2));});
      var jj=Math.floor(jam),mm=Math.floor((jam-jj)*60);
      var nama;
      if(jam>=4.5&&jam<10.5)nama='pagi';else if(jam<15)nama='siang';else if(jam<18.5)nama='sore';else nama='malam';
      /* HUD di luar SVG (jam & sapaan) -- opsional: kalau pemanggil tidak
         memasang apa-apa, callback ini kosong dan tidak ada yang error. */
      onJam({ jam: jam, teks: (jj<10?'0':'')+jj+':'+(mm<10?'0':'')+mm, salam: nama });
    }


    /* ================= ganti hari (1..7) ================= */
    var HARI = 1;
    function nyala(id, on) { var n = $(id); if (n) n.classList.toggle("bk-on", !!on); }

    function setHari(n) {
      n = Math.max(1, Math.min(7, parseInt(n, 10) || 1));
      HARI = n;
      nyala("L1", n === 1);
      nyala("L2", n >= 2 && n <= 6);
      nyala("L3", n >= 3 && n <= 6);
      nyala("L4", n === 4);
      nyala("Lsun", n === 5 || n === 6);
      nyala("L5fish", n >= 5 && n <= 6);
      nyala("L5jump", n >= 5 && n <= 6);
      nyala("L5bird", n >= 5 && n <= 6);
      nyala("L6", n === 6);
      nyala("L7", n === 7);
      if (n === 1) langit("#04070F", "#060C18", "#0A1626", "#101F30");
      else if (n === 4) langit("#101C36", "#2A3550", "#6B5560", "#E7A96A");
      else if (n >= 2 && n <= 6) langit("#2F7BC0", "#7FB8DE", "#BFE0EC", "#E9F3E8");
      else segarkanHari7();
      return HARI;
    }

    // Hari 7 = satu-satunya hari yang hidup mengikuti jam (langit +
    // baju anak + ayam jago). Hari 1-6 gambarnya tetap.
    function segarkanHari7() {
      var j = jamSekarang();
      perbaruiSawah(j);
      terapkanSemuaJadwal(j);
    }

    function setJam(j) {
      manual = true;
      jamManual = Math.max(0, Math.min(23.999, Number(j) || 0));
      if (HARI === 7) segarkanHari7();
      return jamManual;
    }

    function ikutiJamPerangkat() {
      manual = false; jamManual = null;
      if (HARI === 7) segarkanHari7();
    }

    // Detak per menit -- hanya berlaku kalau sedang di hari 7 & tidak
    // sedang dipratinjau manual.
    setInterval_(function () { if (HARI === 7 && !manual) segarkanHari7(); }, 60000);

    setHari(opts.hari || 1);
    if (opts.ikutiJam) ikutiJamPerangkat();

    var api = {
      uid: uid,
      el: container,
      setHari: setHari,
      getHari: function () { return HARI; },
      setJam: setJam,
      ikutiJamPerangkat: ikutiJamPerangkat,
      jamSekarang: jamSekarang,
      destroy: function () {
        timers.forEach(clearInterval);
        timers.length = 0;
        container.innerHTML = "";
        container.classList.remove("bk-scene");
      }
    };
    return api;
  }

  var HARI_INFO = [
    { n: 1, ikon: "✨", nama: "Terang" },
    { n: 2, ikon: "🌊", nama: "Cakrawala & air" },
    { n: 3, ikon: "🌿", nama: "Darat, laut & tumbuhan" },
    { n: 4, ikon: "🌗", nama: "Matahari, bulan & bintang" },
    { n: 5, ikon: "🐟", nama: "Ikan & burung" },
    { n: 6, ikon: "🦁", nama: "Binatang darat & manusia" },
    { n: 7, ikon: "🌾", nama: "Hari perhentian di sawah" }
  ];

  window.BookScene = { mount: mount, HARI: HARI_INFO };

  // ---- Pemasangan OTOMATIS di Layar Masuk (index.html) --------------
  // Kalau di halaman ini ada <div id="loginBookScene">, scene dipasang
  // sendiri sebagai latar layar login -- js/app.js TIDAK perlu diubah
  // sama sekali. Tombol hari kecil ikut dibuat supaya yang membuka
  // aplikasi bisa main-main sambil mengetik password.
  function pasangDiLogin() {
    var host = document.getElementById("loginBookScene");
    if (!host || host.dataset.bkMounted === "1") return;
    host.dataset.bkMounted = "1";

    var sc = mount(host, { hari: 1, ikutiJam: true });
    window.BookSceneLogin = sc;

    var bar = document.getElementById("loginBookDays");
    if (!bar) return;
    HARI_INFO.forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bk-day";
      b.setAttribute("aria-label", "Hari " + d.n + ": " + d.nama);
      b.setAttribute("aria-selected", d.n === 1 ? "true" : "false");
      b.innerHTML = '<em aria-hidden="true">' + d.ikon + "</em><span>" + d.n + "</span>";
      b.addEventListener("click", function () {
        sc.setHari(d.n);
        bar.querySelectorAll(".bk-day").forEach(function (x, i) {
          x.setAttribute("aria-selected", String(i + 1 === d.n));
        });
        var lbl = document.getElementById("loginBookLabel");
        if (lbl) lbl.textContent = "Hari " + d.n + " · " + d.nama;
      });
      bar.appendChild(b);
    });
  }

  // ---- Kartu Masuk yang mulai TERTUTUP (17 Sep 2026) ----------------
  // Kelas .login-collapsible SENGAJA dipasang dari sini, bukan ditulis
  // langsung di index.html: selama fungsi ini belum jalan, seluruh
  // aturan "tutup" di css/book-scene.css tidak berlaku sama sekali &
  // form login tampil utuh seperti versi lama. Jadi kalau file ini
  // gagal dimuat, yang hilang cuma animasi latar + tombol buka/tutup --
  // proses masuk, Mode Tamu, dan Daftar Akun Baru tetap bisa dipakai.
  function wireKartuLogin() {
    var card = document.getElementById("loginCard");
    var btn = document.getElementById("loginToggleBtn");
    var body = document.getElementById("loginBody");
    if (!card || !btn || !body) return;

    card.classList.add("login-collapsible");
    setOpen(false);

    function setOpen(v) {
      card.dataset.open = String(v);
      btn.setAttribute("aria-expanded", String(v));
      if (v) {
        var u = document.getElementById("loginUsername");
        if (u) setTimeout(function () { try { u.focus(); } catch (e) {} }, 260);
      }
    }

    btn.addEventListener("click", function () { setOpen(card.dataset.open !== "true"); });

    // Kalau js/app.js menampilkan pesan "Username atau password salah",
    // kartunya dibuka sendiri -- supaya pesan itu tidak pernah muncul di
    // dalam bagian yang sedang tertutup & tidak terlihat operator.
    var err = document.getElementById("loginError");
    if (err && typeof MutationObserver !== "undefined") {
      new MutationObserver(function () {
        if (!err.hidden && card.dataset.open !== "true") setOpen(true);
      }).observe(err, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  function siap() {
    pasangDiLogin();
    wireKartuLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", siap);
  } else {
    siap();
  }
})();
