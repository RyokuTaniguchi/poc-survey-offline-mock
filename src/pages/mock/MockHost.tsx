import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type MockMode = "login" | "dashboard" | "assets";

function ensureSessionFromIframe(win: Window) {
  const doc = win.document;
  const loginInput = doc.getElementById("login-id") as HTMLInputElement | null;
  const email = loginInput?.value?.trim() || window.sessionStorage.getItem("mockUserEmail") || "survey.operator@example.com";
  const selectedHospital = (win as any).selectedHospitalName;
  const hospital = typeof selectedHospital === "string" && selectedHospital.trim().length > 0 ? selectedHospital.trim() : "";

  window.sessionStorage.setItem("mockToken", "ok");
  window.sessionStorage.setItem("mockUserEmail", email);
  if (hospital) {
    window.sessionStorage.setItem("mockHospitalName", hospital);
  } else {
    window.sessionStorage.removeItem("mockHospitalName");
  }
}

interface MockHostProps {
  mode?: MockMode;
}

export default function MockHost({ mode = "login" }: MockHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;

    const handleLoad = () => {
      const childWindow = iframe.contentWindow;
      if (!childWindow) return;
      const childDocument = childWindow.document;
      const childAny = childWindow as any;

      const syncRoute = (path: string) => {
        if (window.location.pathname !== path) {
          navigate(path, { replace: true });
        }
      };

      const navigateToSurvey = () => {
        try {
          if (typeof childAny.hideLocationInputScreen === "function") {
            childAny.hideLocationInputScreen();
          }
        } catch {
          // ignore cleanup failures in mock script
        }
        ensureSessionFromIframe(childWindow);
        navigate("/survey/home");
      };

      const overrideGlobal = (name: string, handler: (original: any) => any) => {
        const original = childAny[name];
        childAny[name] = handler(typeof original === "function" ? original : undefined);
      };

      overrideGlobal("handleLogin", (original) => function handleLoginPatched(this: unknown, event: Event) {
        if (original) {
          original.call(this, event);
        }
        ensureSessionFromIframe(childWindow);
        const loginValue = (childDocument.getElementById("login-id") as HTMLInputElement | null)?.value ?? "";
        if (loginValue.includes("@hospital")) {
          showAssetList();
        } else {
          showDashboard();
        }
      });

      overrideGlobal("selectHospital", (original) => function selectHospitalPatched(this: unknown, ...args: unknown[]) {
        if (original) {
          original.apply(this, args);
        }
        ensureSessionFromIframe(childWindow);
      });

      overrideGlobal("showAssetListScreen", (original) => function showAssetListScreenPatched(this: unknown, ...args: unknown[]) {
        if (original) {
          original.apply(this, args);
        }
        ensureSessionFromIframe(childWindow);
        syncRoute("/mock/assets");
      });

      overrideGlobal("hideAssetListScreen", (original) => function hideAssetListScreenPatched(this: unknown, ...args: unknown[]) {
        if (original) {
          original.apply(this, args);
        }
        showDashboard();
      });

      overrideGlobal("showLocationInputScreen", () => function showLocationInputScreenPatched() {
        navigateToSurvey();
      });

      overrideGlobal("handleNext", () => function handleNextPatched() {
        const surveyDate = childDocument.getElementById("surveyDate")?.textContent ?? "";
        const category = (childDocument.getElementById("categoryInput") as HTMLInputElement | null)?.value ?? "";
        const building = (childDocument.getElementById("buildingSelect") as HTMLSelectElement | null)?.value ?? "";
        const floor = (childDocument.getElementById("floorSelect") as HTMLSelectElement | null)?.value ?? "";
        const department = (childDocument.getElementById("departmentSelect") as HTMLSelectElement | null)?.value ?? "";
        const section = (childDocument.getElementById("sectionSelect") as HTMLSelectElement | null)?.value ?? "";
        console.log("調査場所データ:", { surveyDate, category, building, floor, department, section });
        navigateToSurvey();
      });

      if (mode !== "login") {
        ensureSessionFromIframe(childWindow);
      }

      const loginPage = childDocument.getElementById("loginPage");
      const mainLayout = childDocument.getElementById("mainLayout");
      const assetListScreen = childDocument.getElementById("assetListScreen");

      const showLogin = () => {
        if (loginPage) loginPage.style.display = "flex";
        if (mainLayout) {
          mainLayout.classList.remove("active");
          mainLayout.style.display = "none";
        }
        if (assetListScreen) assetListScreen.classList.remove("active");
        if (!window.location.pathname.startsWith("/mock")) {
          navigate("/mock/login", { replace: true });
        }
        syncRoute("/mock/login");
      };

      const showDashboard = () => {
        if (loginPage) loginPage.style.display = "none";
        if (assetListScreen) assetListScreen.classList.remove("active");
        if (mainLayout) {
          mainLayout.classList.add("active");
          mainLayout.style.display = "flex";
        }
        if (!window.location.pathname.startsWith("/mock")) {
          navigate("/mock/dashboard", { replace: true });
        }
        syncRoute("/mock/dashboard");
      };

      const showAssetList = () => {
        const loginInput = childDocument.getElementById("login-id") as HTMLInputElement | null;
        if (loginInput && !loginInput.value.includes("@hospital")) {
          loginInput.value = "demo@hospital.example";
        }
        if (typeof childAny.showAssetListScreen === "function") {
          childAny.showAssetListScreen();
        } else {
          if (loginPage) loginPage.style.display = "none";
          if (mainLayout) {
            mainLayout.classList.remove("active");
            mainLayout.style.display = "none";
          }
          if (assetListScreen) assetListScreen.classList.add("active");
        }
        if (!window.location.pathname.startsWith("/mock")) {
          navigate("/mock/assets", { replace: true });
        }
        syncRoute("/mock/assets");
      };

      if (mode === "login") {
        showLogin();
      } else if (mode === "dashboard") {
        showDashboard();
      } else if (mode === "assets") {
        showAssetList();
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [mode, navigate]);

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", background: "#f5f7fa" }}>
      <iframe ref={iframeRef} title="医療コンサル管理システム モック" src="/mock/index.html" style={{ width: "100%", height: "100%", border: "none" }} />
    </div>
  );
}

