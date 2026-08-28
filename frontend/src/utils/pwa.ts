import { APP_VERSION } from "@/appVersion";

const DISMISS_KEY = "nobita-pwa-install-dismissed";
const VERSION_RELOAD_KEY = "nobita-version-reload";
const VERSION_URL = "/version.json";
/** How often to ask the service worker / version.json for updates. */
const UPDATE_CHECK_MS = 5 * 60 * 1000;

/** Reserved bottom space so fixed install banner does not cover page content. */
export const PWA_BANNER_OFFSET_VAR = "--pwa-banner-offset";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installPromptListeners = new Set<() => void>();

/** Capture the browser install event early so React StrictMode remounts do not miss it. */
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    installPromptListeners.forEach((listener) => listener());
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

export function subscribePwaInstallPrompt(listener: () => void): () => void {
  installPromptListeners.add(listener);
  return () => {
    installPromptListeners.delete(listener);
  };
}

export function setPwaBannerOffset(px: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    PWA_BANNER_OFFSET_VAR,
    `${Math.ceil(px)}px`,
  );
}

export function clearPwaBannerOffset(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty(PWA_BANNER_OFFSET_VAR);
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Phones/tablets where the install banner should appear without waiting for bip. */
export function isMobileInstallTarget(): boolean {
  return isIosDevice() || isAndroidDevice();
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMq = window.matchMedia?.("(display-mode: standalone)");
  return (
    (standaloneMq?.matches ?? false) ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isPwaInstallDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissPwaInstallPrompt(): void {
  localStorage.setItem(DISMISS_KEY, "1");
}

export function canShowPwaInstallPrompt(): boolean {
  return !isStandaloneMode() && !isPwaInstallDismissed();
}

/**
 * Reload once when a waiting service worker takes control (new deploy).
 * Only arms after an existing controller so the first install does not loop.
 */
export function reloadOnServiceWorkerUpdate(
  serviceWorker: ServiceWorkerContainer | undefined =
    typeof navigator !== "undefined" ? navigator.serviceWorker : undefined,
  reload: () => void = () => window.location.reload(),
): () => void {
  if (!serviceWorker?.controller) return () => undefined;

  let reloading = false;
  const handleControllerChange = () => {
    if (reloading) return;
    reloading = true;
    reload();
  };

  serviceWorker.addEventListener("controllerchange", handleControllerChange);
  return () => serviceWorker.removeEventListener("controllerchange", handleControllerChange);
}

/** Drop SW + Cache Storage so the next load is not served from a stale PWA cache. */
export async function clearPwaCachesAndUnregister(
  serviceWorker: ServiceWorkerContainer | undefined =
    typeof navigator !== "undefined" ? navigator.serviceWorker : undefined,
  cacheStorage: CacheStorage | undefined =
    typeof caches !== "undefined" ? caches : undefined,
): Promise<void> {
  if (serviceWorker?.getRegistrations) {
    const regs = await serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
  if (cacheStorage?.keys) {
    const keys = await cacheStorage.keys();
    await Promise.all(keys.map((key) => cacheStorage.delete(key)));
  }
}

export async function forceAppRefresh(
  reload: () => void = () => {
    window.location.reload();
  },
  clearCaches: () => Promise<void> = clearPwaCachesAndUnregister,
): Promise<void> {
  try {
    await clearCaches();
  } catch {
    // Still reload even if cache clear fails.
  }
  reload();
}

type VersionPayload = { version?: string };

export async function fetchRemoteAppVersion(
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchImpl(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionPayload;
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

/**
 * If the server advertises a newer app version than this JS bundle, clear PWA
 * caches and reload once (guarded by sessionStorage to avoid loops).
 */
export async function reloadIfAppVersionStale(options?: {
  localVersion?: string;
  fetchRemote?: () => Promise<string | null>;
  forceRefresh?: () => Promise<void>;
  storage?: Storage;
}): Promise<boolean> {
  const localVersion = options?.localVersion ?? APP_VERSION;
  const fetchRemote = options?.fetchRemote ?? fetchRemoteAppVersion;
  const forceRefresh = options?.forceRefresh ?? forceAppRefresh;
  const storage =
    options?.storage ??
    (typeof sessionStorage !== "undefined" ? sessionStorage : undefined);

  const remote = await fetchRemote();
  if (!remote || remote === localVersion) {
    storage?.removeItem(VERSION_RELOAD_KEY);
    return false;
  }

  if (storage?.getItem(VERSION_RELOAD_KEY) === remote) {
    return false;
  }
  storage?.setItem(VERSION_RELOAD_KEY, remote);
  await forceRefresh();
  return true;
}

type RegisterSW = (options?: {
  immediate?: boolean;
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
}) => (reloadPage?: boolean) => Promise<void>;

/**
 * Register the Vite PWA service worker, poll for updates, and force a refresh
 * when /version.json no longer matches the bundled APP_VERSION.
 */
export function setupPwaAutoRefresh(registerSW: RegisterSW): () => void {
  reloadOnServiceWorkerUpdate();

  let registration: ServiceWorkerRegistration | undefined;
  let disposed = false;

  const check = () => {
    if (disposed) return;
    void registration?.update();
    void reloadIfAppVersionStale();
  };

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, reg) {
      registration = reg;
      check();
    },
  });

  const intervalId = window.setInterval(check, UPDATE_CHECK_MS);

  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", check);

  // First paint may race SW registration; still check version.json soon.
  void reloadIfAppVersionStale();

  return () => {
    disposed = true;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", check);
  };
}
