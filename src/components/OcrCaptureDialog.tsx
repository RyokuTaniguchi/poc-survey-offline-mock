import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recognizeTextFromBlob, type OcrResult } from "../lib/ocr";

type OcrStatus = "idle" | "camera" | "photo" | "processing" | "error";
const TARGET_REGION = {
  left: 0.08,
  top: 0.425,
  width: 0.84,
  height: 0.15,
}; // keep in sync with CSS guide overlay
const MAX_SNAPSHOT_WIDTH = 1200;
const SNAPSHOT_TIMEOUT = 2000;

interface OcrCaptureDialogProps {
  open: boolean;
  targetLabel: string;
  onClose: () => void;
  onResult: (value: string) => void;
  onRecognized?: (info: { text: string; method: OcrResult["method"]; targetLabel: string }) => void;
}

function dataUrlToBlob(dataUrl: string, type: string) {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? type;
  const binary = atob(parts[1] ?? "");
  const length = binary.length;
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  if (typeof canvas.toBlob === "function") {
    return await new Promise<Blob>((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          const fallback = dataUrlToBlob(canvas.toDataURL(type, quality), type);
          resolve(fallback);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("スナップショットの生成に失敗しました"));
        }
      }, SNAPSHOT_TIMEOUT);
      canvas.toBlob((blob) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (blob) {
          resolve(blob);
        } else {
          try {
            const fallback = dataUrlToBlob(canvas.toDataURL(type, quality), type);
            resolve(fallback);
          } catch (err) {
            reject(err instanceof Error ? err : new Error("スナップショットの生成に失敗しました"));
          }
        }
      }, type, quality);
    });
  }
  return dataUrlToBlob(canvas.toDataURL(type, quality), type);
}

export default function OcrCaptureDialog({ open, targetLabel, onClose, onResult, onRecognized }: OcrCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>();
  const cropCanvasRef = useRef<HTMLCanvasElement>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<OcrStatus>("idle");
  const [message, setMessage] = useState<string>("カメラを初期化しています…");
  const [actionDisabled, setActionDisabled] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    canvasRef.current = document.createElement("canvas");
    cropCanvasRef.current = document.createElement("canvas");
  }, []);

  const resetPhoto = useCallback(() => {
    setPhotoBlob(null);
    setPhotoUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = useCallback(async () => {
    resetPhoto();
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("この端末ではカメラを利用できません。手入力してください。");
      setActionDisabled(false);
      return;
    }
    setStatus("camera");
    setMessage("カメラを起動しています…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus("camera");
      setMessage("枠が黒い帯に変わりました。番号を合わせて撮影してください。");
      setActionDisabled(false);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setMessage(`カメラにアクセスできません: ${text}`);
      setActionDisabled(false);
    }
  }, [resetPhoto]);

  useEffect(() => {
    if (!open) {
      stopStream();
      resetPhoto();
      setStatus("idle");
      setMessage("カメラを初期化しています…");
      setActionDisabled(false);
      return;
    }
    void startCamera();
    return () => {
      stopStream();
    };
  }, [open, startCamera]);

  const captureRegionFromSource = async (sourceWidth: number, sourceHeight: number, drawSource: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = canvasRef.current;
    const cropCanvas = cropCanvasRef.current;
    if (!canvas || !cropCanvas || sourceWidth === 0 || sourceHeight === 0) {
      throw new Error("画像データを読み込めませんでした。");
    }
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("画像の処理に失敗しました。");
    }
    drawSource(context);
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) {
      throw new Error("画像の処理に失敗しました。");
    }
    const region = {
      x: Math.floor(canvas.width * TARGET_REGION.left),
      y: Math.floor(canvas.height * TARGET_REGION.top),
      width: Math.floor(canvas.width * TARGET_REGION.width),
      height: Math.floor(canvas.height * TARGET_REGION.height),
    };
    const scale = region.width > MAX_SNAPSHOT_WIDTH ? MAX_SNAPSHOT_WIDTH / region.width : 1;
    const targetWidth = Math.max(320, Math.round(region.width * scale));
    const targetHeight = Math.max(120, Math.round(region.height * scale));
    cropCanvas.width = targetWidth;
    cropCanvas.height = targetHeight;
    cropCtx.filter = "contrast(160%) brightness(115%) grayscale(15%)";
    cropCtx.drawImage(canvas, region.x, region.y, region.width, region.height, 0, 0, targetWidth, targetHeight);
    return canvasToBlob(cropCanvas, "image/jpeg", 0.92);
  };

  const handleCapture = async () => {
    if (!open || actionDisabled || status !== "camera") return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setStatus("error");
      setMessage("カメラ映像を取得できませんでした。");
      return;
    }
    setActionDisabled(true);
    setMessage("撮影中…");
    try {
      const blob = await captureRegionFromSource(video.videoWidth, video.videoHeight, (ctx) => {
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      });
      stopStream();
      resetPhoto();
      const url = URL.createObjectURL(blob);
      setPhotoBlob(blob);
      setPhotoUrl(url);
      setStatus("photo");
      setMessage("写真を保存しました。読み取りボタンを押してください。");
      setActionDisabled(false);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setMessage(`撮影に失敗しました: ${text}`);
      setActionDisabled(false);
    }
  };

  const loadImageElement = (file: File) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  };

  const handleUploadImage = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setActionDisabled(true);
    setMessage("画像を処理しています…");
    try {
      let blob: Blob;
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(file);
        blob = await captureRegionFromSource(bitmap.width, bitmap.height, (ctx) => {
          ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
        });
        bitmap.close();
      } else {
        const image = await loadImageElement(file);
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        blob = await captureRegionFromSource(width, height, (ctx) => {
          ctx.drawImage(image, 0, 0, width, height);
        });
      }
      stopStream();
      resetPhoto();
      const url = URL.createObjectURL(blob);
      setPhotoBlob(blob);
      setPhotoUrl(url);
      setStatus("photo");
      setMessage("写真を保存しました。読み取りボタンを押してください。");
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setMessage(`画像の処理に失敗しました: ${text}`);
    } finally {
      setActionDisabled(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleProcessPhoto = async () => {
    if (!photoBlob || actionDisabled) return;
    setStatus("processing");
    setActionDisabled(true);
    setMessage("読み取り中です。1秒ほどお待ちください…");
    try {
      const result = await recognizeTextFromBlob(photoBlob);
      if (result.text) {
        onResult(result.text);
        setMessage(`認識した値: ${result.text}`);
        onRecognized?.({ text: result.text, method: result.method, targetLabel });
        onClose();
      } else {
        setStatus("error");
        setMessage("文字を検出できませんでした。撮り直して再試行してください。");
        setActionDisabled(false);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setMessage(`読み取りに失敗しました: ${text}`);
      setActionDisabled(false);
    }
  };

  const handleRetake = () => {
    if (actionDisabled) return;
    resetPhoto();
    void startCamera();
  };

  const hint = useMemo(() => {
    if (status === "photo") return "撮影した画像を確認し、問題なければ「読み取る」を押してください。";
    if (status === "processing") return "しばらくお待ちください…";
    if (status === "error") return "カメラや照明の状態を確認してください。";
    return "黒いガイド帯の中央に番号を重ね、影や反射を避けて撮影すると精度が上がります。";
  }, [status]);

  if (!open) return null;

  return (
    <div className="ocr-overlay" role="dialog" aria-modal="true">
      <div className="ocr-panel">
        <header className="ocr-header">
          <div>
            <p className="ocr-eyebrow">テキストスキャン</p>
            <h3>{targetLabel}の読み取り</h3>
          </div>
          <button type="button" className="ghost" onClick={onClose}>閉じる</button>
        </header>
        <div className="ocr-video-container">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => handleUploadImage(e.target.files)}
          />
          {photoUrl ? (
            <img src={photoUrl} alt="撮影した画像" className="ocr-preview" />
          ) : (
            <>
              <video ref={videoRef} playsInline autoPlay muted className="ocr-video" />
              <div className="ocr-frame" aria-hidden="true">
                <span className="ocr-frame__label">黒い帯に合わせてください</span>
              </div>
            </>
          )}
        </div>
        <p className="helper-text">{hint}</p>
        <p className={`ocr-message ${status === "error" ? "is-error" : ""}`}>{message}</p>
        <footer className="ocr-footer">
          <button type="button" className="ghost" onClick={onClose} disabled={actionDisabled && status === "processing"}>キャンセル</button>
          <button type="button" className="ghost" onClick={() => fileInputRef.current?.click()} disabled={actionDisabled}>
            画像をアップロード
          </button>
          {photoBlob && (
            <button type="button" className="ghost" onClick={handleRetake} disabled={actionDisabled}>撮り直し</button>
          )}
          {!photoBlob && (
            <button type="button" onClick={handleCapture} className="secondary" disabled={actionDisabled || status !== "camera"}>
              撮影する
            </button>
          )}
          {photoBlob && (
            <button type="button" onClick={handleProcessPhoto} className="secondary" disabled={actionDisabled}>
              {status === "processing" ? "読み取り中..." : "読み取る"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
