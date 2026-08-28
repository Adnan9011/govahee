import { Helmet } from "react-helmet-async";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "");
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;
const DEFAULT_OG_IMAGE_ALT = "";
const GOOGLE_SITE_VERIFICATION = (
  import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || ""
).trim();

type Props = {
  title?: string | null;
  description?: string;
  path?: string;
  keywords?: string;
  noIndex?: boolean;
  image?: string;
  ogType?: "website" | "article";
};

const DEFAULT_TITLE = "";

function absoluteUrl(value: string): string {
  if (!value) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${SITE_URL}${path}`;
}

export function SeoHead({
  title,
  description = "",
  path = "/",
  keywords = "",
  noIndex = false,
  image,
  ogType = "website",
}: Props) {
  const resolvedTitle = title === null ? null : title ?? DEFAULT_TITLE;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonical =
    normalizedPath === "/" ? `${SITE_URL}/` : `${SITE_URL}${normalizedPath}`;
  const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const usesDefaultOgImage = !image;

  return (
    <Helmet>
      <html lang="fa" dir="rtl" />
      {resolvedTitle ? <title>{resolvedTitle}</title> : null}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content="fa_IR" />
      <meta property="og:site_name" content={resolvedTitle || ""} />
      {resolvedTitle ? <meta property="og:title" content={resolvedTitle} /> : null}
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      {usesDefaultOgImage ? (
        <meta property="og:image:width" content="1024" />
      ) : null}
      {usesDefaultOgImage ? (
        <meta property="og:image:height" content="537" />
      ) : null}
      {usesDefaultOgImage ? (
        <meta property="og:image:alt" content={DEFAULT_OG_IMAGE_ALT} />
      ) : null}
      {GOOGLE_SITE_VERIFICATION ? (
        <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
      ) : null}

      <meta name="twitter:card" content="summary_large_image" />
      {resolvedTitle ? <meta name="twitter:title" content={resolvedTitle} /> : null}
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {/* Twitter does not read og:image:alt, so mirror it here. Only the shared
          default image has a known description; custom covers stay without alt
          rather than get a guessed one. */}
      {usesDefaultOgImage ? (
        <meta name="twitter:image:alt" content={DEFAULT_OG_IMAGE_ALT} />
      ) : null}
    </Helmet>
  );
}

export { SITE_URL as SEO_SITE_URL, DEFAULT_OG_IMAGE };
