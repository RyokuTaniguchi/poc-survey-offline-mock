import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDraft, useEnsureDraft } from "../../store/useDraft";
import DuplicateOverlay from "../../components/DuplicateOverlay";
import OcrCaptureDialog from "../../components/OcrCaptureDialog";
import { primeOcrWorker } from "../../lib/ocr";

export default function AssetPage() {
  useEnsureDraft();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { current, photos, attachPhoto, removePhoto, setFields } = useDraft();
  const [assetNo, setAssetNo] = useState("");
  const [equipmentNo, setEquipmentNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [lease, setLease] = useState<boolean>(false);
  const [loaned, setLoaned] = useState<boolean>(false);

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [ocrTarget, setOcrTarget] = useState<"assetNo" | "equipmentNo">("assetNo");
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  useEffect(() => {
    primeOcrWorker();
  }, []);

  useEffect(() => {
    setAssetNo((current?.fields?.assetNo as string) ?? "");
    setEquipmentNo((current?.fields?.equipmentNo as string) ?? "");
    setPurchaseDate((current?.fields?.purchaseDate as string) ?? "");
    setLease(Boolean(current?.fields?.leaseFlag));
    setLoaned(Boolean(current?.fields?.loanedFlag));
  }, [current?.fields?.assetNo, current?.fields?.equipmentNo, current?.fields?.purchaseDate, current?.fields?.leaseFlag, current?.fields?.loanedFlag]);

  const sealNo = (current?.fields?.sealNo as string) ?? "";
  const roomName = (current?.fields?.roomName as string) ?? "";

  const thumbUrls = useMemo(() => {
    return photos.map((photo) => ({ id: photo.id, url: URL.createObjectURL(photo.thumb) }));
  }, [photos]);

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    await attachPhoto(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleLease = () => {
    const next = !lease;
    setLease(next);
    void setFields({ leaseFlag: next });
  };

  const toggleLoaned = () => {
    const next = !loaned;
    setLoaned(next);
    void setFields({ loanedFlag: next });
  };

  const goBack = () => {
    navigate("/survey/label");
  };

  const goNext = () => {
    navigate("/survey/product");
  };

  const readyForNext = photos.length > 0;

  const handleOcrResult = (value: string) => {
    if (!value) return;
    if (ocrTarget === "assetNo") {
      setAssetNo(value);
      void setFields({ assetNo: value });
    } else {
      setEquipmentNo(value);
      void setFields({ equipmentNo: value });
    }
  };

  const handleOcrRecognized = useCallback((info: { text: string; method: string; targetLabel: string }) => {
    setOcrNotice(`${info.targetLabel}を読み取り: ${info.text}`);
  }, []);

  useEffect(() => {
    if (!ocrNotice) return undefined;
    const id = window.setTimeout(() => setOcrNotice(null), 5000);
    return () => {
      window.clearTimeout(id);
    };
  }, [ocrNotice]);

  const openOcrDialog = (target: "assetNo" | "equipmentNo") => {
    setOcrTarget(target);
    setOcrOpen(true);
  };

  return (
    <div className="page">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => handlePhotoSelect(e.target.files)}
      />
      <div className="page-section">
        {ocrNotice && <div className="ocr-result-banner">{ocrNotice}</div>}
        <h2 className="section-title">写真撮影・資産No登録</h2>
        <div className="grid">
          <label>
            シールNo
            <input value={sealNo} disabled />
          </label>
          <label>
            室名
            <input value={roomName} disabled />
          </label>
          <label>
            資産番号
            <div className="input-with-action">
              <input value={assetNo} onChange={(e) => { const value = e.target.value; setAssetNo(value); void setFields({ assetNo: value }); }} />
              <button type="button" className="ghost input-action" onClick={() => openOcrDialog("assetNo")}>
                読み取り
              </button>
            </div>
          </label>
          <label>
            備品番号
            <div className="input-with-action">
              <input value={equipmentNo} onChange={(e) => { const value = e.target.value; setEquipmentNo(value); void setFields({ equipmentNo: value }); }} />
              <button type="button" className="ghost input-action" onClick={() => openOcrDialog("equipmentNo")}>
                読み取り
              </button>
            </div>
          </label>
          <label>
            購入年月日
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => {
                const value = e.target.value;
                setPurchaseDate(value);
                void setFields({ purchaseDate: value });
              }}
            />
          </label>
          <div className="row">
            <button type="button" className={lease ? "secondary" : "ghost"} onClick={toggleLease}>
              リース: {lease ? "ON" : "OFF"}
            </button>
            <button type="button" className={loaned ? "secondary" : "ghost"} onClick={toggleLoaned}>
              貸出品: {loaned ? "ON" : "OFF"}
            </button>
          </div>
        </div>
        <div className="photo-strip">
          {thumbUrls.map((thumb) => (
            <div key={thumb.id} className="photo-item">
              <button
                type="button"
                className="photo-remove"
                onClick={() => removePhoto(thumb.id)}
                aria-label="写真を削除"
              >
                ×
              </button>
              <img src={thumb.url} alt="サムネイル" />
            </div>
          ))}
        </div>
      </div>
      <footer className="page-footer">
        <button className="ghost" onClick={() => setDuplicateOpen(true)}>複製</button>
        <button className="ghost" onClick={goBack}>戻る</button>
        <button className="secondary" onClick={() => fileInputRef.current?.click()}>写真</button>
        <button onClick={goNext} disabled={!readyForNext}>次へ</button>
      </footer>
      <DuplicateOverlay open={duplicateOpen} onClose={() => setDuplicateOpen(false)} />
      <OcrCaptureDialog
        open={ocrOpen}
        targetLabel={ocrTarget === "assetNo" ? "資産番号" : "備品番号"}
        onClose={() => setOcrOpen(false)}
        onResult={handleOcrResult}
        onRecognized={handleOcrRecognized}
      />
    </div>
  );
}
