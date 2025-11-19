# 調査PoC Phase1（React + TS + IndexedDB + ZXing + Fuse + Workbox）

## セットアップ
```bash
npm i
npm run fetch:ocr  # Tesseractの言語データをダウンロード（初回のみ）
npm run dev      # 開発サーバ（ngrok等で外部公開可）
npm run build    # 本番ビルド（/dist）＋ Workbox で調査画面だけをprecache
npm run preview  # 本番ビルドのローカルサーバ
```

- **/survey/** 配下のみオフラインfallback（SWのallowlist）
- 認証・ホーム・一覧は常にオンライン専用（NetworkOnly）
- マスターは初回DL→IndexedDB保存→Fuseインデックス生成
- 画像は撮影→圧縮→IndexedDB保存（PUT同期はPhase2で実装予定）
- OCR辞書（英語）は `npm run fetch:ocr` で公式サイトから取得し Service Worker がキャッシュ
- OCRの辞書パスは `VITE_TESSDATA_URL` で上書きできます（未設定時は公式CDNからDLしSWがCacheFirstで保持）
