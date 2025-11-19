import { createWorker, PSM, type Worker } from "tesseract.js";

export interface OcrResult {
  text: string;
  rawText: string;
  candidates: string[];
  confidence: number;
  method: "tesseract";
}

const baseUrl = (import.meta.env?.BASE_URL ?? "/").replace(/\/?$/, "/");
const assetUrl = (path: string) => `${baseUrl}tesseract/${path.replace(/^\//, "")}`;
const configuredLangBase = import.meta.env?.VITE_TESSDATA_URL?.trim();
const defaultLangBase = assetUrl("lang-data/");
const resolvedLangBase = (configuredLangBase ?? defaultLangBase).replace(/\/?$/, "/");

let workerPromise: Promise<Worker> | null = null;
let parametersApplied = false;

const TESSERACT_INIT_TIMEOUT_MS = 60000;  // allow enough time on low-end devices

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      try { onTimeout?.(); } catch {}
      reject(new Error("OCR処理がタイムアウトしました"));
    }, ms);
    promise.then(
      (value) => { clearTimeout(id); resolve(value); },
      (err) => { clearTimeout(id); reject(err); }
    );
  });
}

function toHalfWidth(value: string) {
  return value.replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)).replace(/\u3000/g, " ");
}

async function blobToCanvas(blob: Blob) {
  if (typeof window === "undefined") return null;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    context.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return canvas;
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = objectUrl;
    });
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function normalizeText(value: string) {
  const half = toHalfWidth(value).toUpperCase();
  const dashNormalized = half.replace(/[\u2010-\u2015\u2212\u30FC\uFF0D\uFE63]/g, "-");
  const allowed = dashNormalized.replace(/[^0-9A-Z-]/g, "");
  return allowed;
}

const resetWorkerState = () => {
  workerPromise = null;
  parametersApplied = false;
};

async function createWorkerInstance() {
  // Create worker preloaded with English; worker will fetch lang data from resolvedLangBase.
  return createWorker("eng", undefined, {
    workerPath: assetUrl("worker.min.js"),
    corePath: assetUrl("tesseract-core.wasm.js"),
    langPath: resolvedLangBase,
    workerBlobURL: false,
  });
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = withTimeout(createWorkerInstance(), TESSERACT_INIT_TIMEOUT_MS, resetWorkerState);
  }
  try {
    const worker = await workerPromise;
    if (!parametersApplied) {
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      parametersApplied = true;
    }
    return worker;
  } catch (err) {
    resetWorkerState();
    throw err instanceof Error ? err : new Error("Tesseract workerの初期化に失敗しました");
  }
}

export function primeOcrWorker() {
  void getWorker().catch(() => {
    // 初期化失敗はコンソールにのみ出し、実際の読み取り時に再試行する
  });
}

const OCR_ASSETS = [
  "tesseract/lang-data/eng.traineddata.gz",
  "tesseract/worker.min.js",
  "tesseract/tesseract-core.wasm",
  "tesseract/tesseract-core.wasm.js",
];

export async function warmOcrAssets() {
  const base = (import.meta.env?.BASE_URL ?? "/").replace(/\/?$/, "/");
  await Promise.all(
    OCR_ASSETS.map(async (asset) => {
      try {
        await fetch(`${base}${asset}`, { cache: "force-cache" });
      } catch {
        // ignore failures (offline, etc.)
      }
    }),
  );
}

export async function ensureOcrReady() {
  await warmOcrAssets();
  await getWorker();
}

async function recognizeWithTesseract(blob: Blob): Promise<OcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(blob).catch(async (err) => {
    // reset worker to avoid sticky errors
    await disposeOcrWorker();
    throw err;
  });
  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  const lines = rawLines.map((line) => line.text?.trim?.() ?? "").filter(Boolean);
  const bestLine = rawLines.reduce<{ text: string; confidence: number } | null>((best, current) => {
    if (!best || current.confidence > best.confidence) {
      return { text: current.text, confidence: current.confidence };
    }
    return best;
  }, null);
  const normalized = normalizeText(bestLine?.text ?? data.text ?? "");
  const confidence = bestLine?.confidence ?? data.confidence ?? 0;
  return {
    text: normalized,
    rawText: data.text ?? "",
    candidates: lines.length > 0 ? lines : (data.text ?? "").split(/\n+/).map((line) => line.trim()).filter(Boolean),
    confidence,
    method: "tesseract",
  };
}

export async function disposeOcrWorker() {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  resetWorkerState();
}

export async function recognizeTextFromBlob(blob: Blob): Promise<OcrResult> {
  let lastError: Error | null = null;
  try {
    return await recognizeWithTesseract(blob);
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
  }

  if (lastError) {
    const message = lastError.message;
    if (resolvedLangBase.startsWith("http")) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("OCR辞書データが未取得です。オンライン接続時に一度読み取りを実行し、キャッシュを作成してください。");
      }
      throw new Error(`OCR辞書データのダウンロードに失敗しました: ${message}`);
    }
    throw new Error(`OCR辞書データの読み込みに失敗しました。詳細: ${message}`);
  }
  throw new Error("OCR処理に失敗しました。");
}
