# Phase 3 実装・検証結果

## 既存機能と構造

Phase 2の`App`（画面・図鑑・設定）、`DrinkMaker`（注入・履歴・混合）、`Glass`（SVG）、`engine`（容量・色）、`hiddenRecipes`（15種類）、`storage`（IndexedDB）を維持して拡張しました。実行時の依存はReactのみです。

IndexedDBのDB名・バージョン・ストア名・キーは変更していません。JSONの`format: drink-lab`、`version: 1`も維持しています。新しい設定`soundEnabled`と`soundVolume`がなければON・45%を補い、既存レシピ・発見・軽減設定を保持します。旧データを自動初期化する処理は追加していません。

## 追加機能

- **効果音**：注入、ボタン、混合、完成、初発見、登録の6種類をWeb Audio APIで独自合成。ON/OFF、音量、保存、最初のユーザー操作からの有効化、未対応・再生制限の案内。注入用タイマーは常に1つ。停止・非アクティブ・消音時に連続音と予定音を解除します。
- **演出**：押したボタンの弾み、流れ・炭酸の泡、停止後の液面の揺れ、層の揺れと色への溶け込み、発見優先度に応じた控えめな光・星。端末／ゲームの軽減設定を尊重します。
- **画像共有**：完成画面とレシピ詳細から開くプレビュー。ポップ／シンプルの2種類。Canvasから1080×1920pxのPNGを生成し、名前・色・量・材料と割合・ブランドを表示。最大80文字の名前と10材料に対応。日本語フォントの取得を待ち、必要なら端末フォントを使います。
- **保存・共有**：PNGダウンロード、対応時はFileをWeb Share APIへ渡し、非対応・キャンセル・失敗時は保存を案内。画面キャプチャや外部画像生成ライブラリを使いません。共有先への投稿は自動では行いません。
- **スマホとアクセシビリティ**：Safe Area、44pxを基本にした操作領域、注入ボタンの長押し・スクロール抑制、読みやすい表示、入力のスクロール余白、ネイティブdialogのフォーカス保持・Escape対応・画面高に収まるスクロール。
- **公開**：favicon、Apple Touch Icon、192/512pxアイコン、Manifest、1200×630pxのOGP、メタ情報、既存base `/drink-lab/`。Service Workerは導入せず、オフラインを保証しません。独自ドメイン、DNS、CNAMEは変更していません。

## 自動検証

ローカルの`npm run build`（TypeScript・Vite）：成功。

`npm test`：**8ファイル・79件成功**。既存60件を含みます。

追加検証は、音声の初回解放・注入タイマーの重複防止・消音・音量・非アクティブ停止・未対応／再生拒否、文字列の改行と絵文字、ファイル共有の対応判定、Phase 2 JSON・IndexedDBの互換性、音声設定の不正値、ManifestとPNGアセットの実寸・CNAME未作成です。

Playwrightは11ケースを実行する構成です。ローカルではmacOSのMachPort権限制限でChromiumが起動できず、テスト本体に到達できませんでした。成功したテストに数えていません。

GitHub Actionsで単体テスト79件・Playwright11ケースが成功し、Pagesへのデプロイも完了しました。[初回公開の実行結果](https://github.com/KU-InoueTakahiro/drink-lab/actions/runs/44550489970)を参照できます。

GitHub Actionsは単体テスト→ビルド→Chromiumインストール→Playwright→Pagesデプロイの順です。**ブラウザテストが失敗した状態では公開しません。** 最新のCI結果は[Actions](https://github.com/KU-InoueTakahiro/drink-lab/actions)で確認できます。

## 実ブラウザでの検証

アプリ内ブラウザで、注入→混合→完成画面からの画像生成、ポップ／シンプルのPNG保存、保存済みレシピ詳細からの生成、Phase 2形式のJSON読み込みを確認しています。PNGは1080×1920pxで、日本語・色・配合・ブランドが表示されることを目視確認しました。

音量45%→100%の変更とOFF設定が再読み込み後にも残ること、旧レシピと発見情報が保持されることを確認しました。共有モーダルは320・390・768・1440pxで横スクロールがなく、画面の内側に収まります。最大80文字・10材料を含むPNG2種類は実寸1080×1920で、文字と配合に欠けがないことを確認しています。

公開URLはHTTP 200。公開先のJavaScript、CSS、favicon、Manifest、Apple Touch Icon、192/512pxアイコン、OGP画像もHTTP 200と適切なContent-Typeを確認しました。

ローカル環境のファイル読み込み遅延を避けるため、一時作業コピーで検証し、同じソースと生成物を`drink-lab`に反映します。

## 公開先と残る確認

対象リポジトリの管理権限を確認し、PagesをActions方式・HTTPSで設定しました。APIで確認した標準URLは[GitHub Pages](https://ku-inouetakahiro.github.io/drink-lab/)です。共有PNGにはURLを記載していません。

iPhone・Android実機の聴感、各OSの共有先アプリへの実投稿、ホーム画面への追加操作は実機未確認です。Web Shareは利用可否を判定し、利用できなくてもPNG保存を使えます。オフライン、クラウド同期は対象外です。

## 変更ファイル

新規：`src/audio.ts`、`src/audio.test.ts`、`src/shareImage.ts`、`src/shareImage.test.ts`、`src/ShareDialog.tsx`、`src/compatibility.test.ts`、`src/publicAssets.test.ts`、`src/polish.css`、`tests/phase3.spec.ts`、`public/manifest.webmanifest`、`public/favicon.svg`、`public/icon-192.png`、`public/icon-512.png`、`public/apple-touch-icon.png`、`public/ogp.png`、`scripts/generate-assets.swift`、この報告書。

更新：`src/App.tsx`、`src/DrinkMaker.tsx`、`src/Glass.tsx`、`src/drinks.ts`（炭酸IDの定義のみ追加）、`src/saveData.ts`、`src/main.tsx`、`index.html`、`.github/workflows/deploy.yml`、`README.md`。

容量と混合色の計算、15種類の条件、IndexedDBのストア構造、レシピ編集・削除・検索・再現の基本処理は維持しています。公式サイトのリポジトリは変更していません。
