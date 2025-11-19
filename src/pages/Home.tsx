import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadMastersFromLocal } from "../lib/prep";
import { db } from "../lib/db";
import { useDraft } from "../store/useDraft";
import { useOnlineStatus } from "../util/useOnlineStatus";
import { ensureCameraAccess } from "../lib/camera";
import { ensureOcrReady } from "../lib/ocr";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const completedCount = useDraft((s) => s.completedCount);
  const purgeCompleted = useDraft((s) => s.purgeCompleted);
  const [downloading, setDownloading] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [cameraReady, setCameraReady] = useState(false);
  const [readyForSurvey, setReadyForSurvey] = useState(false);
  const [ocrReady, setOcrReady] = useState(false);

  const clearMastersAndSettings = async () => {
    const stores = [
      db.location_buildings,
      db.location_floors,
      db.location_departments,
      db.location_divisions,
      db.location_rooms,
      db.product_categories,
      db.product_subcategories,
      db.product_items,
      db.product_makers,
      db.product_models,
      db.survey_masters,
      db.indices,
    ];
    await db.transaction("rw", ...stores, db.settings, async () => {
      await Promise.all(stores.map((store) => store.clear()));
      await db.settings.delete("mastersDownloadedAt");
    });
  };

  useEffect(() => {
    const cached = sessionStorage.getItem("cameraPermission");
    if (cached === "granted" || cached === "denied") {
      const granted = cached === "granted";
      setCameraStatus(granted ? "granted" : "denied");
      setCameraReady(granted);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReadyForSurvey(false);
    setDownloadedAt(null);
    const run = async () => {
      try {
        await clearMastersAndSettings();
        if (!cancelled) {
          setMessages((prev) => [...prev, "過去のマスタデータをクリアしました。事前ダウンロードを実行してください。"]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setMessages((prev) => [...prev, "マスタデータの初期化に失敗しました: " + message]);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    setReadyForSurvey(false);
    setCameraReady(false);
    setOcrReady(false);
    setDownloadedAt(null);
    setMessages((prev) => [...prev, "マスタCSVの読み込みを開始しました"]);
    try {
      setMessages((prev) => [...prev, "既存のマスタデータをクリアしています…"]);
      await clearMastersAndSettings();
      setMessages((prev) => [...prev, "既存のマスタデータをクリアしました。"]);
      await Promise.all([
        import("./survey/Department"),
        import("./survey/Label"),
        import("./survey/Asset"),
        import("./survey/Product"),
        import("../lib/qr"),
      ]);
      await downloadMastersFromLocal();
      const timestamp = new Date().toISOString();
      setDownloadedAt(timestamp);
      setReadyForSurvey(true);
      setMessages((prev) => [...prev, "マスタCSVをローカルDBへ保存しました"]);
      setMessages((prev) => [...prev, "カメラアクセスをリクエストします"]);
      try {
        await ensureCameraAccess();
        setCameraStatus("granted");
        setCameraReady(true);
        setMessages((prev) => [...prev, "カメラアクセスを取得しました"]);
      } catch (cameraError) {
        const message = cameraError instanceof Error ? cameraError.message : String(cameraError);
        const permission = sessionStorage.getItem("cameraPermission");
        const denied = permission === "denied";
        setCameraStatus(denied ? "denied" : "unknown");
        setCameraReady(false);
        setMessages((prev) => [...prev, `カメラアクセスに失敗しました: ${message}`]);
      }
      setMessages((prev) => [...prev, "Tesseract OCRの準備を行っています…"]);
      try {
        await ensureOcrReady();
        setOcrReady(true);
        setMessages((prev) => [...prev, "Tesseract OCRの準備が完了しました"]);
      } catch (ocrError) {
        const message = ocrError instanceof Error ? ocrError.message : String(ocrError);
        setOcrReady(false);
        setMessages((prev) => [...prev, `Tesseract OCRの準備に失敗しました: ${message}`]);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setReadyForSurvey(false);
      setCameraReady(false);
      setOcrReady(false);
      setMessages((prev) => [...prev, `エラー: ${message}`]);
    } finally {
      setDownloading(false);
    }
  };

  const handleStartSurvey = () => {
    sessionStorage.setItem("surveyActive", "1");
    navigate("/survey/department");
  };

  const handleCompleteSurvey = async () => {
    if (!online) return;
    sessionStorage.removeItem("surveyActive");
    sessionStorage.removeItem("visitedDepartment");
    setMessages((prev) => [...prev, "送信処理（ダミー）: Phase2で実装予定です"]);
    try {
      const removed = await purgeCompleted();
      if (removed > 0) {
        setMessages((prev) => [...prev, `ローカルに保存されていた作業済みデータを削除しました（${removed}件）`]);
      } else {
        setMessages((prev) => [...prev, "削除対象の作業済みデータはありませんでした"]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, `作業済みデータ削除時にエラーが発生しました: ${message}`]);
    }
  };

  const mastersReady = readyForSurvey && cameraStatus !== "denied" && ocrReady;
  const visitedDepartment = sessionStorage.getItem("visitedDepartment") === "1";
  const showCompleteButton = visitedDepartment && completedCount > 0;

  const lastDownloadedAt = downloadedAt ? new Date(downloadedAt).toLocaleString() : "未ダウンロード";
  const onlineStatusText = online ? "オンライン" : "オフライン";
  const cameraStatusText = cameraStatus === "granted" ? "利用可能" : cameraStatus === "denied" ? "拒否されています" : "未確認";

  return (
    <div className="page survey-home-page">
      <div className="survey-home">
        <section className="survey-home__hero">
          <div className="survey-home__hero-top">
            <span className="survey-home__label">現地登録モード</span>
            <h1 className="survey-home__title">現有資産登録</h1>
            <p className="survey-home__description">
              オフライン環境での現地登録を行う前に、マスタデータのダウンロードとカメラアクセスの事前確認を完了してください。
              調査開始後は /survey/ 配下の画面のみオフライン遷移が許可されます。
            </p>
          </div>
          <div className="survey-home__hero-actions">
            <button type="button" onClick={handleDownload} disabled={downloading}>
              事前ダウンロードを実行
            </button>
            {readyForSurvey && <span className="survey-home__badge">最終更新: {lastDownloadedAt}</span>}
            {cameraStatus === "granted" && <span className="survey-home__badge">カメラアクセス: 許可済み</span>}
            {cameraStatus === "denied" && <span className="survey-home__badge">カメラアクセス: 許可なし</span>}
          </div>
          {error && (
            <div className="survey-home__badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#b91c1c" }}>
              エラー: {error}
            </div>
          )}
        </section>

        <section className="survey-home__status-grid">
          <div className={`survey-home__status-card${readyForSurvey ? "" : " status-card--warn"}`}>
            <h3>事前ダウンロード</h3>
            <strong>{readyForSurvey ? "完了" : "未実行"}</strong>
            <span>{lastDownloadedAt}</span>
          </div>
          <div className="survey-home__status-card">
            <h3>通信状態</h3>
            <strong>{onlineStatusText}</strong>
            <span>オンライン時のみ送信処理が有効です</span>
          </div>
          <div className="survey-home__status-card">
            <h3>作業済み件数</h3>
            <strong>{completedCount}件</strong>
            <span>調査完了後にサーバー送信予定（Phase2）</span>
          </div>
          <div className={`survey-home__status-card${cameraReady ? "" : " status-card--warn"}`}>
            <h3>カメラステータス</h3>
            <strong>{cameraStatusText}</strong>
            <span>QRコード読取と撮影に使用します</span>
          </div>
        </section>

        <section className="survey-home__actions">
          <div className="survey-home__actions-text">
            <h3>現地登録を開始する</h3>
            <p>部署入力 → QRコード読取 → 写真撮影 → 商品登録の順に進みます。</p>
          </div>
          <div className="survey-home__actions-buttons">
            <button type="button" onClick={handleStartSurvey} disabled={!mastersReady}>
              調査を開始
            </button>
            {showCompleteButton && (
              <button type="button" className="ghost" onClick={handleCompleteSurvey} disabled={!online}>
                調査完了（送信想定）
              </button>
            )}
          </div>
        </section>

        <section className="survey-home__log">
          <div className="survey-home__log-header">
            <h2>アクティビティログ</h2>
            <span>{messages.length} 件</span>
          </div>
          <div className="survey-home__log-body">
            {messages.length === 0 && <div className="survey-home__empty">まだログはありません。事前ダウンロードを実行すると進捗が表示されます。</div>}
            {messages.map((line, idx) => {
              const isError = line.startsWith("エラー") || line.includes("失敗") || line.includes("エラーが発生");
              return (
                <div key={idx} className={`survey-home__log-line${isError ? " is-error" : ""}`}>
                  {line}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}










