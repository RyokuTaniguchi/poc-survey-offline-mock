const UNSUPPORTED_ERROR = "\u3053\u306E\u7AEF\u672B\u3067\u306F\u30AB\u30E1\u30E9\u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093";
const NON_BROWSER_ERROR = "\u30D6\u30E9\u30A6\u30B6\u74B0\u5883\u3067\u306F\u3042\u308A\u307E\u305B\u3093";
const INSECURE_CONTEXT_ERROR = "\u30AB\u30E1\u30E9\u306E\u5229\u7528\u306B\u306F HTTPS \u3067\u306E\u63A5\u7D9A\u304C\u5FC5\u8981\u3067\u3059";

type Constraints = MediaStreamConstraints;
type UserMediaFn = (constraints: Constraints) => Promise<MediaStream>;

function resolveGetUserMedia(): UserMediaFn | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  const devices = navigator.mediaDevices;
  if (devices?.getUserMedia) {
    return (constraints: Constraints) => devices.getUserMedia(constraints);
  }
  const legacy =
    (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia || (navigator as any).msGetUserMedia;
  if (!legacy) {
    return null;
  }
  return (constraints: Constraints) =>
    new Promise<MediaStream>((resolve, reject) => {
      legacy.call(navigator, constraints, resolve, reject);
    });
}

export async function ensureCameraAccess(): Promise<"granted" | "denied"> {
  if (typeof navigator === "undefined") {
    throw new Error(NON_BROWSER_ERROR);
  }
  if (typeof window !== "undefined" && "isSecureContext" in window && !window.isSecureContext) {
    throw new Error(INSECURE_CONTEXT_ERROR);
  }

  const getUserMedia = resolveGetUserMedia();
  if (!getUserMedia) {
    throw new Error(UNSUPPORTED_ERROR);
  }

  const cached = sessionStorage.getItem("cameraPermission");
  if (cached === "granted") {
    return "granted";
  }

  try {
    const stream = await getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    stream.getTracks().forEach((track) => track.stop());
    sessionStorage.setItem("cameraPermission", "granted");
    return "granted";
  } catch (error) {
    const err = error as DOMException & { name?: string };
    const isPermissionDenied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
    if (isPermissionDenied) {
      sessionStorage.setItem("cameraPermission", "denied");
    } else {
      sessionStorage.removeItem("cameraPermission");
    }
    throw (error instanceof Error ? error : new Error(String(error)));
  }
}
