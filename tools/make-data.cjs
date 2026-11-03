// data.js を作る。星の位置・明るさ・色は Yale Bright Star Catalog（第5版）から取る。
// 使い方: node tools/make-data.cjs <bsc5-short.json のパス>
//   カタログ: https://github.com/brettonw/YaleBrightStarCatalog の bsc5-short.json（手元に落として渡す。リポジトリには入れない）
// 星座の線（どの星どうしを結ぶか）は下の CONS に書く。星はバイエル符号で指す（例 "α"、ほかの星座の星は "Tau:β"）。
// 同じ符号が2つあるとき（ζ¹・ζ² など）は明るいほうを使う。
const fs = require("fs"), path = require("path");
const cat = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const CONS = [
  { id: "Ori", n: "オリオン座", lines: "α-γ α-ζ γ-δ δ-ε ε-ζ ζ-κ δ-β κ-β α-λ γ-λ" },
  { id: "UMa", n: "北斗七星", sub: "おおぐま座", lines: "α-β β-γ γ-δ δ-α δ-ε ε-ζ ζ-η" },
  { id: "Cas", n: "カシオペヤ座", lines: "β-α α-γ γ-δ δ-ε" },
  { id: "Cyg", n: "はくちょう座", lines: "α-γ γ-β δ-γ γ-ε" },
  { id: "Lyr", n: "こと座", lines: "α-ζ ζ-β β-γ γ-δ δ-ζ" },
  { id: "Sco", n: "さそり座", lines: "β-δ δ-π δ-σ σ-α α-τ τ-ε ε-μ μ-ζ ζ-η η-θ θ-ι ι-κ κ-λ" },
  { id: "Leo", n: "しし座", lines: "α-η η-γ γ-ζ ζ-μ μ-ε γ-δ δ-β β-θ θ-α" },
  { id: "Tau", n: "おうし座", lines: "ζ-α α-γ γ-δ δ-ε ε-β" },
  { id: "Aql", n: "わし座", lines: "ζ-γ γ-α α-β β-θ α-δ δ-λ" },
  { id: "CMa", n: "おおいぬ座", lines: "β-α α-δ δ-ε δ-η ε-ζ" },
  { id: "Peg", n: "秋の四辺形", sub: "ペガスス座", lines: "α-β β-And:α And:α-γ γ-α α-ζ ζ-θ θ-ε" },
  { id: "Sgr", n: "いて座（南斗六星）", lines: "γ-δ δ-ε ε-γ δ-λ λ-φ φ-δ φ-σ σ-τ τ-ζ ζ-φ ζ-ε" },
  { id: "Gem", n: "ふたご座", lines: "α-ε ε-μ β-δ δ-γ α-β" },
  { id: "Boo", n: "うしかい座", lines: "α-ε ε-δ δ-β β-γ γ-ρ ρ-α" },
  { id: "Aur", n: "ぎょしゃ座", lines: "α-β β-θ θ-Tau:β Tau:β-ι ι-α" },
  { id: "And", n: "アンドロメダ座", lines: "α-δ δ-β β-γ β-μ" },
  { id: "Crv", n: "からす座", lines: "ε-γ γ-δ δ-β β-ε ε-α" },
  { id: "Del", n: "いるか座", lines: "ε-β β-α α-γ γ-δ δ-β" },
  { id: "CrB", n: "かんむり座", lines: "θ-β β-α α-γ γ-δ δ-ε ε-ι" },
];
// 名前のある明るい星（カタカナ）。カタログの英語名から
const KANA = { Betelgeuse: "ベテルギウス", Rigel: "リゲル", Bellatrix: "ベラトリックス", Dubhe: "ドゥーベ", Alkaid: "アルカイド", Schedar: "シェダル", Deneb: "デネブ", Albireo: "アルビレオ", Vega: "ベガ", Antares: "アンタレス", Regulus: "レグルス", Denebola: "デネボラ", Aldebaran: "アルデバラン", Altair: "アルタイル", Sirius: "シリウス", Markab: "マルカブ", Alpheratz: "アルフェラッツ", Nunki: "ヌンキ", Castor: "カストル", Pollux: "ポルックス", Arcturus: "アークトゥルス", Capella: "カペラ", Mirach: "ミラク", Almach: "アルマク", Alphecca: "アルフェッカ", Mizar: "ミザール", Elnath: "エルナト", Shaula: "シャウラ" };
const hms = (s) => { const m = s.match(/(\d+)h (\d+)m ([\d.]+)s/); return (+m[1] + m[2] / 60 + m[3] / 3600) * 15; };
const dms = (s) => { const m = s.match(/([+-])(\d+)° (\d+)′ (\d+)″/); return (m[1] === "-" ? -1 : 1) * (+m[2] + m[3] / 60 + m[4] / 3600); };
const all = cat.filter((x) => x.RA && x.Dec && x.V).map((x) => ({ c: x.C, b: x.B || "", ra: hms(x.RA), dec: dms(x.Dec), v: +x.V, k: +x.K || 6000, n: x.N }));
function star(def, home) {
  const [c, b] = def.includes(":") ? def.split(":") : [home, def];
  const hit = all.filter((s) => s.c === c && s.b.replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, "") === b).sort((a, z) => a.v - z.v)[0];
  if (!hit) throw new Error(`${home}: ${def} がカタログに無い`);
  return hit;
}
const out = [];
for (const C of CONS) {
  const keys = [], stars = [];
  const idx = (def) => { const s = star(def, C.id), k = s.c + s.b + s.ra; let i = keys.indexOf(k); if (i < 0) { keys.push(k); stars.push(s); i = stars.length - 1; } return i; };
  const lines = C.lines.split(" ").map((l) => { const [a, b] = l.split(/-(?=[^-]*$)/); return [idx(a), idx(b)]; });
  // 中心で接平面に写す（北が上・東が左＝空を見上げた向き）
  const ra0 = Math.atan2(stars.reduce((s, x) => s + Math.sin(x.ra * Math.PI / 180), 0), stars.reduce((s, x) => s + Math.cos(x.ra * Math.PI / 180), 0)) * 180 / Math.PI;
  const dec0 = stars.reduce((s, x) => s + x.dec, 0) / stars.length, r = Math.PI / 180;
  const proj = (s) => { const d = (s.ra - ra0) * r, c = Math.sin(dec0 * r) * Math.sin(s.dec * r) + Math.cos(dec0 * r) * Math.cos(s.dec * r) * Math.cos(d);
    return [-(Math.cos(s.dec * r) * Math.sin(d)) / c / r, (Math.cos(dec0 * r) * Math.sin(s.dec * r) - Math.sin(dec0 * r) * Math.cos(s.dec * r) * Math.cos(d)) / c / r]; };
  const P = stars.map(proj), xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const pad = 0.18, w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), size = Math.max(w, h * 0.8) * (1 + pad * 2);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  // 画面は横1・縦1.25。星座を真ん中に、まわりの4.8等より明るい星を「まよう星」として入れる
  const toXY = ([x, y]) => [+(0.5 + (x - cx) / size).toFixed(4), +(0.625 - (y - cy) / size).toFixed(4)];
  const pts = P.map(toXY).map((q, i) => [...q, stars[i].v, stars[i].k, KANA[stars[i].n] || ""]);
  // まわりの星を明るい順に30こまで（5.8等まで）。星座の星や、ほかのまよう星に近すぎる星は押しまちがえるので入れない
  const bg = [];
  for (const s of all.filter((s) => s.v <= 5.8).sort((a, z) => a.v - z.v)) {
    if (bg.length >= 30 || keys.includes(s.c + s.b + s.ra)) continue;
    const ang = Math.acos(Math.min(1, Math.sin(dec0 * r) * Math.sin(s.dec * r) + Math.cos(dec0 * r) * Math.cos(s.dec * r) * Math.cos((s.ra - ra0) * r))) / r;
    if (ang > 80) continue;
    const [x, y] = toXY(proj(s)); if (x < 0.03 || x > 0.97 || y < 0.03 || y > 1.22) continue;
    if ([...pts, ...bg].some((q) => Math.hypot(q[0] - x, q[1] - y) < 0.045)) continue;
    bg.push([x, y, s.v, s.k, ""]);
  }
  pts.push(...bg);
  const raH = ((ra0 + 360) % 360) / 15;
  out.push({ id: C.id, n: C.n, sub: C.sub || "", ra: +raH.toFixed(2), dec: +dec0.toFixed(1), main: stars.length, lines, pts });
}
const js = `// 星座つなぎのデータ。tools/make-data.cjs が Yale Bright Star Catalog から作る（手で直さない）。
// CONS: n 名前・ra/dec 星座の中心（時・度）・main 星座の星の数（pts の先頭から）・lines 結ぶ星の番号・pts [x, y, 等級, 色温度, 名前]（x 0〜1・y 0〜1.25、北が上・東が左）
window.SZ_DATA = { CONS: ${JSON.stringify(out).replace(/\{"id"/g, '\n {"id"')} };
`;
fs.writeFileSync(path.join(__dirname, "..", "data.js"), js);
console.log(out.map((c) => `${c.n} ${c.main}星 ${c.lines.length}線 まよう星${c.pts.length - c.main} ra${c.ra}`).join("\n"));
