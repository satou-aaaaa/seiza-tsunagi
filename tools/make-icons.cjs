// アプリのアイコン（icon-192.png・icon-512.png）を作る。夜空にカシオペヤ座のW。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    const pts = [[18, 40], [36, 62], [50, 44], [66, 64], [82, 36]];
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="g" cx="50%" cy="0%" r="110%"><stop offset="0" stop-color="#1d2c63"/><stop offset=".8" stop-color="#070b1a"/></radialGradient></defs>
      <rect width="100" height="100" fill="url(#g)"/>
      <polyline points="${pts.map((q) => q.join(",")).join(" ")}" fill="none" stroke="#f2c76b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#fff" opacity=".15"/><circle cx="${x}" cy="${y}" r="4.5" fill="#fff"/>`).join("")}
      ${[[12, 14], [30, 22], [70, 16], [88, 82], [20, 84], [55, 86], [90, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#cfd8ff"/>`).join("")}</svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
