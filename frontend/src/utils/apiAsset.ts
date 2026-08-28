/** Normalize API asset URLs so images load on the same origin as the SPA. */
export function resolveApiAssetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("/")) return url;
  try {
    const { pathname, search } = new URL(url);
    return `${pathname}${search}`;
  } catch {
    return url;
  }
}
