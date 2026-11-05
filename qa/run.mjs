// 星座つなぎの検査。星のデータ（本物の向き・線の星）・今夜の3星座の選び方（何年分）・なぞる/押す・まちがい・ヒント・続きから・上級・星座帳・スマホ幅・PWA を確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href; // # などを含むフォルダ名でも開ける
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
check("終えた回を消すのは同じ回のときだけ・0時を過ぎたホームの「今日」のボタンは描き直す（2026-11-04 CodeRabbit）", /c\.date === run\.date && c\.id === run\.id\) s2\.runs\[MODE\] = null/.test(html) && /\$\("go-d"\)\.onclick = \(\) => \(k !== todayKey\(\) \? home\(\)/.test(html));
check("別のタブで今日の分を終えたあと、古い画面から今日・上級をもう一度始めない（2026-11-04 CodeRabbit）", /\(mode === "d" && s\.days\[k\]\) \|\| \(mode === "h" && s\.hdays\[k\]\)\) return;/.test(html));
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む。2026-11-04）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの星座選びだけ（今夜の3星座・上級は日付の乱数）", (html.match(/Math\.random/g) || []).length === 2);
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/seiza-tsunagi/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（「感想」の2字だと GitHub がフォームを出さず白紙の Issue になる。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3 && /^description:\s*\S/m.test(fy), (fy.match(/^name:.*$/m) || [""])[0]);
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：ネットの返事の保存は、イベントの中で waitUntil に預ける（遅れて届いた新しい版も保存できる）", /e\.waitUntil\(Promise\.race\(\[net\.then[^\n]*Promise\.race\(\[caches\.open[^\n]*wait\(15000\)\]\); \}, \(\) => \{\}\)\.catch\(\(\) => \{\}\), wait\(60000\)\]\)\);/.test(sw) && !/\.then\([^\n]*e\.waitUntil/.test(sw));
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
  check("つないだ線は星から星へ伸び（pathLength）、両はしの星に輪がともる", (await page.locator('#lines .cl.new[pathLength="1"]').count()) === 1 && (await page.locator("#lit .lit").count()) === 2);
  check("見本も、引いた線は金・まだの線は灰色になる（残りの線が分かる）", (await page.locator('#guide line[stroke="#f2c76b"]').count()) === 1 && (await page.locator('#guide line[stroke="#6f7aa3"]').count()) === s.C.lines.length - 1);
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
  check("完成すると星座の星が順に光り（星の数だけ）、夜空のふちが金になる", (await page.locator("#lit .pop").count()) === s.C.main && (await page.locator("#sky.won").count()) === 1 && (await page.locator("#lit .lit").count()) === s.C.main);
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
  check("新しく取れた実績が結果の画面に1行だけ出る（はじめての★3）", (await page.locator(".ach-new").count()) === 1 && (await page.textContent(".ach-new")).includes("はじめての★3"));
  check("3星座で結果・シェアの文は番号と星だけ（星座名は出さない）", /星座つなぎ #\d+/.test(share) && (share.match(/[★☆]/g) || []).length === 9 && !(await page.evaluate(() => window.__sz.CONS.some((c) => document.querySelector(".share").textContent.includes(c.n)))));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("まちがいのあった日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  check("今夜の3星座の結果に「続けて遊ぶ：とことん」の大きなボタン", (await page.locator("#go-e.main").count()) === 1);
  await page.click("#back");
  check("ホームで連続1夜・今日の結果を見るに変わる", (await page.textContent(".stats")).includes("1連続の夜") && (await page.textContent("#go-d")).includes("今日の結果"));
  // 上級：見本なし・まちがいなしなら Ko-fi
  await page.click("#go-h");
  check("上級は見本の形が出ない", (await page.locator("#guide svg").count()) === 0 && (await page.textContent("#guide")).includes("見本なし"));
  for (let r = 0; r < 3; r++) { const L = (await st(page)).C.lines; for (const l of L) await page.evaluate((l) => window.__sz.connect(...l), l); await page.click("#next"); }
  check("まちがいなしで初めて上級を終えると、結果の下に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1);
  check("実績は1度だけ知らせる（上級の結果には上級の実績だけ・はじめての★3は出ない）", (await page.locator(".ach-new").count()) === 1 && (await page.textContent(".ach-new")).includes("見本なしデビュー") && !(await page.textContent(".ach-new")).includes("はじめての★3"));
  await page.click("#go-dex");
  const n = await page.evaluate(() => Object.keys(window.__sz.load().dex).length);
  check("星座帳に今日と上級の6星座が載る", n === 6 && (await page.locator(".dex button svg").count()) === 6, `${n}`);
  await page.locator(".dex button:has(svg)").first().click();
  check("星座帳の星座を押すとその星座だけ練習", (await page.textContent("header")).includes("1/1"));
  const days = await page.evaluate(() => Object.keys(window.__sz.load().days).length);
  const L = (await st(page)).C.lines; for (const l of L) await page.evaluate((l) => window.__sz.connect(...l), l); await page.click("#next");
  check("練習は記録の夜を増やさず、シェアと Ko-fi を出さない", (await page.evaluate(() => Object.keys(window.__sz.load().days).length)) === days && (await page.locator(".kofi, #share").count()) === 0);
  await page.close();

  { // とことん：次々に出る・線の少ない星座から多い星座へ・2周目は見本なし・まちがいとヒントで🎫を使う・降りると自己ベスト（2026-11-05 satou さん「一日で遊べる量が少なすぎる」）
    const pe = await newPage(); await pe.click("#howto-ok");
    const L = await pe.evaluate(() => { const g = window.__sz, n = g.CONS.length; for (let r = 0; r < 500; r++) { const L = g.endlessList(); if (L.length !== n * 2) return "長さ" + L.length; for (const lap of [L.slice(0, n), L.slice(n)]) { if (new Set(lap).size !== n) return "同じ星座が同じ周に2度"; const t = lap.map((i) => g.ETIER(g.CONS[i])); if (t.some((x, i) => i && x < t[i - 1])) return "難しさが下がる"; } } const a = g.endlessList().join(), b = g.endlessList().join(); return a === b ? "毎回同じ並び" : "ok"; });
    check("とことんの並び（500回）：全部の星座を線の少ない順の組から1回ずつ・2周目は見本なし・毎回ちがう並び", L === "ok", L);
    check("ホームに「とことん」の大きなボタン", (await pe.locator("#go-e.main").count()) === 1);
    await pe.click("#go-e");
    for (let r = 0; r < 2; r++) { const L = (await st(pe)).C.lines; for (const l of L) await pe.evaluate((l) => window.__sz.connect(...l), l); await pe.click("#next"); }
    check("とことんは何つ目かを出し、🎫が3枚", (await pe.textContent("header")).includes("3つ目") && (await pe.evaluate(() => window.__sz.load().runs.e.life)) === 3 && (await pe.locator("#guide svg").count()) === 1);
    const bad = await pe.evaluate(() => { const { C } = window.__sz.state(), k = new Set(C.lines.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); for (let i = 0; i < C.pts.length; i++) for (let j = i + 1; j < C.pts.length; j++) if (!k.has(i + "-" + j)) return [i, j]; });
    await pe.evaluate((b) => window.__sz.connect(...b), bad);
    check("とことんのまちがいは🎫を1枚使う", (await pe.evaluate(() => window.__sz.load().runs.e.life)) === 2);
    await pe.click("#hint");
    check("とことんのヒントも🎫を1枚使う", (await pe.evaluate(() => window.__sz.load().runs.e.life)) === 1 && (await pe.locator(".hl").count()) === 2 && (await pe.textContent("#life")).startsWith("🎫"));
    await pe.reload(); await pe.click("#go-e");
    check("とことんは途中で閉じても続きから（3つ目・🎫1のまま）", (await pe.textContent("header")).includes("3つ目") && (await pe.evaluate(() => window.__sz.load().runs.e.life)) === 1);
    await pe.click("#quit");
    check("降りるとつないだ数と自己ベスト更新が出て、記録に残る（今日の記録・連続には入らない）", (await pe.textContent("#eres")).includes("2星座") && (await pe.textContent("#ebest")).includes("自己ベスト更新") && (await pe.evaluate(() => { const s = window.__sz.load(); return s.ebest === 2 && !s.runs.e && Object.keys(s.days).length === 0 && Object.keys(s.dex).length >= 2; })));
    check("とことんの終わりにシェア・Ko-fi を出さない", (await pe.locator("#share, .kofi").count()) === 0);
    await pe.click("#go-e"); await pe.click("#quit");
    check("ベストに届かないと、ベストと「あと何で更新」を出し、ベストは下げない", (await pe.textContent("#ebest")).includes("あと3で更新") && (await pe.evaluate(() => window.__sz.load().ebest)) === 2);
    await pe.click("#back");
    check("ホームのとことんのボタンに自己ベスト", (await pe.textContent("#go-e")).includes("自己ベスト 2"));
    await pe.click("#go-e");
    await pe.evaluate(() => { const g = window.__sz, s = JSON.parse(localStorage.getItem("seiza-v1")); s.runs.e.res = Array(g.CONS.length).fill(0); s.runs.e.life = 0; localStorage.setItem("seiza-v1", JSON.stringify(s)); }); await pe.click("#back"); await pe.click("#go-e");
    check("とことんの2周目は見本なし", (await pe.textContent("header")).includes("見本なし") && (await pe.locator("#guide svg").count()) === 0);
    check("🎫が無いとヒントは押せない", await pe.locator("#hint").isDisabled());
    const bad2 = await pe.evaluate(() => { const { C } = window.__sz.state(), k = new Set(C.lines.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); for (let i = 0; i < C.pts.length; i++) for (let j = i + 1; j < C.pts.length; j++) if (!k.has(i + "-" + j)) return [i, j]; });
    await pe.evaluate((b) => window.__sz.connect(...b), bad2);
    const n = await pe.evaluate(() => window.__sz.CONS.length);
    check("🎫が無いときにまちがえると終わり、そこまでの数が自己ベストになる", (await pe.locator("#eout").count()) === 1 && (await pe.textContent("#eres")).includes(`${n}星座`) && (await pe.evaluate(() => window.__sz.load().ebest)) === n);
    await pe.close(); }
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); const fb2 = await p3.evaluate(() => { const a = document.querySelector("#howto #fb2"); return a ? a.getBoundingClientRect().height : 0; }); check(`幅${w}px：遊び方の「感想を送る」も高さ44px以上`, fb2 >= 44, `${fb2}px`); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) }));
    const hit = await p3.evaluate(() => { const svg = document.getElementById("svg"); return svg.getBoundingClientRect().width / 1000 * 62 * 2; });
    check(`幅${w}px：横にはみ出さず、押せる所は高さ44px以上・星の押せる広さ${w === 320 ? "35" : "40"}px以上`, homeOk && !r.over && r.small.length === 0 && hit >= (w === 320 ? 35 : 40), `${r.small.join(",")} 星${hit.toFixed(0)}px`);
    await p3.close();
  }
  { // 保存できないブラウザでも遊べる（開いているあいだは途中経過を覚えている）
    const pb = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pb.on("pageerror", (e) => errors.push(e.message));
    await pb.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await pb.goto(url); await pb.click("#howto-ok"); await pb.click("#go-d");
    check("保存できないブラウザでも、今日の1問目が始まる", (await pb.textContent("header")).includes("1/3"));
    await pb.click("#back");
    check("保存できないブラウザでも、遊び方が何度も開かない", !(await pb.locator("#howto[open]").count()));
    await pb.close(); }
  { // 前の記録が残っていて、書き込みだけ失敗する（容量いっぱいなど）ときも、メモリの新しい進み具合を使う
    const pq = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pq.on("pageerror", (e) => errors.push(e.message));
    await pq.addInitScript(() => { const orig = Storage.prototype.setItem; orig.call(localStorage, "seiza-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, kofi: {}, runs: {} })); Storage.prototype.setItem = () => { throw new Error("full"); }; });
    await pq.goto(url); await pq.click("#go-d");
    check("前の記録があり書き込みだけ失敗しても、今日の1問目が始まる", (await pq.textContent("header")).includes("1/3"));
    await pq.close(); }
  { // 最後の1問を終えて「結果を見る」を押す前に閉じた日は、開き直すと結果へ進み記録がつく
    const pc = await newPage();
    await pc.evaluate(() => { const g = window.__sz, k = g.todayKey(); localStorage.setItem("seiza-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, cnt: 0, clean: 0, kofi: {}, runs: { d: { mode: "d", date: k, list: g.pick(k, false), res: [0, 0, 0] } } })); });
    await pc.reload();
    check("最後の1問のあと閉じても、開き直すと結果へ進み今日の記録がつく", await pc.evaluate(() => { const g = window.__sz; return !!g.load().days[g.todayKey()] && !g.load().runs.d; }));
    await pc.close(); }
  { // 0時の前に最後の1問を終えて閉じ、翌日に開いても、終えた日の記録として残る
    { // 今日の結果を開いたまま0時を過ぎてから「上級」を押しても、翌日の上級は始めない
    const pm = await newPage();
    await pm.evaluate(() => { const g = window.__sz, k = new Date(Date.parse(g.todayKey())).toISOString().slice(0, 10); localStorage.setItem("seiza-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, cnt: 0, clean: 0, kofi: {}, runs: { d: { mode: "d", date: k, list: g.pick(k, false), res: [0, 0, 0] } } })); });
    await pm.reload();
    const had = await pm.locator("#go-h").count();
    await pm.evaluate(() => { const RD = Date, off = 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; }); // 時計を1日進める
    if (had) await pm.click("#go-h");
    check("結果を開いたまま日付が変わったら、上級のボタンを押しても翌日の上級は始まらない", had > 0 && (await pm.evaluate(() => window.__sz.mode())) !== "h");
    await pm.close(); }
    const pn = await newPage();
    await pn.evaluate(() => { const g = window.__sz, k = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10); localStorage.setItem("seiza-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, cnt: 0, clean: 0, kofi: {}, runs: { d: { mode: "d", date: k, list: g.pick(k, false), res: [0, 0, 0] } } })); });
    await pn.reload();
    check("前の日に終えて閉じても、翌日に開くとその日の記録がつく", await pn.evaluate(() => { const g = window.__sz; return !!g.load().days[new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10)] && !g.load().runs.d; }));
    check("前の日の結果の画面からは、今日の上級を始められない（今日の分を先に）", !(await pn.locator("#go-h").count()));
    check("保存に失敗したあと別のタブが新しく保存していたら、古いメモリで上書きせずそちらを読む", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 1, tagA: 1 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 2, tagB: 1 }))); const r = g.load(); mem = null; return !!r.tagB && !r.tagA; }, "seiza-v1"));
    check("保存に失敗したあと別のタブが保存しても、両方の記録（日ごとの結果）を残す", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": s0.days[Object.keys(s0.days)[0]] || 1 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": 1 } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"]; }, "seiza-v1"));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0 }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: Object.assign({}, s0.runs, { d: Object.assign({}, base) }) })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: Object.assign({}, s0.runs, { d: Object.assign({}, base, { res: [{}, {}], i: 2 }) }) }))); const r = g.load(); mem = null; return r.runs.d.res.length === 2 && r.runs.d.i === 2; }, "seiza-v1"));
    check("保存に失敗したタブにだけある途中経過は、別のタブが保存しても消さない（その日を終えた記録があれば null を使う・終えた回は日ごとの結果に残す）", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (a, b, dd) => { mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: a })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: b }, dd ? { days: Object.assign({}, s0.days, dd) } : {}))); const r = g.load(); mem = null; return r; }; const r1 = put({ d: base }, {}), r2 = put({ d: base }, { d: null }, { "2000-01-01": 1 }), r3 = put({ d: base }, { d: null }), r4 = put({ d: done }, { d: null }); return !!r1.runs.d && r1.runs.d.date === "2000-01-01" && r2.runs.d === null && !!r3.runs.d && r3.runs.d.date === "2000-01-01" && r4.runs.d === null && !!r4.days["2000-01-01"]; }, "seiza-v1"));
    check("同じ進み具合なら、新しく保存したほうの途中経過を使う", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (ta, tb) => { mem = JSON.stringify(Object.assign({}, s0, { t: ta, runs: { d: Object.assign({}, base, { zz: "a" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: tb, runs: { d: Object.assign({}, base, { zz: "b" }) } }))); const r = g.load(); mem = null; return r.runs.d.zz; }; return put(9, 5) === "a" && put(5, 9) === "b"; }, "seiza-v1"));
    check("結果を見る前に別のタブが次の日を保存しても、終えた日の記録を残す", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: done } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { date: "2000-01-02" }) } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && r.runs.d.date === "2000-01-02"; }, "seiza-v1"));
    check("同じ問題の練習をやり直したら、前の回（終えたもの）と取り違えず新しい回を使う", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(), base = { mode: "p", date: "2000-01-01", list: [1], tags: [1], res: [], i: 0, hints: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 9, runs: { p: Object.assign({}, base, { id: "new" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, runs: { p: Object.assign({}, base, { id: "old", res: [{}], i: 1 }) } }))); const r = g.load(); mem = null; return r.runs.p.id === "new"; }, "seiza-v1"));
    check("保存に失敗したあと別のタブが保存しても、帳の★は高いほうを残す", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, dex: { zz: 3 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, dex: { zz: 1 } }))); const r = g.load(); mem = null; return r.dex.zz === 3; }, "seiza-v1"));
    check("保存に失敗したあと、新しい側が古い形（pdays・ach が無い）でも、もう一方のあとからの記録・実績の印を落とさない（2026-11-04 CodeRabbit）", await pn.evaluate((K) => { const g = window.__sz, s0 = g.load(), strip = (o) => { const c = Object.assign({}, o); delete c.pdays; delete c.ach; delete c.apark; return c; }; mem = JSON.stringify(strip(Object.assign({}, s0, { t: 99 }))); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, pdays: { "2000-01-01": { m: [0, 0, 0] } }, ach: { s1: 1 } }))); const r1 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 1, pdays: { "2000-01-02": { m: [0, 0, 0] } }, ach: { h1: 1 } })); localStorage.setItem(K, JSON.stringify(strip(Object.assign({}, s0, { t: 99 })))); const r2 = g.load(); mem = null; return !!r1.pdays["2000-01-01"] && r1.ach.s1 === 1 && !!r2.pdays["2000-01-02"] && r2.ach.h1 === 1; }, "seiza-v1"));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pn.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, "seiza-v1"));
    await pn.close(); }
  { // 実績の数え方（いまの記録から毎回数える）
    const pa = await newPage();
    const a = await pa.evaluate(() => {
      const g = window.__sz, base = () => ({ v: 1, days: {}, hdays: {}, pdays: {}, dex: {}, runs: {}, ach: {}, kofi: {} }), by = (s) => Object.fromEntries(g.achOf(s).map((x) => [x.id, x]));
      const day = (i) => new Date(Date.UTC(2026, 10, 4 + i)).toISOString().slice(0, 10);
      const e = by(base());
      const s1 = base(); for (let i = 0; i < 7; i++) s1.days[day(i)] = { m: [0, 0, 0] }; s1.days[day(9)] = { m: [1, 0, 0] }; s1.pdays[day(20)] = { m: [0, 0, 2] };
      g.CONS.slice(0, 10).forEach((c) => (s1.dex[c.id] = 3)); s1.dex[g.CONS[10].id] = 1;
      const s2 = base(); for (const i of [0, 1, 2, 4, 5, 6, 7]) s2.days[day(i)] = { m: [0, 0, 0] }; for (let i = 8; i < 12; i++) s2.pdays[day(i)] = { m: [0, 0, 0] }; s2.days["x"] = 1; s2.hdays[day(1)] = { m: [0, 2, 0] };
      const f1 = by(s1), f2 = by(s2), ids = g.ACH.map((x) => x[0]);
      return { n: g.ACH.length, uniq: new Set(ids).size === ids.length, none: Object.values(e).every((x) => !x.got && x.n === 0 && x.g >= 1), f1, f2, ms: [g.maxStreak(s1.days), g.maxStreak(s2.days), g.maxStreak({})] };
    });
    check("実績は10〜14個・名前が重ならない・記録が無ければどれも未達成で 0/目標", a.n >= 10 && a.n <= 14 && a.uniq && a.none, `${a.n}`);
    check("実績は腕前（★3・まちがいなし・上級）・集める（星座帳）・続ける（夜の数）を数える", a.f1.s1.got && a.f1.s10.got && !a.f1.sAll.got && a.f1.sAll.n === 10 && a.f1.clear.got && !a.f1.h1.got && a.f1.d5.got && a.f1.dHalf.got && a.f1.dAll.n === 11 && a.f1.n3.got && a.f1.n10.n === 9 && a.f1.st7.got && a.f2.h1.got && !a.f2.hc.got);
    check("7夜つづけては今夜の3星座の連続だけ（休んだ日・あとから遊んだ日では続かない）・夜の数はあとからも数える", a.ms.join() === "7,4,0" && !a.f2.st7.got && a.f2.st7.n === 4 && a.f2.n10.got && a.f2.n30.n === 11, a.ms.join());
    check("まだの実績は「いま/目標」で、目標を超えない", a.f1.n30.n === 9 && a.f1.n30.g === 30 && a.f1.s1.n === 1);
    await pa.close(); }
  // カレンダーと、取りこぼした夜をあとから遊ぶ（時計を 2026-12-03 にする）
  async function clockPage(w, iso, seed) {
    const p = await browser.newPage({ viewport: { width: w, height: 760 } });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
    await p.addInitScript((iso) => { const RD = Date, off = RD.parse(iso) - RD.now(); window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; }, iso);
    await p.goto(url); await p.evaluate((seed) => localStorage.setItem("seiza-v1", JSON.stringify(Object.assign({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, runs: {}, kofi: {} }, seed))), seed); await p.reload();
    return p;
  }
  { const seed = { days: { "2026-11-04": { m: [0, 0, 0] }, "2026-11-20": { m: [3, 3, 4] }, "2026-12-01": { m: [0, 1, 0] }, "2026-12-02": { m: [0, 0, 0] } }, hdays: { "2026-12-02": { m: [0, 0, 0] } }, pdays: { "2026-11-28": { m: [0, 1, 0] } } };
    const pc = await clockPage(390, "2026-12-03T03:00:00Z", seed);
    check("ホームのカレンダーに、取りこぼした夜の数（↺4）が出る", (await pc.textContent("#go-cal")).includes("↺4"));
    await pc.click("#go-cal");
    const c1 = await pc.evaluate(() => ({ on: [...document.querySelectorAll(".cal .d.on")].map((e) => e.dataset.k), can: [...document.querySelectorAll(".cal button.d.can")].map((e) => e.dataset.k), h: document.querySelectorAll(".cal .d .h").length, st: (document.getElementById("cal-st") || {}).textContent || "", today: document.querySelectorAll(".cal .d.today").length, next: document.getElementById("cal-next").disabled }));
    check("カレンダー：今月の遊んだ日に★の合計の印・上級の点・今日の枠・連続2夜", c1.on.join() === "2026-12-01,2026-12-02" && c1.h === 1 && c1.today === 1 && c1.st.includes("2夜") && c1.next, JSON.stringify(c1));
    await pc.click("#cal-prev");
    const c2 = await pc.evaluate(() => ({ head: document.querySelector(".calnav b").textContent, on: [...document.querySelectorAll(".cal .d.on")].map((e) => e.dataset.k), later: [...document.querySelectorAll(".cal .d.later")].map((e) => e.dataset.k), can: [...document.querySelectorAll(".cal button.d.can")].map((e) => e.dataset.k), prev: document.getElementById("cal-prev").disabled, n20: document.querySelector('.cal [data-k="2026-11-20"]').textContent }));
    check("カレンダー：前の月へ戻れる・あとから遊んだ日は別の印（点線）・取りこぼした夜（7日以内）だけ押せる・始めた月より前へは戻らない", c2.head === "2026年11月" && c2.on.join() === "2026-11-04,2026-11-20" && c2.later.join() === "2026-11-28" && c2.can.sort().join() === "2026-11-26,2026-11-27,2026-11-29,2026-11-30" && c2.prev && c2.n20.includes("★3"), JSON.stringify(c2));
    // あとから遊ぶ前に、今日の途中経過を作っておく（あとからで消さない）
    await pc.click("#back"); await pc.click("#go-d"); await pc.click("#back");
    const before = await pc.evaluate(() => { const g = window.__sz, s = g.load(); return { days: Object.keys(s.days).length, st: g.streak(s.days), rd: JSON.stringify(s.runs.d), dex: Object.keys(s.dex).length }; });
    await pc.click("#go-cal"); await pc.click('.misses button[data-k="2026-11-29"]');
    const run = await pc.evaluate(() => { const g = window.__sz; return { list: g.load().runs.a.list, want: g.pick("2026-11-29", false), head: document.querySelector("header").textContent }; });
    check("取りこぼした夜は、その日付の種で今夜の3星座と同じ3つが出る", JSON.stringify(run.list) === JSON.stringify(run.want) && run.head.includes("あとから 11/29"), run.head);
    { const L = (await st(pc)).C.lines; for (const l of L) await pc.evaluate((l) => window.__sz.connect(...l), l); await pc.click("#next"); } // 11/29 を1つ目まで
    await pc.click("#back"); await pc.click("#go-cal"); await pc.click('.misses button[data-k="2026-11-27"]');
    const hb = await pc.textContent("header");
    await pc.click("#back"); await pc.click("#go-cal");
    const cont = await pc.textContent('.misses button[data-k="2026-11-29"]');
    await pc.click('.misses button[data-k="2026-11-29"]');
    const back29 = await pc.evaluate(() => { const s = window.__sz.load(); return { head: document.querySelector("header").textContent, park27: !!(s.apark["2026-11-27"] && s.apark["2026-11-27"].date === "2026-11-27"), park29: s.apark["2026-11-29"] }; });
    check("あとから：A日を途中まで→B日を始める→A日に戻ると続きから（別の日を始めても途中経過を消さない・B日は預けておく）", hb.includes("あとから 11/27 1/3") && cont.includes("続き") && back29.head.includes("あとから 11/29 2/3") && back29.park27 && back29.park29 === null, JSON.stringify([hb, cont, back29]));
    for (let r = 0; r < 2; r++) { const L = (await st(pc)).C.lines; for (const l of L) await pc.evaluate((l) => window.__sz.connect(...l), l); await pc.click("#next"); }
    const after = await pc.evaluate(() => { const g = window.__sz, s = g.load(); return { days: Object.keys(s.days).length, st: g.streak(s.days), rd: JSON.stringify(s.runs.d), p: !!s.pdays["2026-11-29"], ra: s.runs.a, dex: Object.keys(s.dex).length, today: !!s.days[g.todayKey()] }; });
    check("あとから遊んだ夜は pdays に残り、今日の記録・連続の夜・今日の途中経過を変えない・星座帳には載る", after.p && after.days === before.days && after.st === before.st && after.rd === before.rd && !after.today && !after.ra && after.dex >= before.dex && after.dex > 0, JSON.stringify(after));
    check("あとから遊んだ結果にはシェア・Ko-fi を出さない", (await pc.locator("#share, .kofi").count()) === 0 && (await pc.textContent("header")).includes("あとから"));
    await pc.click("#go-cal"); await pc.click("#cal-prev");
    check("あとから遊んだ夜はカレンダーで点線の印になり、もう押せない", (await pc.locator('.cal .d.later[data-k="2026-11-29"]').count()) === 1 && (await pc.locator('.misses button[data-k="2026-11-29"]').count()) === 0);
    const out = await pc.evaluate(() => { const g = window.__sz; g.startRun("a", "2026-11-20"); const a = g.load().runs.a; g.startRun("a", "2026-11-25"); const b = g.load().runs.a; g.startRun("a", "2026-12-04"); const c = g.load().runs.a; return [!!a, !!b, !!c, !!document.querySelector(".cal")]; });
    check("遊んだ日・8日より前・明日は、あとからでも始めない（カレンダーに戻る）", out.join() === "false,false,false,true", out.join());
    await pc.close(); }
  { const pz = await clockPage(390, "2026-12-03T03:00:00Z", { days: { "2026-11-20": { m: [0, 0, 0] } } });
    await pz.click("#go-cal");
    check("連続の夜が0のときは、カレンダーに連続の言葉を出さない（休んだ日を責めない）", (await pz.locator("#cal-st").count()) === 0 && !/休|サボ|途切/.test(await pz.textContent("#app")));
    await pz.close(); }
  { // 取りこぼした夜の選び方を600日分：きのう〜7日前・始めた日より後・遊んだ日を除く
    const pm = await newPage();
    const r = await pm.evaluate(() => {
      const g = window.__sz, bad = []; let shown = 0;
      for (let d = 0; d < 600; d++) {
        const k = new Date(Date.UTC(2026, 10, 4 + d)).toISOString().slice(0, 10), s = { days: {}, pdays: {} };
        for (let i = 1; i <= 9; i++) { const x = new Date(Date.parse(k) - i * 864e5).toISOString().slice(0, 10); if ((d * 7 + i * 3) % 5 === 0) s.days[x] = { m: [0, 0, 0] }; else if ((d + i) % 7 === 0) s.pdays[x] = { m: [0, 0, 0] }; }
        const m = g.missed(s, k), want = [];
        for (let i = 1; i <= 7; i++) { const x = new Date(Date.parse(k) - i * 864e5).toISOString().slice(0, 10); if (x >= "2026-11-04" && !s.days[x] && !s.pdays[x]) want.push(x); }
        if (m.join() !== want.join()) bad.push(k);
        for (const x of m) { const a = g.pick(x, false); if (a.length !== 3 || new Set(a).size !== 3 || a.join() !== g.pick(x, false).join()) bad.push(k + ":" + x); }
        shown += m.length;
      }
      return { bad: bad.slice(0, 3), n: bad.length, shown };
    });
    check("600日分で、取りこぼした夜はきのう〜7日前・始めた日より後・遊んだ日を除いたもの（問題は日付どおりで毎回同じ）", r.n === 0 && r.shown > 600, `${r.bad.join(" | ")} 出た数${r.shown}`);
    await pm.close(); }
  for (const w of [320, 390]) { // 実績・カレンダーの画面が狭い幅で崩れない
    const pw = await clockPage(w, "2026-12-03T03:00:00Z", { days: { "2026-12-01": { m: [0, 0, 0] } }, pdays: { "2026-11-29": { m: [1, 0, 0] } } });
    const look = async () => pw.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) }));
    const h = await look(); await pw.click("#go-ach"); const a = await look(); const rows = await pw.locator(".ach").count(); await pw.click("#back"); await pw.click("#go-cal"); const c = await look(); await pw.click("#cal-prev"); const c2 = await look();
    check(`幅${w}px：ホーム・実績・カレンダーが横にはみ出さず、押せる所は高さ44px以上`, [h, a, c, c2].every((x) => !x.over && x.small.length === 0) && rows >= 10, JSON.stringify([h, a, c, c2].map((x) => x.small)));
    await pw.close(); }
  { // 同じ日はどのブラウザでも同じ問題：sort の比較の中で乱数を引かない（引く回数がブラウザで変わる）
    const src = ["index.html", ...["gen.js", "data.js"].filter((f) => existsSync(path.join(root, f)))].map((f) => readFileSync(path.join(root, f), "utf8")).join("\n");
    const bad = src.match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/g) || [];
    check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0, bad.join(" | ")); }
} catch (e) { // 途中で止まっても、ここまでの結果とレポートは書き出す
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  try { // キーボードで選んだボタンに枠が出る（all:unset のカレンダーのます目でも消えない。2026-11-04 CodeRabbit の指摘）。止まっても失敗として記録し、レポートまで進む
    const pf = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pf.goto(url); await pf.evaluate(() => localStorage.clear()); await pf.reload();
    await pf.click("#howto-ok").catch(() => {});
    const bad = [];
    for (const open of [null, "#go-cal"]) {
      if (open) await pf.click(open);
      await pf.keyboard.press("Shift");
      bad.push(...await pf.evaluate(() => {
        const cal = document.querySelector(".cal");
        if (cal) { const b = document.createElement("button"); b.className = (cal.querySelector("button") || cal.lastElementChild).className + " miss"; b.textContent = "1"; cal.append(b); }
        return [...document.querySelectorAll("button:not([disabled]),a[href]")].filter((b) => b.checkVisibility()).filter((b) => { b.focus(); const cs = getComputedStyle(b); return !b.matches(":focus-visible") || cs.outlineStyle === "none" || parseFloat(cs.outlineWidth) < 2; }).map((b) => b.className || b.id || b.tagName);
      }));
    }
    check("キーボードで選んだボタン（カレンダーのあとから遊ぶ日も）に枠が出る", bad.length === 0, bad.join(","));
    await pf.close();
  } catch (e) { check("キーボードで選んだボタン（カレンダーのあとから遊ぶ日も）に枠が出る", false, e.message.split("\n")[0]); }
  try { // だれでも遊べるように（shared-workflows routines/game-dev.md A1・A6・A7）：色だけで分けない・キーボードだけで遊べる・知らせを文字で
    const pk = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pk.on("pageerror", (e) => errors.push(e.message));
    await pk.goto(url); await pk.evaluate(() => localStorage.clear()); await pk.reload();
    await pk.click("#howto-ok"); await pk.click("#go-d");
    const C = (await st(pk)).C, live = () => pk.textContent("#live");
    const order = await pk.evaluate(() => [...document.querySelectorAll("#svg g.st")].map((g) => +g.dataset.i));
    check("夜空の星はどれも role=button・tabindex・名前（場所と明るさ）を持つ", order.length === C.pts.length && await pk.evaluate(() => [...document.querySelectorAll("#svg g.st")].every((g) => g.getAttribute("role") === "button" && g.tabIndex === 0 && /^星\d+・/.test(g.getAttribute("aria-label")))));
    check("星のキーボードの順は上から下の順で、星座の星（先頭 main 個）が先に並ばない", order.slice(0, C.main).some((i) => i >= C.main) && new Set(order).size === C.pts.length, order.slice(0, C.main).join(","));
    check("星の名前に星座の星の名前（ベテルギウスなど）を出さない", await pk.evaluate(() => { const { C } = window.__sz.state(); return [...document.querySelectorAll("#svg g.st")].every((g) => !C.pts.some((p) => p[4] && g.getAttribute("aria-label").includes(p[4]))); }));
    // キーボードだけで1本引く：Tab で星へ、Enter で選ぶ → 2つ目へ focus して Enter
    const [a, b] = C.lines[0];
    await pk.focus(`#s${a}`); await pk.keyboard.press("Enter"); await pk.waitForTimeout(80);
    check("Enter で星を選ぶと、名前に「選んでいる」が付き、知らせに出る", (await pk.getAttribute(`#s${a}`, "aria-label")).includes("選んでいる") && (await pk.getAttribute(`#s${a}`, "aria-pressed")) === "true" && (await live()).includes("選びました"));
    await pk.focus(`#s${b}`); await pk.keyboard.press(" ");
    let s = await st(pk);
    check("キーボード（Enter・スペース）だけで線が引ける（なぞらなくても遊べる。WCAG 2.1.1・2.5.7）", s.drawn.length === 1 && (await pk.getAttribute(`#s${a}`, "aria-label")).includes("線でつないだ"));
    await pk.waitForTimeout(80);
    check("線をつなぐと知らせ（role=status）に文字で出る", /線をつなぎました（1\/\d+）/.test(await live()), await live());
    check("見本のまだの線は点線・引いた線は実線（色だけで分けない。WCAG 1.4.1）", (await pk.locator("#guide line[stroke-dasharray]").count()) === C.lines.length - 1 && (await pk.locator('#guide line[stroke="#f2c76b"]:not([stroke-dasharray])').count()) === 1);
    { const r = await pk.evaluate(() => [...document.querySelectorAll(".dots i")].map((i) => [i.className, i.getBoundingClientRect().height, getComputedStyle(i).borderTopWidth]));
      check("何つ目かの点は形でも分かる（いまの点は高い・まだの点は中が空）", r.length === 3 && r[0][1] > r[1][1] && parseFloat(r[1][2]) >= 1, JSON.stringify(r)); }
    { const k = await pk.focus(`#s${a}`).then(() => pk.keyboard.press("ArrowRight")).then(() => pk.evaluate(() => document.activeElement.closest("g.st") ? +document.activeElement.dataset.i : -1));
      const ok = await pk.evaluate(([a, k]) => { const { C } = window.__sz.state(); return k >= 0 && k !== a && C.pts[k][0] > C.pts[a][0]; }, [a, k]);
      const anyRight = await pk.evaluate((a) => { const { C } = window.__sz.state(); return C.pts.some((q) => q[0] > C.pts[a][0] + 0.001); }, a);
      check("矢印キーで、その向きにある星へ移れる", ok || !anyRight, `${a}→${k}`); }
    // まちがい：文字と破線でも分かる
    const notLine = await pk.evaluate(() => { const { C } = window.__sz.state(), k = new Set(C.lines.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); for (let i = 0; i < C.pts.length; i++) for (let j = i + 1; j < C.pts.length; j++) if (!k.has(i + "-" + j)) return [i, j]; });
    await pk.focus(`#s${notLine[0]}`); await pk.keyboard.press("Enter"); await pk.focus(`#s${notLine[1]}`); await pk.keyboard.press("Enter");
    await pk.waitForTimeout(80);
    const badDash = await pk.evaluate(() => { const l = document.querySelector("#lines .bad"); return l ? getComputedStyle(l).strokeDasharray : ""; });
    check("まちがいは赤い色だけでなく、破線と ✕ の文字でも知らせる（role=status にも）", (await st(pk)).miss === 1 && badDash && badDash !== "none" && (await live()).includes("✕") && (await pk.locator(".toast").first().textContent()).includes("✕"), badDash);
    await pk.click("#hint"); await pk.waitForTimeout(80);
    const hlDash = await pk.evaluate(() => getComputedStyle(document.querySelector(".hl")).strokeDasharray);
    check("ヒントの輪は破線（選んだ星の実線の輪と形で分かる）・どの星かを読み上げにも出す", hlDash !== "none" && (await pk.locator('#svg g.st[aria-label*="ヒントの星"]').count()) === 2 && /ヒント：.*星\d+と星\d+/.test(await live()), hlDash);
    for (const l of C.lines) await pk.evaluate((l) => window.__sz.connect(...l), l);
    await pk.waitForTimeout(80);
    check("完成の知らせ（星座の名前・星の数）が role=status に文字で出る", (await live()).includes(C.n) && /星\dつ/.test(await live()), await live());
    check("取れなかった星は ☆（色の薄さだけで分けない）", /☆/.test(await pk.textContent(".verdict .stars .off")) && !/★/.test(await pk.textContent(".verdict .stars .off")));
    check("問題（星座の名前と見ごろ）に読み上げの印 data-a11y-say", (await pk.locator(".cname [data-a11y-say]").count()) === 1);
    // 動きを減らす：振動しない・すべるスクロールにしない
    await pk.evaluate(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; localStorage.setItem("a11y-v1", JSON.stringify({ calm: true })); });
    await pk.reload(); await pk.click("#go-d").catch(() => {});
    if (await pk.locator("#next").count()) await pk.click("#next");
    await pk.evaluate(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; });
    const C2 = (await st(pk)).C; await pk.evaluate((l) => window.__sz.connect(...l), C2.lines[0]);
    check("「動きを減らす」では振動させない（navigator.vibrate を呼ばない）", (await pk.evaluate(() => window.__vib)) === 0 && /calm\(\)\) return; try \{ navigator\.vibrate/.test(html) && /behavior: calm\(\) \? "auto"/.test(html));
    await pk.close();
  } catch (e) { check("だれでも遊べるように（色だけで分けない・キーボード・知らせ）の検査が最後まで動く", false, e.message.split("\n")[0]); }
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し。routines/game-dev.md「だれでも遊べるように」）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 星座つなぎ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
