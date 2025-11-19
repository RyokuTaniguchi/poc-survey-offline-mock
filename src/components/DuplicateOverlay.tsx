import React, { useEffect, useMemo, useState } from "react";
import { useDraft } from "../store/useDraft";
import type { Draft } from "../lib/db";

type SortOrder = "asc" | "desc";

interface DuplicateOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function DuplicateOverlay({ open, onClose }: DuplicateOverlayProps) {
  const { listHistory, duplicateDraft } = useDraft();
  const [order, setOrder] = useState<SortOrder>("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Draft[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);

  const refresh = async (currentOrder: SortOrder) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listHistory(currentOrder);
      setItems(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setFeedback(null);
      setCounts({});
      setWorkingId(null);
      void refresh(order);
    } else {
      setError(null);
      setItems([]);
    }
  }, [open, order]);

  const handleOrderToggle = () => {
    setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleDuplicateInput = (id: string, value: string) => {
    setCounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleDuplicate = async (draftId: string) => {
    const raw = counts[draftId] ?? "1";
    const count = Number.parseInt(raw, 10);
    if (!Number.isFinite(count) || count <= 0) {
      setFeedback("複製数は1以上の整数を入力してください");
      return;
    }
    setWorkingId(draftId);
    setFeedback(null);
    try {
      const created = await duplicateDraft(draftId, count);
      setFeedback(`履歴を ${created} 件複製しました`);
      setCounts((prev) => ({ ...prev, [draftId]: "" }));
      await refresh(order);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFeedback(`複製に失敗しました: ${message}`);
    } finally {
      setWorkingId(null);
    }
  };

  const content = useMemo(() => {
    if (loading) return <p className="helper-text">読み込み中...</p>;
    if (error) return <p className="badge warn">エラー: {error}</p>;
    if (items.length === 0) return <p className="helper-text">複製可能な履歴がありません。</p>;
    return items.map((draft) => {
      const fields = draft.fields ?? {};
      const completedAt = fields.completedAt ?? draft.updatedAt;
      const seal = fields.sealNo ?? fields.qr ?? draft.qr ?? "-";
      const asset = fields.assetNo ?? "-";
      const equipment = fields.equipmentNo ?? "-";
      const width = fields.width ?? "-";
      const depth = fields.depth ?? "-";
      const height = fields.height ?? "-";
      const note = fields.note ?? "";
      const countValue = counts[draft.id] ?? "";
      return (
        <div key={draft.id} className="history-row static">
          <div className="history-meta">
            <span>{new Date(completedAt).toLocaleString()}</span>
            <span className="pill">QR {seal}</span>
            {asset !== "-" && <span className="pill">資産 {asset}</span>}
            {equipment !== "-" && <span className="pill">備品 {equipment}</span>}
          </div>
          <div className="history-tags">
            <span className="pill">Category {fields.categoryId ?? "-"}</span>
            <span className="pill">Sub {fields.subcategoryId ?? "-"}</span>
            <span className="pill">Item {fields.itemId ?? "-"}</span>
            <span className="pill">Maker {fields.makerId ?? "-"}</span>
            <span className="pill">Model {fields.modelId ?? "-"}</span>
          </div>
          <div className="history-meta">
            <span>W: {width}</span>
            <span>D: {depth}</span>
            <span>H: {height}</span>
            {note && <span>備考: {note}</span>}
          </div>
          <div className="history-duplicate">
            <input
              type="number"
              min={1}
              placeholder="複製数"
              value={countValue}
              onChange={(e) => handleDuplicateInput(draft.id, e.target.value)}
            />
            <button
              type="button"
              className="secondary"
              onClick={() => handleDuplicate(draft.id)}
              disabled={workingId === draft.id}
            >
              {workingId === draft.id ? "複製中..." : "複製"}
            </button>
          </div>
        </div>
      );
    });
  }, [items, counts, loading, error, workingId]);

  if (!open) return null;

  return (
    <div className="history-overlay">
      <div className="history-panel">
        <div className="history-header">
          <h3>複製</h3>
          <div className="row">
            <button className="ghost" onClick={handleOrderToggle}>
              {order === "asc" ? "降順にする" : "昇順にする"}
            </button>
            <button className="ghost" onClick={onClose}>閉じる</button>
          </div>
        </div>
        {feedback && <p className="badge success" style={{ marginTop: 8 }}>{feedback}</p>}
        <div className="history-list">{content}</div>
      </div>
    </div>
  );
}

