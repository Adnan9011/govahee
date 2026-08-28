import type { Theme } from "@mui/material/styles";

export function getAppHeaderOffset(theme: Theme): number {
  const toolbar = theme.mixins.toolbar.minHeight;
  return typeof toolbar === "number" ? toolbar : 64;
}

export function scrollIntoViewWithOffset(node: HTMLElement | null, offset: number): void {
  if (!node) return;

  const rect = node.getBoundingClientRect();
  const targetTop = window.scrollY + rect.top - offset;
  window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}
