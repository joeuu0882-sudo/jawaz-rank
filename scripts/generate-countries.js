// Generates one static HTML page per passport from the source CSV.
// No dependencies are required; this uses Node.js built-in APIs only.
const fs = require("node:fs");
const path = require("node:path");

const CSV_URLS = [
  "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-matrix-iso2.csv",
  "https://cdn.jsdelivr.net/gh/imorte/passport-index-data@main/passport-index-matrix-iso2.csv"
];
const SITE = "https://joeuu0882-sudo.github.io/jawaz-rank/";
const OUT = path.join(process.cwd(), "countries");

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows.filter(r => r.some(x => x !== ""));
}
function kind(v) {
  v = (v || "").trim().toLowerCase();
  if (v === "-1") return "own";
  if (/^\d+$/.test(v) || v === "visa free") return "free";
  if (v === "visa on arrival") return "voa";
  if (v === "eta") return "eta";
  if (v === "e-visa") return "ev";
  if (v === "visa required") return "req";
  if (v === "no admission") return "ban";
  return "none";
}
function stayValue(v) {
  v = (v || "").trim().toLowerCase();
  if (/^\d+$/.test(v)) return Number(v);
  if (v === "visa free") return 0;
  return null;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function slug(code, name) {
  const map = {MA:"morocco",US:"united-states",GB:"united-kingdom",AE:"united-arab-emirates",KR:"south-korea",KP:"north-korea",CZ:"czechia",CI:"cote-divoire",CV:"cabo-verde",CD:"dr-congo",CG:"republic-of-congo",BO:"bolivia",VE:"venezuela",TZ:"tanzania",RU:"russia",PS:"palestine"};
  if (map[code]) return map[code];
  let s = name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return s || code.toLowerCase();
}
function flag(code) {
  return String.fromCodePoint(...code.split("").map(c => 127397 + c.charCodeAt(0)));
}
function buildPage(country, data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="اكتشف ترتيب جواز ${esc(country.name)} وعدد الوجهات وشروط الدخول ومدة الإقامة.">
<link rel="canonical" href="${SITE}countries/${country.slug}.html">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website"><meta property="og:site_name" content="جواز رانك | JAWAZ RANK">
<meta property="og:title" content="جواز السفر ${esc(country.name)} | جواز رانك">
<meta property="og:description" content="ترتيب جواز ${esc(country.name)} والوجهات المتاحة وشروط الدخول.">
<title>جواز السفر ${esc(country.name)} | جواز رانك</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#0B2530;--panel:#123A4A;--line:#25576B;--text:#E8F1F2;--muted:#9DB8C0;--gold:#E9B949;--green:#2FA36B}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Cairo,Tahoma,sans-serif;line-height:1.8}
main{max-width:950px;margin:auto;padding:22px 16px 50px}a{color:inherit}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.logo{font-size:23px;font-weight:900;text-decoration:none}.logo span{color:var(--gold)}
.back,.maplink{display:inline-block;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 14px;text-decoration:none}
h1{font-size:clamp(27px,5vw,40px);margin:22px 0 5px}.sub{color:var(--muted);margin-top:0}
.hero{background:linear-gradient(140deg,#16505F,#0E2F3C);border:1px solid var(--line);border-radius:18px;padding:25px;margin:22px 0}
.flag{font-size:48px}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:20px 0}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:16px}
.stat strong{display:block;font-size:30px;color:var(--gold);line-height:1.5}.stat small{color:var(--muted)}
h2{font-size:22px;margin:30px 0 12px}.bars{display:grid;gap:12px}
.bar{display:grid;grid-template-columns:145px 1fr 45px;align-items:center;gap:10px}
.track{height:12px;background:#294957;border-radius:20px;overflow:hidden}.fill{height:100%;border-radius:20px}
.list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}
.country{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.country b{display:block}.country small{color:var(--muted)}
.note{color:var(--muted);font-size:13px;border-top:1px solid var(--line);margin-top:35px;padding-top:15px}
.maplink{background:var(--gold);color:#0B2530;font-weight:900;margin-top:20px}
input{width:100%;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--text);font:inherit}
@media(max-width:520px){.bar{grid-template-columns:110px 1fr 35px;font-size:13px}.hero{padding:18px}}
</style></head><body><main>
<header><a class="logo" href="../">جواز <span>رانك</span></a><a class="back" href="../">← جميع الجوازات</a></header>
<section class="hero"><div class="flag">${flag(country.code)}</div>
<h1>جواز السفر ${esc(country.name)}</h1>
<p class="sub">اكتشف عدد الوجهات التي يتيحها جواز السفر ${esc(country.name)} وشروط الدخول إليها.</p>
<div id="summary"></div>
<a class="maplink" href="../#/${country.code}">استكشف خريطة الجواز ${esc(country.name)} التفاعلية ←</a></section>
<div class="stats"><div class="stat"><strong>${data.rank}</strong><small>الترتيب العالمي</small></div>
<div class="stat"><strong>${data.score}</strong><small>وجهة دون تأشيرة مسبقة</small></div>
<div class="stat"><strong>${data.destinations.length}</strong><small>إجمالي الوجهات في البيانات</small></div></div>
<h2>أنواع شروط الدخول</h2><div id="bars" class="bars"></div>
<h2>الوجهات وشروط الدخول</h2><p class="sub">القائمة التالية مبنية على بيانات المصدر، ويمكنك البحث عن دولة.</p>
<input id="search" type="search" placeholder="ابحث عن دولة..."><div id="destinations" class="list" style="margin-top:14px"></div>
<p class="note">المصدر: بيانات Passport Index عبر مستودع imorte/passport-index-data.<br>
يتم احتساب الوجهات دون تأشيرة مسبقة وفق منهجية جواز رانك: الإعفاء من التأشيرة، وتأشيرة عند الوصول، والتصريح الإلكتروني eTA.<br>
قد تتغير شروط الدخول؛ تحقق دائمًا من الجهات الرسمية قبل السفر.</p>
</main>
<script>const DATA=${json};
const labels={free:"بدون تأشيرة",voa:"تأشيرة عند الوصول",eta:"تصريح إلكتروني eTA",ev:"تأشيرة إلكترونية",req:"تأشيرة مسبقة",ban:"الدخول غير مسموح",none:"لا توجد بيانات",own:"بلد الجواز"};
const colors={free:"#2FA36B",voa:"#E9B949",eta:"#6CC3D5",ev:"#4C9BD6",req:"#C8553D",ban:"#6B2433"};
document.getElementById("summary").textContent="يتيح جواز السفر "+DATA.countryName+" "+DATA.score+" وجهة دون تأشيرة مسبقة، وفق البيانات المتاحة.";
const counts={free:0,voa:0,eta:0,ev:0,req:0,ban:0,none:0};
DATA.destinations.forEach(x=>{if(counts[x.type]!==undefined)counts[x.type]++});
document.getElementById("bars").innerHTML=Object.keys(counts).filter(k=>k!=="none").map(k=>'<div class="bar"><span>'+labels[k]+'</span><div class="track"><div class="fill" style="width:'+(counts[k]/DATA.destinations.length*100)+'%;background:'+colors[k]+'"></div></div><b>'+counts[k]+'</b></div>').join("");
const list=document.getElementById("destinations");
function show(q=""){const items=DATA.destinations.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())||x.code.toLowerCase().includes(q.toLowerCase()));
list.innerHTML=items.map(x=>'<div class="country" style="border-right:4px solid '+(colors[x.type]||"#25576B")+'"><b>'+x.name+'</b><small>'+labels[x.type]+(x.stay!==null?(x.stay===0?' · مدة الإقامة غير محددة في هذا الحقل':' · مدة الإقامة: '+x.stay+' يومًا'):'')+'</small></div>').join("")||'<p>لم يتم العثور على نتائج.</p>'}
document.getElementById("search").addEventListener("input",e=>show(e.target.value));show();
</script></body></html>`;
}
async function getCSV() {
  for (const url of CSV_URLS) {
    try { const r = await fetch(url); if (r.ok) return await r.text(); } catch {}
  }
  throw new Error("Could not download passport CSV from either source.");
}
(async () => {
  const rows = parseCSV(await getCSV());
  if (!rows.length) throw new Error("CSV is empty.");
  const headers = rows[0];
  let destinations = headers.slice(1);
  const ilIndex = destinations.indexOf("IL");
  if (ilIndex >= 0) destinations.splice(ilIndex, 1);
  const passports = {};
  for (const row of rows.slice(1)) {
    const code = (row[0] || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || code === "IL") continue;
    const values = row.slice(1);
    if (ilIndex >= 0) values.splice(ilIndex, 1);
    const types = values.map(kind), stays = values.map(stayValue);
    const score = types.filter(x => ["free","voa","eta"].includes(x)).length;
    passports[code] = {types, stays, score};
  }
  const codes = Object.keys(passports);
  const sorted = codes.slice().sort((a,b)=>passports[b].score-passports[a].score);
  const ranks = {};
  sorted.forEach((c,i)=>ranks[c]=i && passports[c].score===passports[sorted[i-1]].score ? ranks[sorted[i-1]] : i+1);
  fs.mkdirSync(OUT,{recursive:true});
  const display = new Intl.DisplayNames(["ar"],{type:"region"});
  const sitemap = [];
  let written = 0;
  for (const code of codes) {
    const name = display.of(code) || code;
    const countrySlug = slug(code,name);
    const p = passports[code];
    const dest = destinations.map((destCode,i)=>({code:destCode,name:display.of(destCode)||destCode,type:p.types[i]||"none",stay:p.stays[i]??null}));
    const pageData = {countryName:name,score:p.score,rank:ranks[code],destinations:dest};
    fs.writeFileSync(path.join(OUT,countrySlug+".html"),buildPage({code,name,slug:countrySlug},pageData),"utf8");
    sitemap.push(`  <url><loc>${SITE}countries/${countrySlug}.html</loc></url>`);
    written++;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}</loc></url>\n${sitemap.join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(process.cwd(),"sitemap.xml"),xml,"utf8");
  console.log(`Generated ${written} country pages and updated sitemap.xml.`);
  if (!fs.existsSync(path.join(OUT,"morocco.html"))) throw new Error("Expected Morocco page was not generated.");
})();
