import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { theme } from "./theme/theme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConfirmDialogProvider } from "@/components/ui";
import { LocaleProvider, useLocale } from "@/i18n/LocaleContext";
import "./index.css";

const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

const cacheLtr = createCache({
  key: "muiltr",
  stylisPlugins: [prefixer],
});

function ThemedApp() {
  const { dir } = useLocale();
  return (
    <CacheProvider value={dir === "rtl" ? cacheRtl : cacheLtr}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div dir={dir}>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <ConfirmDialogProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </ConfirmDialogProvider>
          </BrowserRouter>
        </div>
      </ThemeProvider>
    </CacheProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <LocaleProvider>
        <ThemedApp />
      </LocaleProvider>
    </HelmetProvider>
  </React.StrictMode>
);
