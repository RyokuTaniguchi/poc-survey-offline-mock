import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRScanner, QRScannerHandle } from "../../lib/qr";
import { useDraft, useEnsureDraft } from "../../store/useDraft";
import { ensureCameraAccess } from "../../lib/camera";
import { db, Room } from "../../lib/db";
import DuplicateOverlay from "../../components/DuplicateOverlay";

export default function LabelPage() {
  useEnsureDraft();
  const navigate = useNavigate();
  const scannerRef = useRef<QRScannerHandle>(null);
  const { current, setFields, setQR } = useDraft();
  const [sealNo, setSealNo] = useState("");
  const [roomName, setRoomName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  useEffect(() => {
    setSealNo((current?.fields?.sealNo as string) ?? "");
    setRoomName((current?.fields?.roomName as string) ?? "");
  }, [current?.fields?.sealNo, current?.fields?.roomName]);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    let active = true;
    db.location_rooms
      .toArray()
      .then((rows) => {
        if (active) setRooms(rows);
      })
      .catch(() => {
        if (active) setRooms([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const buildingId = current?.fields?.buildingId as string | undefined;
  const floorId = current?.fields?.floorId as string | undefined;
  const departmentId = current?.fields?.departmentId as string | undefined;
  const divisionId = current?.fields?.divisionId as string | undefined;

  const roomSuggestions = useMemo(() => {
    if (!buildingId || !floorId || !departmentId || !divisionId) return [];
    const query = roomName.trim().toLowerCase();
    return rooms.filter((room) => {
      if (room.buildingId !== buildingId) return false;
      if (room.floorId !== floorId) return false;
      if (room.departmentId !== departmentId) return false;
      if (room.divisionId !== divisionId) return false;
      if (!query) return true;
      return room.name.toLowerCase().includes(query);
    });
  }, [rooms, buildingId, floorId, departmentId, divisionId, roomName]);

  const handleQrResult = (text: string) => {
    const trimmed = text.trim();
    const match = trimmed.match(/medical-record\/([A-Za-z0-9-]+)$/i);
    const extracted = match ? match[1] : trimmed;
    setSealNo(extracted);
    void setQR(extracted);
  };

  const handleSealChange = (value: string) => {
    setSealNo(value);
    void setFields({ sealNo: value, qrCode: value });
  };

  const handleRoomChange = (value: string) => {
    setRoomName(value);
    void setFields({ roomName: value });
  };

  const goBack = () => {
    scannerRef.current?.stop();
    navigate("/survey/department");
  };

  const goNext = () => {
    scannerRef.current?.stop();
    navigate("/survey/asset");
  };

  const readyForNext = Boolean(sealNo.trim() && roomName.trim());

  return (
    <div className="page">
      <div className="page-section">
        <h2 className="section-title">QRコード読取・ラベルNo確認</h2>
        <div className="grid">
          <label>
            シールNo
            <input value={sealNo} onChange={(e) => handleSealChange(e.target.value)} placeholder="シールNoを入力" />
          </label>
          <label>
            室名
            <input value={roomName} onChange={(e) => handleRoomChange(e.target.value)} placeholder="室名を入力" />
            {roomSuggestions.length > 0 && (
              <div className="option-list" style={{ marginTop: 6 }}>
                {roomSuggestions.map((room) => (
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => handleRoomChange(room.name)}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            )}
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <QRScanner ref={scannerRef} onResult={handleQrResult} />
        </div>
      </div>
      <footer className="page-footer">
        <button className="ghost" onClick={() => setDuplicateOpen(true)}>複製</button>
        <button className="ghost" onClick={goBack}>戻る</button>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await ensureCameraAccess();
              await scannerRef.current?.start();
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              alert(`カメラを利用できませんでした: ${message}`);
            }
          }}
        >
          QR撮影
        </button>
        <button onClick={goNext} disabled={!readyForNext}>次へ</button>
      </footer>
      <DuplicateOverlay open={duplicateOpen} onClose={() => setDuplicateOpen(false)} />
    </div>
  );
}
