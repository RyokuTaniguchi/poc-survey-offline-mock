import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './styles.css';
import { primeOcrWorker, warmOcrAssets } from './lib/ocr';

// Service Worker 登録（任意。オフラインreload対応を強くしたい場合）
// SWは出来るだけ早く登録して更新適用（オフライン信頼性向上）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      void warmOcrAssets();
      primeOcrWorker();
    })
    .catch(() => {
      try {
        primeOcrWorker();
      } catch {
        // ignore
      }
    });
} else {
  try {
    primeOcrWorker();
  } catch {
    // ignore
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
