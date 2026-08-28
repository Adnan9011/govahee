import { api } from "@/api/client";
import type {
  BatchRow,
  CertificateDetail,
  CertificateRow,
  CertificateTypeRow,
  DashboardStats,
  Organization,
  Paginated,
  RecipientRow,
  Session,
  SiteConfig,
  TemplateRow,
  VerifyResult,
} from "@/api/types";

export async function fetchSiteConfig() {
  const { data } = await api.get<SiteConfig>("/site/config/");
  return data;
}

export async function login(loginValue: string, password: string) {
  const { data } = await api.post("/auth/login/", { login: loginValue, password });
  return data as { role: string; access?: string };
}

export async function register(payload: {
  full_name: string;
  email: string;
  password: string;
  organization_name: string;
  phone?: string;
}) {
  const { data } = await api.post("/auth/register/", payload);
  return data;
}

export async function logoutSession() {
  await api.post("/auth/logout/");
}

export async function fetchAuthSession() {
  const { data } = await api.get<Session>("/auth/session/");
  return data;
}

export async function fetchDashboard() {
  const { data } = await api.get<DashboardStats>("/dashboard/");
  return data;
}

export async function fetchCertificates(params: Record<string, unknown>) {
  const { data } = await api.get<Paginated<CertificateRow>>("/certificates/", { params });
  return data;
}

export async function fetchCertificate(id: number) {
  const { data } = await api.get<CertificateDetail>(`/certificates/${id}/`);
  return data;
}

export async function issueCertificate(payload: Record<string, unknown>) {
  const { data } = await api.post<CertificateDetail>("/certificates/issue/", payload);
  return data;
}

export async function revokeCertificate(id: number, reason: string) {
  const { data } = await api.post<CertificateDetail>(`/certificates/${id}/revoke/`, { reason });
  return data;
}

export async function sendCertificate(id: number) {
  await api.post(`/certificates/${id}/send/`);
}

export function certificatePdfUrl(id: number) {
  return `/api/certificates/${id}/pdf/`;
}

export async function fetchTemplates() {
  const { data } = await api.get<Paginated<TemplateRow>>("/templates/");
  return data;
}

export async function saveTemplateVersion(id: number, payload: Record<string, unknown>) {
  const { data } = await api.post<TemplateRow>(`/templates/${id}/versions/`, payload);
  return data;
}

export async function fetchCertificateTypes() {
  const { data } = await api.get<Paginated<CertificateTypeRow>>("/certificate-types/");
  return data;
}

export async function fetchRecipients(params: Record<string, unknown>) {
  const { data } = await api.get<Paginated<RecipientRow>>("/recipients/", { params });
  return data;
}

export async function fetchCurrentOrg() {
  const { data } = await api.get<Organization>("/org/current/");
  return data;
}

export async function updateCurrentOrg(payload: Partial<Organization>) {
  const { data } = await api.patch<Organization>("/org/current/", payload);
  return data;
}

export async function completeOnboarding() {
  await api.post("/org/complete-onboarding/");
}

export async function fetchSubscription() {
  const { data } = await api.get("/subscription/");
  return data as {
    subscription: { status: string; plan: string; current_period_end: string } | null;
    entitlements: Record<string, unknown>;
  };
}

export async function fetchPlans() {
  const { data } = await api.get("/plans/");
  return data as Array<{
    code: string;
    name: string;
    name_fa: string;
    price_toman: number;
    capabilities: Record<string, unknown>;
  }>;
}

export async function verifyToken(token: string) {
  const { data } = await api.get<VerifyResult>(`/verify/${token}/`);
  return data;
}

export async function searchCertificate(certificate_number: string, organization_slug?: string) {
  const { data } = await api.post("/verify/search/", { certificate_number, organization_slug });
  return data as { status: string; redirect_token: string };
}

export async function fetchIssuer(slug: string) {
  const { data } = await api.get(`/issuer/${slug}/`);
  return data as {
    name: string;
    slug: string;
    description: string;
    website: string;
    verification_status: string;
    headline: string;
    about: string;
    certificates_issued: number | null;
    disclaimer: string;
  };
}

export async function fetchLegal(kind: string) {
  const { data } = await api.get(`/legal/${kind}/`);
  return data as { kind: string; title_fa: string; title_en: string; body_fa: string; body_en: string };
}

export async function uploadBulk(form: FormData) {
  const { data } = await api.post("/bulk-issue/", form);
  return data as {
    batch: BatchRow;
    headers: string[];
    suggested_mapping: Record<string, string>;
    preview: { row_number: number; data: Record<string, string> }[];
  };
}

export async function startBulkIssue(payload: {
  step: string;
  batch_id: number;
  column_mapping: Record<string, string>;
  send_email?: boolean;
}) {
  const { data } = await api.post("/bulk-issue/", payload);
  return data as BatchRow;
}

export async function fetchBatches() {
  const { data } = await api.get<Paginated<BatchRow>>("/batches/");
  return data;
}

export async function fetchPlatformOrgs() {
  const { data } = await api.get<Organization[]>("/admin/organizations/");
  return data;
}

export async function patchPlatformOrg(payload: Record<string, unknown>) {
  const { data } = await api.patch<Organization>("/admin/organizations/", payload);
  return data;
}

export async function ingestClientLog(_payload: Record<string, unknown>) {
  return Promise.resolve();
}
