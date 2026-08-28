import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { createRequestId, logger } from "@/utils/logger";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const SESSION_REQUEST_ID_KEY = "client_request_id";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

function getOrCreateRequestId(): string {
  let id = sessionStorage.getItem(SESSION_REQUEST_ID_KEY);
  if (!id) {
    id = createRequestId();
    sessionStorage.setItem(SESSION_REQUEST_ID_KEY, id);
  }
  logger.setRequestId(id);
  return id;
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers.set("X-Request-ID", getOrCreateRequestId());

  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData) {
    // false/omit so Axios does not send an empty Content-Type that Django
    // middleware used to rewrite as application/json (breaks multipart).
    config.headers.setContentType(false);
    return config;
  }

  const method = (config.method ?? "get").toLowerCase();
  const hasJsonBody =
    config.data != null &&
    typeof config.data === "object" &&
    !(config.data instanceof ArrayBuffer) &&
    !(config.data instanceof Blob);

  // Always force JSON for object bodies. Axios may leave Content-Type as an
  // empty/undefined header which Django/DRF rejects with HTTP 415.
  if (hasJsonBody && ["post", "put", "patch"].includes(method)) {
    config.headers.setContentType("application/json");
  }

  if (import.meta.env.DEV) {
    logger.debug(`API ${method.toUpperCase()} ${config.url ?? ""}`);
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

function isAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return url.endsWith("/token/") || url.endsWith("/token/refresh/");
}

api.interceptors.response.use(
  (response) => {
    const rid = response.headers["x-request-id"];
    if (typeof rid === "string" && rid) {
      logger.setRequestId(rid);
      sessionStorage.setItem(SESSION_REQUEST_ID_KEY, rid);
    }
    if (import.meta.env.DEV) {
      logger.debug(`API response ${response.status} ${response.config.url ?? ""}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      skipAuthRedirect?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isAuthRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await axios.post(`${API_BASE}/token/refresh/`, {}, { withCredentials: true });
      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      sessionStorage.removeItem("auth_role");
      if (!originalRequest.skipAuthRedirect) {
        window.location.href = "/?login=1";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

function responseErrorMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed || trimmed.startsWith("<")) return null;
    return trimmed;
  }
  if (Array.isArray(data)) return data.map(String).join(" ");

  const payload = data as Record<string, unknown>;
  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail.trim();
  }
  const fieldLabels: Record<string, string> = {
    data: "اطلاعات فرم",
    user: "کاربر",
    category: "دسته پرونده",
    service: "پرونده",
    audio_file: "فایل صوتی",
    schema: "ساختار فرم",
    non_field_errors: "",
    service_date: "تاریخ سرویس",
    scheduled_start: "زمان نوبت",
    practitioner: "پرسنل",
    manager: "مرکز",
    contact_phone: "شماره تماس",
    customer_contact: "نام کاربر",
    cost: "قیمت",
  };
  const withLabel = (key: string, message: string): string => {
    const label = fieldLabels[key] ?? key;
    return label ? `${label}: ${message}` : message;
  };
  const collect = (value: unknown): string[] => {
    if (typeof value === "string") return value.trim() ? [value.trim()] : [];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
        collect(nested).map((message) => withLabel(key, message))
      );
    }
    return [];
  };
  const parts = Object.entries(payload).flatMap(([key, value]) =>
    collect(value).map((message) => withLabel(key, message))
  );
  return parts.length ? parts.join(" — ") : null;
}

export function getApiErrorMessage(
  err: unknown,
  fallback = "انجام درخواست ناموفق بود. لطفاً دوباره تلاش کنید."
): string {
  if (!axios.isAxiosError(err)) {
    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return fallback;
  }

  const status = err.response?.status;
  if (status === 413) {
    return "حجم فایل بیش از حد مجاز است. فایل کوچک‌تری انتخاب کنید.";
  }

  if (err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout")) {
    return "آپلود طولانی شد. اتصال اینترنت را بررسی کنید یا فایل کوچک‌تری بفرستید.";
  }

  if (!err.response) {
    return "ارتباط با سرور قطع شد. لطفاً دوباره تلاش کنید.";
  }

  const responseMessage = responseErrorMessage(err.response.data);
  if (responseMessage) return responseMessage;

  if (status === 502 || status === 503 || status === 504) {
    return "سرور در دسترس نیست. لطفاً چند لحظه دیگر تلاش کنید.";
  }

  return fallback;
}

export function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}
