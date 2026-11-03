// 星座つなぎの検査。星のデータ（本物の向き・線の星）・今夜の3星座の選び方（何年分）・なぞる/押す・まちがい・ヒント・続きから・上級・星座帳・スマホ幅・PWA を確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = "file://" + path.join(root, "index.html");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

// 1. 星のデータ
const sb = { window: {} }; vm.runInNewContext(readFileSync(path.join(root, "data.js"), "utf8"), sb);
const { CONS } = sb.window.SZ_DATA;
check("星座は15以上・名前が重ならない", CONS.length >= 15 && new Set(CONS.map((c) => c.n)).size === CONS.length, `${CONS.length}`);
check("どの星座も線の星は先頭 main 個で、線は main 個の星だけを結ぶ・同じ線が2本ない", CONS.every((c) => { const u = new Set(c.lines.flat()); const k = new Set(c.lines.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); return c.lines.every(([a, b]) => a !== b && a < c.main && b < c.main) && u.size === c.main && k.size === c.lines.length; }));
check("星座の線は1つながり（どの星もほかの星と線でつながる）", CONS.every((c) => { const seen = new Set([0]), st = [0]; while (st.length) { const v = st.pop(); for (const [a, b] of c.lines) { const w = a === v ? b : b === v ? a : -1; if (w >= 0 && !seen.has(w)) { seen.add(w); st.push(w); } } } return seen.size === c.main; }), CONS.filter((c) => { const seen = new Set([0]), st = [0]; while (st.length) { const v = st.pop(); for (const [a, b] of c.lines) { const w = a === v ? b : b === v ? a : -1; if (w >= 0 && !seen.has(w)) { seen.add(w); st.push(w); } } } return seen.size !== c.main; }).map((c) => c.n).join(","));
check("星はすべて画面の中（x 0〜1・y 0〜1.25）", CONS.every((c) => c.pts.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1.25)));
check("星どうしが近すぎない（押しまちがえない。間が画面の幅の4%以上）", CONS.every((c) => c.pts.every((p, i) => c.pts.every((q, j) => j <= i || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 0.04))), CONS.filter((c) => c.pts.some((p, i) => c.pts.some((q, j) => j > i && Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.04))).map((c) => c.n).join(","));
{ // 空を見上げた向き（北が上・東が左）。2026-11-04 左右が逆の絵を作りかけたので、よく知られた並びで確かめる
  const ori = CONS.find((c) => c.id === "Ori"), bet = ori.pts.find((p) => p[4] === "ベテルギウス"), rig = ori.pts.find((p) => p[4] === "リゲル");
  const uma = CONS.find((c) => c.id === "UMa"), dub = uma.pts.find((p) => p[4] === "ドゥーベ"), alk = uma.pts.find((p) => p[4] === "アルカイド");
  check("オリオン座はベテルギウスが左上・リゲルが右下（本物の向き）", bet && rig && bet[0] < rig[0] && bet[1] < rig[1]);
  check("北斗七星はひしゃくの先（ドゥーベ）が右・柄の先（アルカイド）が左", dub && alk && dub[0] > alk[0]);
  check("ベテルギウスは赤い星・リゲルは青白い星（色温度）", bet[3] < 4000 && rig[3] > 10000);
  check("明るい星ほど等級の数が小さい（シリウスは-1等台）", CONS.find((c) => c.id === "CMa").pts.find((p) => p[4] === "シリウス")[2] < -1);
}
check("まよう星（星座でない星）がある星座が12以上", CONS.filter((c) => c.pts.length - c.main >= 10).length >= 12);

const html = readFileSync(path.join(root, "index.html"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習の星座選びだけ", (html.match(/Math\.random/g) || []).length === 1);
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/seiza-tsunagi/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し、外へ何も送らない", ["./index.html", "./data.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "星座つなぎ" && mf.icons.length >= 2); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [];
async function newPage(w = 390, h = 844) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
  return page;
}
const center = async (page, i) => { const b = await page.locator(`#s${i} circle`).nth(1).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const st = (page) => page.evaluate(() => window.__sz.state());
try {
  const page = await newPage();
  // 2. 今夜の3星座の選び方を3年分（毎日）確かめる（乱数で組む部分は何百回も。shared-workflows incidents/2026-10-31-roppo-empty-village.md）
  const y = await page.evaluate(() => {
    const { pick, inSeason, CONS } = window.__sz, bad = []; let same = 0, prev = "";
    for (let d = 0; d < 1096; d++) {
      const k = new Date(Date.UTC(2026, 10, 4 + d)).toISOString().slice(0, 10), a = pick(k, false), h = pick(k, true), season = inSeason(k);
      if (a.length !== 3 || new Set(a).size !== 3) bad.push(k + ":3つでない");
      if (!a.every((i) => season.includes(i))) bad.push(k + ":見ごろでない星座");
      if (h.length !== 3 || h.some((i) => a.includes(i))) bad.push(k + ":上級が今日と重なる");
      if (JSON.stringify(pick(k, false)) !== JSON.stringify(a)) bad.push(k + ":同じ日で変わる");
      if (a.join() === prev) same++; prev = a.join();
    }
    const seen = new Set(); for (let d = 0; d < 366; d++) pick(new Date(Date.UTC(2026, 10, 4 + d)).toISOString().slice(0, 10), false).forEach((i) => seen.add(i));
    return { bad: bad.slice(0, 3), n: bad.length, same, seen: seen.size, all: CONS.length };
  });
  check("3年分の毎日で、今夜の3星座は見ごろの星座から3つ・上級は別の3つ・同じ日ならだれでも同じ", y.n === 0, y.bad.join(" | "));
  check("前の日と同じ3星座がほとんど続かない（3年で20日以下）", y.same <= 20, `${y.same}日`);
  check("1年で全部の星座が今夜の3星座に出てくる", y.seen === y.all, `${y.seen}/${y.all}`);
  const m11 = await page.evaluate(() => { const { inSeason, CONS } = window.__sz; return inSeason("2026-11-04").map((i) => CONS[i].id); });
  check("11月の夜の見ごろに秋の四辺形・カシオペヤ座が入り、さそり座・しし座は入らない（季節が本物どおり）", m11.includes("Peg") && m11.includes("Cas") && !m11.includes("Sco") && !m11.includes("Leo"), m11.join(","));
  const m2 = await page.evaluate(() => { const { inSeason, CONS } = window.__sz; return inSeason("2027-02-01").map((i) => CONS[i].id); });
  check("2月の夜の見ごろにオリオン座・おおいぬ座", m2.includes("Ori") && m2.includes("CMa"), m2.join(","));

  check("はじめて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await page.click("#howto-ok");
  check("遊ぶ前の画面に Ko-fi のひとことが無い", (await page.locator(".kofi").count()) === 0);
  check("感想を送るリンクがある", (await page.getAttribute("#f-fb", "href")) === "https://github.com/satou-aaaaa/seiza-tsunagi/issues/new?template=feedback.yml");
  await page.click("#go-d");
  let s = await st(page);
  check("見本（線の形）が出る", (await page.locator("#guide svg line").count()) === s.C.lines.length);
  // 押して選ぶ→2つ目を押して線
  const [a, b] = s.C.lines[0];
  let pa = await center(page, a), pb = await center(page, b);
  await page.mouse.click(...pa); await page.mouse.click(...pb);
  s = await st(page);
  check("2つの星を順に押すと線が引ける", s.drawn.length === 1 && (await page.locator("#lines .cl").count()) === 1);
  // まちがった線
  const notLine = await page.evaluate(() => { const { C } = window.__sz.state(), k = new Set(C.lines.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); for (let i = 0; i < C.pts.length; i++) for (let j = i + 1; j < C.pts.length; j++) if (!k.has(i + "-" + j)) return [i, j]; });
  await page.mouse.click(...(await center(page, notLine[0]))); await page.mouse.click(...(await center(page, notLine[1])));
  s = await st(page);
  check("星座の線でない2つを結ぶとまちがい1回・線は残らない", s.miss === 1 && s.drawn.length === 1);
  // なぞる：残りの線を、つながった順にドラッグで
  const rest = s.C.lines.slice(1);
  for (const [x, z] of rest) {
    const p1 = await center(page, x), p2 = await center(page, z);
    await page.mouse.move(...p1); await page.mouse.down();
    for (let t = 1; t <= 6; t++) await page.mouse.move(p1[0] + (p2[0] - p1[0]) * t / 6, p1[1] + (p2[1] - p1[1]) * t / 6);
    await page.mouse.up();
  }
  s = await st(page);
  check("星から星へすべらせて離すと線（途中の星をかすめても線にしない）・全部引くと完成（まちがい1回で★2）", s.finished && (await page.locator(".verdict .stars .off").textContent()).length === 1, `${s.drawn.length}/${s.C.lines.length} miss${s.miss}`);
  check("完成すると名前のある星の名前が出る（デネブ・ベガなど）", (await page.locator("#marks .nm").count()) >= (s.C.pts.slice(0, s.C.main).filter((p) => p[4]).length) );
  check("見ごろの月と方角が出る", /見ごろ：\d+月の夜9時ごろ/.test(await page.textContent(".verdict")));
  await page.click("#next");
  // ヒント
  await page.click("#hint");
  check("ヒントで2つの星が光る", (await page.locator(".hl").count()) === 2);
  // 読み込み直すと2つ目から（1つ目の結果は残る）
  await page.reload(); await page.click("#go-d");
  check("途中で閉じても続きから（2つ目）", (await page.textContent("header")).includes("2/3"));
  await page.click("#back"); await page.click("#go-p"); await page.click("#back"); await page.click("#go-d");
  check("練習を始めても、今夜の途中経過は消えない（2つ目から）", (await page.textContent("header")).includes("2/3") && (await page.evaluate(() => window.__sz.mode())) === "d");
  { // 別のタブで2つ目を先に終えていたら、古い画面の完成は足さず3つ目を出し直す
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("seiza-v1")); s.runs.d.res.push(0); localStorage.setItem("seiza-v1", JSON.stringify(s)); });
    const L = (await st(page)).C.lines; for (const l of L) await page.evaluate((l) => window.__sz.connect(...l), l);
    check("古いタブで完成しても記録に足さず、今の星座（3つ目）を出し直す", (await page.evaluate(() => window.__sz.load().runs.d.res.length)) === 2 && (await page.textContent("header")).includes("3/3") && (await page.locator(".verdict").count()) === 0);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("seiza-v1")); s.runs.d.res.pop(); localStorage.setItem("seiza-v1", JSON.stringify(s)); }); await page.reload(); await page.click("#go-d"); }
  for (let r = 0; r < 2; r++) { const L = (await st(page)).C.lines; for (const l of L) await page.evaluate((l) => window.__sz.connect(...l), l); await page.click("#next"); }
  const share = await page.textContent(".share");
  check("3星座で結果・シェアの文は番号と星だけ（星座名は出さない）", /星座つなぎ #\d+/.test(share) && (share.match(/[★☆]/g) || []).length === 9 && !(await page.evaluate(() => window.__sz.CONS.some((c) => document.querySelector(".share").textContent.includes(c.n)))));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("まちがいのあった日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  check("ホームで連続1夜・今日の結果を見るに変わる", (await page.textContent(".stats")).includes("1連続の夜") && (await page.textContent("#go-d")).includes("今日の結果"));
  // 上級：見本なし・まちがいなしなら Ko-fi
  await page.click("#go-h");
  check("上級は見本の形が出ない", (await page.locator("#guide svg").count()) === 0 && (await page.textContent("#guide")).includes("見本なし"));
  for (let r = 0; r < 3; r++) { const L = (await st(page)).C.lines; for (const l of L) await page.evaluate((l) => window.__sz.connect(...l), l); await page.click("#next"); }
  check("まちがいなしで初めて上級を終えると、結果の下に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1);
  await page.click("#go-dex");
  const n = await page.evaluate(() => Object.keys(window.__sz.load().dex).length);
  check("星座帳に今日と上級の6星座が載る", n === 6 && (await page.locator(".dex button svg").count()) === 6, `${n}`);
  await page.locator(".dex button:has(svg)").first().click();
  check("星座帳の星座を押すとその星座だけ練習", (await page.textContent("header")).includes("1/1"));
  const days = await page.evaluate(() => Object.keys(window.__sz.load().days).length);
  const L = (await st(page)).C.lines; for (const l of L) await page.evaluate((l) => window.__sz.connect(...l), l); await page.click("#next");
  check("練習は記録の夜を増やさず、シェアと Ko-fi を出さない", (await page.evaluate(() => Object.keys(window.__sz.load().days).length)) === days && (await page.locator(".kofi, #share").count()) === 0);
  await page.close();

  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) }));
    const hit = await p3.evaluate(() => { const svg = document.getElementById("svg"); return svg.getBoundingClientRect().width / 1000 * 62 * 2; });
    check(`幅${w}px：横にはみ出さず、押せる所は高さ44px以上・星の押せる広さ${w === 320 ? "35" : "40"}px以上`, homeOk && !r.over && r.small.length === 0 && hit >= (w === 320 ? 35 : 40), `${r.small.join(",")} 星${hit.toFixed(0)}px`);
    await p3.close();
  }
} finally {
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

const ng = results.filter((r) => !r.ok);
const md = `# 星座つなぎ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
