// SNS で貼られたときの絵（og.png 1200×630）を作る。オリオン座（いつも見られる代表の星座）を使う。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto("file://" + path.join(__dirname, "..", "index.html"));
  const sky = await p.evaluate(() => window.__sz.CONS.find((c) => c.id === "Ori"));
  const svg = await p.evaluate((C) => { const S = 1000; const col = (k) => (k < 4000 ? "#ffb38a" : k < 6300 ? "#fff1d6" : "#d6e2ff");
    return `<svg viewBox="0 0 ${S} ${S * 1.25}" width="420" height="525">${C.lines.map(([a, b]) => `<line x1="${C.pts[a][0] * S}" y1="${C.pts[a][1] * S}" x2="${C.pts[b][0] * S}" y2="${C.pts[b][1] * S}" stroke="#f2c76b" stroke-width="7" stroke-linecap="round"/>`).join("")}${C.pts.map((q) => { const r = Math.max(4, 17 - q[2] * 2.6); return `<circle cx="${q[0] * S}" cy="${q[1] * S}" r="${r * 2.6}" fill="${col(q[3])}" opacity=".18"/><circle cx="${q[0] * S}" cy="${q[1] * S}" r="${r}" fill="${col(q[3])}"/>`; }).join("")}</svg>`; }, sky);
  await p.setContent(`<body style="margin:0;font-family:'Noto Serif CJK JP','Noto Sans CJK JP',serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:80px 80px;background:radial-gradient(circle at 30% 0,#1d2c63,#070b1a 75%);color:#e9ecf7;position:relative;overflow:hidden">
    <div style="font-size:32px;color:#f2c76b;letter-spacing:.1em">今夜見ごろの 1日3星座・3分</div>
    <div style="font-size:110px;font-weight:900;margin-top:22px;letter-spacing:.12em">星座つなぎ</div>
    <div style="font-size:40px;margin-top:26px;line-height:1.5">本物の星空から、<br>星座の星を見つけてつなぐ。</div>
    <div style="position:absolute;right:70px;top:50px">${svg}</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
