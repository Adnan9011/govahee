export type Role = "platform_admin" | "member";

export type ChartGranularity = "day" | "week" | "month";

export interface AttachmentSettings {
  max_image_size_mb: number;
  max_audio_size_mb: number;
  max_document_size_mb: number;
  max_attachments_per_record: number;
  allowed_image_extensions: string;
  allowed_audio_extensions: string;
  allowed_document_extensions: string;
  image_upload_enabled: boolean;
  audio_upload_enabled: boolean;
  document_upload_enabled: boolean;
}

export interface SiteConfig {
  display_name: string;
  display_name_fa: string;
  default_locale: string;
  support_email: string;
}

export interface Membership {
  organization_id: number;
  organization_name: string;
  organization_slug: string;
  role: string;
  onboarding_completed: boolean;
}

export interface Session {
  role: Role;
  user: {
    id?: number;
    email?: string | null;
    phone?: string | null;
    full_name?: string;
    is_platform_admin?: boolean;
  };
  memberships: Membership[];
}

export interface DashboardStats {
  issued: number;
  active: number;
  expired: number;
  revoked: number;
  this_month: number;
  this_week: number;
  recipients: number;
  verifications: number;
  downloads: number;
  views: number;
  shares: number;
  entitlements: Record<string, unknown>;
  usage_issued: number;
  recent_certificates: CertificateRow[];
  recent_batches: BatchRow[];
}

export interface CertificateRow {
  id: number;
  uuid: string;
  certificate_number: string;
  status: string;
  public_status: string;
  title: string;
  course_name: string;
  issue_date: string | null;
  expiry_date: string | null;
  recipient_name: string;
  recipient_email: string;
  verification_url: string;
  view_count: number;
  download_count: number;
  verification_count: number;
  created_at: string;
}

export interface CertificateDetail extends CertificateRow {
  recipient: {
    id: number;
    email: string;
    full_name: string;
  };
  duration: string;
  score: string;
  grade: string;
  instructor_name: string;
  issuer_name: string;
  description: string;
  skills: string[];
  custom_fields: Record<string, string>;
  revoke_reason: string;
  integrity_hash: string;
  events: { kind: string; created_at: string; metadata: Record<string, unknown> }[];
}

export interface TemplateRow {
  id: number;
  name: string;
  description: string;
  format: string;
  locale: string;
  is_system: boolean;
  is_active?: boolean;
  current_version: {
    id: number;
    version: number;
    canvas: Record<string, unknown>;
    variables: string[];
  } | null;
}

export interface CertificateTypeRow {
  id: number;
  name: string;
  slug: string;
  default_template: number | null;
}

export interface RecipientRow {
  id: number;
  email: string;
  full_name: string;
  phone: string;
}

export interface BatchRow {
  id: number;
  status: string;
  source_filename: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  created_at: string;
  zip_ready?: boolean;
  error_report?: { row: number; errors: string[] }[];
  send_email?: boolean;
}

export interface BulkValidateResult {
  batch: BatchRow;
  errors: { row: number; errors: string[] }[];
  preview: { row_number: number; data: Record<string, string>; errors: string[]; status: string }[];
  valid_count: number;
  invalid_count: number;
}

export interface UploadedFile {
  id: number;
  original_name: string;
  size: number;
  mime_type: string;
  url: string;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

export interface VerifyResult {
  status: string;
  recipient_name?: string;
  title?: string;
  course_name?: string;
  issuer_name?: string;
  organization_name?: string;
  issue_date?: string;
  expiry_date?: string;
  certificate_number?: string;
  verification_url?: string;
  disclaimer?: string;
  duration?: string;
  score?: string;
  grade?: string;
  instructor_name?: string;
  description?: string;
  indexable?: boolean;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  legal_name: string;
  license_number: string;
  website: string;
  certificate_number_prefix: string;
  verification_status: string;
  verification_indexable: boolean;
  locale: string;
  onboarding_completed_at?: string | null;
}
