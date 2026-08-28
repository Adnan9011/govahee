import { api } from "@/api/client";
import type {
  BatchRow,
  BulkValidateResult,
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
  UploadedFile,
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

export async function fetchTemplate(id: number) {
  const { data } = await api.get<TemplateRow>(`/templates/${id}/`);
  return data;
}

export async function createTemplate(payload: { name: string; format?: string; locale?: string }) {
  const { data } = await api.post<TemplateRow>("/templates/", payload);
  return data;
}

export async function saveTemplateVersion(id: number, payload: Record<string, unknown>) {
  const { data } = await api.post<TemplateRow>(`/templates/${id}/versions/`, payload);
  return data;
}

export async function uploadAttachment(form: FormData) {
  const { data } = await api.post<{ id: number; url: string; original_name: string }>("/attachments/upload/", form);
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

export async function fetchPlans() {
  const { data } = await api.get("/plans/");
  return data as Array<{
    id: number;
    code: string;
    name: string;
    name_fa: string;
    price_toman: number;
    capabilities: Record<string, unknown>;
  }>;
}

export async function fetchSubscription() {
  const { data } = await api.get("/subscription/");
  return data as {
    subscription: { status: string; plan: string; current_period_end: string } | null;
    entitlements: Record<string, unknown>;
    gateways?: { bitpay: boolean; zibal: boolean };
  };
}

export async function startPayment(gateway: string, plan_id: number) {
  const { data } = await api.post("/payments/start/", { gateway, plan_id });
  return data as { redirect_url: string; id: number };
}

export async function fetchTeam() {
  const { data } = await api.get<Paginated<{ id: number; email: string; full_name: string; role: string; is_active: boolean }>>("/team/");
  return data;
}

export async function inviteMember(payload: { email: string; role: string; full_name?: string }) {
  const { data } = await api.post("/team/", payload);
  return data;
}

export async function removeMember(id: number) {
  await api.delete(`/team/${id}/`);
}

export async function fetchAnalytics() {
  const { data } = await api.get("/analytics/");
  return data as {
    series: { date: string; issued: number; verified: number }[];
    top_courses: { name: string; count: number }[];
    top_templates: { name: string; count: number }[];
    top_countries: { country: string; count: number }[];
    unique_visitors: number;
    verifications: number;
  };
}

export async function fetchApiKeys() {
  const { data } = await api.get<Paginated<{
    id: number;
    name: string;
    prefix: string;
    permissions: string[];
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string;
  }>>("/api-keys/");
  return data;
}

export async function createApiKey(payload: { name: string; permissions: string[] }) {
  const { data } = await api.post("/api-keys/", payload);
  return data as { id: number; key: string; name: string; prefix: string };
}

export async function revokeApiKey(id: number) {
  await api.delete(`/api-keys/${id}/`);
}

export async function fetchWebhooks() {
  const { data } = await api.get<Paginated<{ id: number; url: string; events: string[]; is_active: boolean }>>("/webhooks/");
  return data;
}

export async function createWebhook(payload: { url: string; events: string[] }) {
  const { data } = await api.post("/webhooks/", payload);
  return data;
}

export async function fetchCustomFields() {
  const { data } = await api.get<Paginated<{
    id: number;
    key: string;
    label: string;
    field_type: string;
    is_public: boolean;
  }>>("/custom-fields/");
  return data;
}

export async function createCustomField(payload: Record<string, unknown>) {
  const { data } = await api.post("/custom-fields/", payload);
  return data;
}

export async function fetchEmailTemplates() {
  const { data } = await api.get<Paginated<{ id: number; kind: string; subject: string; body: string; is_active: boolean }>>("/email-templates/");
  return data;
}

export async function updateEmailTemplate(id: number, payload: Record<string, unknown>) {
  const { data } = await api.patch(`/email-templates/${id}/`, payload);
  return data;
}

export async function fetchBranding() {
  const { data } = await api.get("/branding/");
  return data as {
    primary_color: string;
    secondary_color: string;
    font_family: string;
    email_from_name: string;
    verification_footer: string;
    logo_file: number | null;
    logo_url: string | null;
  };
}

export async function updateBranding(payload: Record<string, unknown>) {
  const { data } = await api.patch("/branding/", payload);
  return data;
}

export async function exportCertificatesCsv() {
  const { data } = await api.get("/certificates/export/", { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "certificates.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function setPassword(uid: string, token: string, password: string) {
  await api.post("/auth/set-password/", { uid, token, password });
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

export async function validateBulk(payload: {
  batch_id: number;
  column_mapping: Record<string, string>;
}) {
  const { data } = await api.post("/bulk-issue/", { step: "validate", ...payload });
  return data as {
    batch: BatchRow;
    errors: { row: number; errors: string[] }[];
    preview: { row_number: number; data: Record<string, string>; errors: string[]; status: string }[];
    valid_count: number;
    invalid_count: number;
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

export async function fetchBatch(id: number) {
  const { data } = await api.get<BatchRow>(`/batches/${id}/`);
  return data;
}

export async function downloadBatchZip(id: number) {
  const { data } = await api.get(`/batches/${id}/zip/`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch-${id}.zip`;
  a.click();
  URL.revokeObjectURL(url);
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
