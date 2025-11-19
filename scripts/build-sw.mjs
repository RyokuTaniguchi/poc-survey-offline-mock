import { generateSW } from 'workbox-build';

// GitHub Pages での公開パス（Vite の base と揃える）
const BASE_PATH = '/poc-survey-offline-mock/';

const result = await generateSW({
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{js,css,html,png,webp,svg,csv,wasm,gz}',
    'survey/*',
    'assets/*'
  ],
  // Allow precaching of large Tesseract assets (~12 MB for eng.traineddata.gz)
  maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
  swDest: 'dist/sw.js',
  clientsClaim: true,
  skipWaiting: true,
  // navigation fallback を allowlist（/survey/* のみ）
  navigateFallback: `${BASE_PATH}index.html`,
  navigateFallbackAllowlist: [new RegExp(`^${BASE_PATH}survey(\/|$)`)],
  runtimeCaching: [
    // OCR関連アセットは常にCacheFirstでオフラインでも確実に取得（優先的に登録）
    {
      urlPattern: ({url}) =>
        url.origin === self.location.origin && url.pathname.includes('/tesseract/'),
      handler: 'CacheFirst',
      options: { cacheName: 'ocr-assets-v1' }
    },
    // Tesseract言語データ（外部ホスト）もCacheFirstで保持
    {
      urlPattern: ({url}) => url.origin === 'https://tessdata.projectnaptha.com',
      handler: 'CacheFirst',
      options: { cacheName: 'ocr-lang-v1' }
    },
    // 自サイトの静的資産はStaleWhileRevalidate
    {
      urlPattern: ({url}) => url.origin === self.location.origin,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-v1' }
    },
    // 認証/ユーザー系APIはキャッシュしない（オンライン専用）
    {
      urlPattern: /\/api\/(auth|user)(\/.*)?$/,
      handler: 'NetworkOnly'
    },
    // マスターAPIはNetworkFirst（短期キャッシュ）、正本はIndexedDB
    {
      urlPattern: /\/api\/masters\//,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-masters' }
    }
  ]
});

console.log('Workbox generated SW:', result.count, 'files precached.');
