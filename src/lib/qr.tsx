import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

export interface QRScannerHandle {
  start: () => Promise<void>;
  stop: () => void;
}

interface QRScannerProps {
  onResult: (text: string) => void;
}

export const QRScanner = forwardRef<QRScannerHandle, QRScannerProps>(({ onResult }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      BrowserMultiFormatReader.releaseAllStreams();
      readerRef.current = null;
      setRunning(false);
    };
  }, []);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    BrowserMultiFormatReader.releaseAllStreams();
    setRunning(false);
  }, []);

  const start = useCallback(async () => {
    if (!videoRef.current || !readerRef.current) return;
    if (running) return;
    setRunning(true);
    try {
      controlsRef.current = await readerRef.current.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result) => {
          if (result) {
            onResult(result.getText());
            stop();
          }
        }
      );
    } catch (e) {
      console.error(e);
      setRunning(false);
      controlsRef.current = null;
    }
  }, [onResult, running, stop]);

  useImperativeHandle(ref, () => ({ start, stop }), [start, stop]);

  return (
    <div className="qr-container" style={{ display: running ? "block" : "none" }}>
      <video ref={videoRef} className="qr-video" muted playsInline />
      {running && (
        <div className="helper-text" style={{ marginTop: 8 }}>
          読み取り中です...
        </div>
      )}
    </div>
  );
});
