import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import { Capacitor } from "@capacitor/core";
import "./i18n";
import "./index.css";

// Service workers are not useful in Capacitor — assets live in the APK.
// A cached SW serves stale JS bundles across APK updates, causing hard-to-
// diagnose bugs. Unregister unconditionally when running native.
if (
  Capacitor.isNativePlatform() ||
  (() => { try { return window.self !== window.top; } catch { return true; } })()
) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
