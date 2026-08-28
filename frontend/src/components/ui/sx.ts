import type { SxProps, Theme } from "@mui/material";

export function mergeSx(
  base: SxProps<Theme>,
  override?: SxProps<Theme>,
): SxProps<Theme> {
  const overrideItems = Array.isArray(override) ? override : [override];
  return [base, ...overrideItems].filter(Boolean) as SxProps<Theme>;
}
