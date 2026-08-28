import { Box } from "@mui/material";
import type { PointerEvent } from "react";
import type { CanvasDoc, CanvasElement } from "@/certificate/types";
import { substituteVars } from "@/certificate/types";

type Props = {
  canvas: CanvasDoc;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onChangeElement?: (id: string, patch: Partial<CanvasElement>) => void;
  previewVars?: Record<string, string> | null;
};

export function CertificateStage({ canvas, selectedId, onSelect, onChangeElement, previewVars }: Props) {
  const width = canvas.width_mm || 297;
  const height = canvas.height_mm || 210;
  const bg = canvas.background?.color || "#ffffff";

  const sheetFrom = (el: HTMLElement) => el.closest("[data-sheet]") as HTMLElement | null;

  const applyMove = (target: HTMLElement, e: PointerEvent<HTMLDivElement>) => {
    if (!onChangeElement) return;
    const sheet = sheetFrom(target);
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    const originX = Number(target.dataset.originX);
    const originY = Number(target.dataset.originY);
    const startX = Number(target.dataset.startX);
    const startY = Number(target.dataset.startY);
    const dx = ((e.clientX - startX) / rect.width) * width;
    const dy = ((e.clientY - startY) / rect.height) * height;
    onChangeElement(target.dataset.elId || "", {
      x: Math.max(0, Math.round((originX + dx) * 10) / 10),
      y: Math.max(0, Math.round((originY + dy) * 10) / 10),
    });
  };

  const applyResize = (target: HTMLElement, e: PointerEvent<HTMLDivElement>) => {
    if (!onChangeElement) return;
    const sheet = sheetFrom(target);
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    const originW = Number(target.dataset.originW);
    const originH = Number(target.dataset.originH);
    const startX = Number(target.dataset.startX);
    const startY = Number(target.dataset.startY);
    const dw = ((e.clientX - startX) / rect.width) * width;
    const dh = ((e.clientY - startY) / rect.height) * height;
    onChangeElement(target.dataset.elId || "", {
      width: Math.max(8, Math.round((originW + dw) * 10) / 10),
      height: Math.max(4, Math.round((originH + dh) * 10) / 10),
    });
  };

  return (
    <Box
      data-sheet
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 960,
        aspectRatio: `${width} / ${height}`,
        bgcolor: bg,
        color: "#111",
        borderRadius: 1,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(15,23,42,0.12)",
        userSelect: "none",
      }}
    >
      {(canvas.elements || []).map((el) => {
        const selected = selectedId === el.id;
        const content = previewVars ? substituteVars(el.content || "", previewVars) : el.content;
        return (
          <Box
            key={el.id}
            data-el-id={el.id}
            onPointerDown={(e) => {
              if (!onSelect && !onChangeElement) return;
              const target = e.currentTarget;
              target.dataset.originX = String(el.x);
              target.dataset.originY = String(el.y);
              target.dataset.originW = String(el.width);
              target.dataset.originH = String(el.height);
              target.dataset.startX = String(e.clientX);
              target.dataset.startY = String(e.clientY);
              target.dataset.mode = (e.target as HTMLElement).dataset.handle === "resize" ? "resize" : "move";
              target.setPointerCapture(e.pointerId);
              onSelect?.(el.id);
            }}
            onPointerMove={(e) => {
              if (e.buttons !== 1 || !onChangeElement) return;
              if (e.currentTarget.dataset.mode === "resize") applyResize(e.currentTarget, e);
              else applyMove(e.currentTarget, e);
            }}
            sx={{
              position: "absolute",
              left: `${(el.x / width) * 100}%`,
              top: `${(el.y / height) * 100}%`,
              width: `${(el.width / width) * 100}%`,
              height: `${(el.height / height) * 100}%`,
              outline: selected ? "2px solid #0f766e" : "1px dashed transparent",
              "&:hover": { outline: "1px dashed #94a3b8" },
              cursor: onChangeElement ? "move" : "default",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent:
                el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
              fontSize: el.fontSize ? `${Math.max(10, Number(el.fontSize) * 0.55)}px` : 13,
              fontWeight: el.fontWeight || 500,
              color: el.color || "#111",
              textAlign: (el.align as "center") || "center",
              direction: (el.direction as "rtl") || "rtl",
              bgcolor: el.type === "shape" ? el.fill || "#0f766e" : "transparent",
              borderTop: el.type === "line" ? `2px solid ${el.color || "#111"}` : undefined,
              opacity: el.opacity ?? 1,
              backgroundImage:
                el.src && ["image", "logo", "signature", "seal"].includes(el.type) ? `url(${el.src})` : undefined,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              transform: el.type === "watermark" ? "rotate(-18deg)" : undefined,
            }}
          >
            {el.type === "text" || el.type === "watermark" ? content : null}
            {el.type === "qr" ? (
              <Box sx={{ width: "100%", height: "100%", bgcolor: "#0f172a", color: "#fff", display: "grid", placeItems: "center", fontSize: 10 }}>
                QR
              </Box>
            ) : null}
            {el.type === "table" ? (
              <Box
                component="table"
                sx={{ width: "100%", height: "100%", borderCollapse: "collapse", fontSize: 10 }}
              >
                <tbody>
                  {(el.rows || [["", ""]]).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ border: "1px solid #94a3b8", padding: 2 }}>
                          {previewVars ? substituteVars(cell, previewVars) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Box>
            ) : null}
            {selected && onChangeElement ? (
              <Box
                data-handle="resize"
                sx={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 12,
                  height: 12,
                  bgcolor: "#0f766e",
                  cursor: "nwse-resize",
                }}
              />
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
