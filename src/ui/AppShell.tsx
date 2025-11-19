import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useOnlineStatus } from "../util/useOnlineStatus";
import { useStorageEstimate } from "../util/useStorageEstimate";
import { useDraft } from "../store/useDraft";

function getSessionValue(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = sessionStorage.getItem(key);
  return value && value.trim().length > 0 ? value : fallback;
}

export default function AppShell() {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("mockToken") : null;
  if (!token) {
    return <Navigate to="/" replace />;
  }

  const hospitalName = getSessionValue("mockHospitalName", "");
  const userEmail = getSessionValue("mockUserEmail", "survey.operator@example.com");

  const online = useOnlineStatus();
  const { usedMB, quotaMB } = useStorageEstimate();
  const completedCount = useDraft((s) => s.completedCount);
  const showHospitalName = hospitalName.trim().length > 0;

  return (
    <div className="app survey-app">
      <header className="survey-header">
        <div className="survey-header__top">
          <span className="survey-header__chip">現地登録アプリ</span>
          <p className="survey-header__user">{userEmail}</p>
        </div>
        {showHospitalName && <h1 className="survey-header__title">{hospitalName}</h1>}
        <div className="survey-header__stats">
          <div className={`survey-badge${online ? " is-online" : " is-offline"}`}>
            <span className="survey-badge__label">通信状態</span>
            <span className="survey-badge__value">{online ? "オンライン" : "オフライン"}</span>
          </div>
          <div className="survey-badge">
            <span className="survey-badge__label">ストレージ</span>
            <span className="survey-badge__value">{usedMB.toFixed(1)} / {quotaMB.toFixed(1)} MB</span>
          </div>
          <div className="survey-badge">
            <span className="survey-badge__label">作業済み</span>
            <span className="survey-badge__value">{completedCount} 件</span>
          </div>
        </div>
      </header>
      <main className="survey-main">
        <div className="survey-main__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
