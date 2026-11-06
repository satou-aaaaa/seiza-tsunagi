# AGENTS.md

星座つなぎ：本物の星の並びの中から星座の星を見つけて線でつなぐ、今夜見ごろの1日3星座のゲーム。`index.html` と `data.js`（星座と星）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 星のデータ（本物の向き・色・線）・今夜の3星座の選び方（3年分）・押す/すべらせる・まちがい・ヒント・続きから・上級・星座帳・スマホ幅・PWA（CI の QA と同じ）
```

## このリポジトリの決まり

- `data.js` は `node tools/make-data.cjs <bsc5-short.json>` で作る（手で直さない）。星の位置・等級・色温度は Yale Bright Star Catalog 第5版（https://github.com/brettonw/YaleBrightStarCatalog の bsc5-short.json）から。カタログはリポジトリに入れない。
- 星座の線は `tools/make-data.cjs` の `CONS` にバイエル符号で書く。新しい星座を足すときは、線の結び方を信頼できる資料（国立天文台・IAU の星座図など）で確かめる。名前のある星のカタカナは `KANA`。
- 画面は空を見上げた向き（北が上・東が左）。オリオン座のベテルギウスが左上・リゲルが右下になることを QA が見る（2026-11-04 左右が逆の絵を作りかけた）。
- 好きなだけ遊べる：チケット・回数制限・🔒で開くモードを入れない（2026-11-06 satou さん。寄付で成り立たせるため）。上級は今日の3星座の前でも始められる。練習は出した時刻 `pseen` の古い星座から3つ（全部出すまで同じ星座は出ない。`practicePick`）。星座は19（tools の CONS。カタログと資料で確かめずに増やさない）。
- 今夜の3星座は日本時間の日付から：その日の夜9時に南の空に来る星座の近い順7つ（北の空の星座はいつでも候補）から、日付の種で3つ。前の日と同じ3つなら選び直す。上級（見本なし）は今日の3つと重ねない。`Math.random()` は練習・とことんの星座選びだけ（QA が数を見る）。
- ★はまちがい＋ヒントの回数（0回★3・2回まで★2・それ以上★1）。時間制限は付けない。今日の3星座・上級は1日1回で、途中で閉じても続きから。練習は記録を増やさない（星座帳には載る）。途中経過はモードごとに分けて保存し（`runs.d`・`runs.h`・`runs.p`）、練習で今夜・上級の途中を消さない。書き込む前に、保存した進み具合がこの画面と同じ星座か確かめる（古いタブで二重に入れない。2026-11-04 かさね染めで CodeRabbit が指摘）。
- とことん（`runs.e`）：今日の分のあとも続けて遊べるよう、全部の星座を線の少ない組→多い組の順に毎回ちがう並びで出し、2周目は見本なしで同じように出す（`endlessList`）。まちがい・ヒントでは終わらず（何度でも）、「ここで降りる」で終わり、つないだ数の自己ベスト `ebest` と結果にまちがい・ヒントの回数を出す。並びを使い切ったら新しい並びを足して続け（`endlessList(avoid)`。つなぎ目・次の回の1つ目で同じ星座を続けない。最後に出した星座は `elast`）。前の版の途中経過の `life` は読まない。今日の記録・連続・Ko-fi・シェアには数えない（星座帳には載る）。他の人との順位は出さない。ホームと今日の結果の画面に大きなボタンを置く（2026-11-05 satou さん「一日で遊べる量が少なすぎる」）。
- 実績（`ACH`）は記録（`days`・`hdays`・`pdays`・`dex`）から毎回数え、新しく残すのは結果の画面で知らせ終えた印 `ach` だけ。腕前・集める・続けるをまぜ、まだのものは「いま/目標」を出す。実績を足したら QA の数（10〜14）も見直す。
- 取りこぼした夜（きのう〜7日前、`EPOCH`（第1夜）から。それより前は出さない）は、カレンダーから「あとから」遊べる（`runs.a`・記録は `pdays`）。問題は `pick(その日, false)` のまま。連続の夜・今日の記録・シェア・Ko-fi には数えない（星座帳と実績の夜の数には入る）。カレンダーの連続の言葉は1夜以上のときだけ出す。
- 線は「星から星へ指をすべらせて離す」か「2つの星を順に押す」で引く。すべらせる途中でかすめた星は線にしない（2026-11-04 長い線をなぞるとまよう星で失敗になったのを QA で見つけた）。
- 文字は少なめ・一画面一星座。お笑いの言葉は入れない（本物っぽさ優先。QA が見る）。ほかの作品の名前・キャラ・見た目は使わない。星座の絵（神話の絵）は入れない（著作物を使わない）。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文は星（★）だけ。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`、ラベル「感想」）を開くだけ。項目は shared-workflows の `template/.github/ISSUE_TEMPLATE/feedback.yml` と同じにし、名前・メールは聞かない。週1で shared-workflows `routines/game-feedback.md` が読んで直す。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の3星座・上級を初めてまちがいなしで終えたときだけ、結果の画面の下に1行（共有フォルダ kofi/app-guide.md）。遊ぶのは無料のまま、有料版は置かない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。記録は遊ぶ人のブラウザ（localStorage）だけ。
- 押せる所は高さ44px以上、星は近くを押せば反応する（`HIT`。幅320pxでも35px以上。QA が見る）。星どうしは画面の幅の4%以上離す（`make-data.cjs` が近すぎるまよう星を入れない）。
- 機能を足す・直すたびに `qa/run.mjs` に検査を足す。乱数で組む部分は何百回も作って確かめる（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。検査の期待値を乱数（練習の星座など）の結果に頼らない。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`。
- 引き継ぎコード（別の端末へ記録を移す）：`transfer.js`・`qa/transfer-check.mjs` は shared-workflows の `template/` の写し（ここで直さない。直すときはひな形を直して配り、`引き継ぎの版` を上げる）。`index.html` の script の `data-keys` は記録のキーだけを書く。記録の形を変えたら `qa/run.mjs` の `checkTransfer` の `sample` も合わせる。sw.js の `SHELL` から `./transfer.js` を外さない（shared-workflows `routines/game-dev.md`「引き継ぎコード」）。
- 公開リポジトリなので、個人情報・鍵を入れない。
- 見やすさ：`</head>` の前の見やすさの設定（`<!-- a11y:begin -->`〜`end`）は shared-workflows `template/a11y/a11y.html` の写しで、ここでは直さない。`qa/a11y.mjs` も `template/qa/a11y.mjs` の写し（画面の足し方・許しは `qa/a11y.json` に理由つき）。色だけで分けない（見本のまだの線は点線・まちがいの線は破線と「✕」の知らせ・ヒントの輪は破線・取れなかった星は ☆・何つ目かの点は高さと中の空き。「色の見分けを助ける」ではまちがい＝朱・ヒント＝空色）・コントラスト 4.5:1・知らせは `#live`（role=status）・決めつけの言葉を使わない（shared-workflows `routines/game-dev.md`「だれでも遊べるように」）。夜空の星は role=button で Tab・矢印・Enter でも線を引け、名前は「星N・場所・明るさ・選んでいる/ヒント/つないだ」（星座の星かどうか・星の名前は言わない。並びは上から下の順で、星座の星が先に来ない）。
- 同じ日はどの端末でも同じ問題にする：乱数は `sort` の比較の中で引かない（引く回数がブラウザで変わる。2026-11-04 路線図ひと筆で CodeRabbit が指摘。QA が見る）。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
