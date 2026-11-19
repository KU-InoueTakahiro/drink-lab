# まぜまぜドリンクラボ — Phase 3

「きまぐれ自由帳」のブラウザゲーム。ドリンクバーで注いで、まぜて、自分だけのレシピを集められます。
React + TypeScript + Vite、SVGとCSS、IndexedDBを使用しています。

## 起動する

初めて取得する場合は下記のコマンドを実行します。すでに取得済みの場合は、その`drink-lab`フォルダへ移動して`npm ci`から実行してください。Node.js 22.12以上（または24）を使用します。

```sh
git clone https://github.com/KU-InoueTakahiro/drink-lab.git
cd drink-lab
npm ci
npm run dev
```

ターミナルに表示されるURLの `/drink-lab/` を開きます。通常は `http://localhost:5173/drink-lab/` です。
以前の開発サーバーが起動している場合はControl+Cで終了し、依存のインストール後に起動し直してください。

## あそびかた

- ホームの「ドリンクをつくる」から開始します。
- 10種類の飲み物を長押しすると60ml/秒で注入します。短いタップは最低5ml。グラスは300mlです。
- 指を離す、ボタン外へ動かす、キャンセル、非アクティブになる、作成画面を離れると注入を止めます。
- キーボードはTabで選び、Space / Enterを長押しします。
- 1操作戻す・全部やり直すも使用できます。図鑑へ寄り道して戻っても、作成途中のグラスを保持します。
- 「まぜまぜ！」で約1.5秒混合し、完成画面へ進みます。軽減設定時は180msです。
- 名前をつけて図鑑に登録。同じ配合も複数回登録できます。空名は「無名のドリンク」です。
- 自由レシピ図鑑では検索、並べ替え、詳細、改名、確認付き削除、手動再現ガイドを利用できます。
- 隠しレシピ15種類は混合完了時に判定し、自由レシピ登録とは独立して発見を保存します。
- 発見図鑑の未発見カードにはヒントだけを表示。発見後に名前・正式配合・説明・発見日時が公開されます。

## 保存と移行

レシピ・発見記録・アニメーション軽減設定をIndexedDBに保存します。
設定画面からJSONを書き出し、読み込めます。インポートは検証後に件数を表示し、確定時に現在のデータを**置き換え**ます。必要なら、置き換える前のデータを自動ダウンロードしてバックアップできます。

検証項目は形式名、バージョン、UUIDの重複、既知の材料、有限の正の注入量、300mlの上限、材料集計と順序の整合、完成色、名前・日時・発見ID・設定です。ファイルは5MB以内です。不正データの検証中に既存データを変更しません。

読み込みに失敗した場合は自動初期化せず、保存を停止して通知します。保存失敗時は未保存の変更を保持し、再試行できます。全データ削除には確認を表示します。

保存先はブラウザとURLのオリジン（ホスト・ポート）ごとです。`localhost:5173`と別のポート、別ブラウザ、GitHub Pagesには自動移行されません。JSONで移行してください。プライベートブラウズやブラウザデータ削除によって保存が失われることがあります。

## ファイル構成

| ファイル | 内容 |
| --- | --- |
| `src/main.tsx` | React起動 |
| `src/App.tsx` | ホーム、完成、図鑑、詳細、設定、画面遷移 |
| `src/DrinkMaker.tsx` | Phase 1から再利用したドリンクバーと注入・混合 |
| `src/Glass.tsx` | Phase 1から再利用したグラスSVG |
| `src/drinks.ts` | 10種類のドリンクデータ（維持） |
| `src/engine.ts` | 容量制御とRGB加重平均（維持） |
| `src/hiddenRecipes.ts` | 隠しレシピ15種類・判定・材料集計 |
| `src/saveData.ts` | 保存型、UUID、発見更新、JSON検証 |
| `src/storage.ts` | IndexedDBの読み書き・トランザクション |
| `src/style.css` | Phase 1のデザイン（維持） |
| `src/collection.css` | Phase 2の画面とレスポンシブ表示 |

実行時の外部ライブラリはReactのみです。テスト用に`fake-indexeddb`、設定・テストの型確認用に`@types/node`を追加しました。
フォントはM PLUS Rounded 1c。取得できない場合は端末のフォントへフォールバックします。

## 検証コマンド

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2Eテストは開発サーバーを自動起動します。標準ポートは4173、変更する場合は `DRINK_LAB_TEST_PORT=4180 npm run test:e2e` のように指定できます。

今回の実行結果と変更一覧は [PHASE3_REPORT.md](./PHASE3_REPORT.md) を参照してください。

## GitHub Pages

`vite.config.ts`のbaseは `/drink-lab/` です。このフォルダの中身を独立した`drink-lab`リポジトリのルートに置き、`main`へpushします。Settings → Pages → Sourceを **GitHub Actions** に設定すると、既存ワークフローでテスト・ビルド・デプロイします。

画面切り替えはReactの状態で行い、URLの深いパスを使いません。直接再読み込みするとホームから再開し、保存したコレクションを読み込みます。

将来 `drink.kimagure-jiyucho.com` を取得したら、Viteのbaseを `/` に変更し、GitHub PagesのCustom domainとDNSを設定します。現在CNAMEは作成していません。

公式サイトや別プロジェクトは変更していません。Pagesへの公開は下記のActionsがビルド・ブラウザテストに成功した場合に行います。独自ドメイン・DNS・CNAMEは設定していません。


## Phase 3：効果音と画像共有

設定で効果音のON/OFFと音量を変更できます。初期値はON・45%。最初のユーザー操作から音声を有効化します。注入・操作・混合・完成・初発見・図鑑登録は、Web Audio APIで独自に合成した音です。注入音のタイマーは一つだけ保持し、指を離した場合、非アクティブ、消音で停止します。音声が使えない環境でもゲームは続けられます。

完成画面と保存済みレシピ詳細の「画像でシェア」から、ポップ／シンプルの2種類を選べます。プレビューを確認して1080×1920pxのPNGを保存してください。ファイル共有に対応するブラウザでは端末の共有メニューも使えます。画像生成はCanvasで行い、画面のスクリーンショットは使用しません。日本語フォントの読み込みを待ち、取得できない場合は端末の日本語フォントにフォールバックします。共有画像に仮の独自ドメインや未確認のURLは記載していません。

保存データ・IndexedDBともバージョン1を維持しています。Phase 2の設定に音の項目がない場合は初期値を補います。既存レシピ・発見・軽減設定は変更しません。旧JSONをインポートでき、新JSONも同じ形式でエクスポートします。

Safe Area、44px以上を基本とした操作領域、フォーカス・キーボード操作、Canvas・保存・音声のエラー表示を追加しています。軽減設定では装飾アニメーションを省略します。

Web App Manifest、192/512pxアイコン、Apple Touch Icon、favicon、1200×630pxのOGPを設定しています。ホーム画面への追加操作はOS・ブラウザによって異なります。Service Workerは導入しておらず、オフライン動作は保証しません。古いキャッシュを常駐させません。

Pagesの自動デプロイは、単体テスト→本番ビルド→Playwrightのブラウザテスト→デプロイの順です。リポジトリは [KU-InoueTakahiro/drink-lab](https://github.com/KU-InoueTakahiro/drink-lab)、公開先は [標準GitHub Pages URL](https://ku-inouetakahiro.github.io/drink-lab/) です。メタデータのOGP URLはこのアカウントと`/drink-lab/`設定に合わせています。公開先を変更するときは、Vite baseだけでなく`index.html`のOGP画像URLも更新してください。

参考：[GitHub Pages API](https://docs.github.com/en/rest/pages/pages)、[Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)。PNGは先に生成しておき、共有ボタンを押した操作内で直接`navigator.share`へ渡します。
