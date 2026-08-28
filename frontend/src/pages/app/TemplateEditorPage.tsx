import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { Button, Input, Select } from "@/components/ui";
import { CertificateStage } from "@/certificate/CertificateStage";
import {
  SAMPLE_VARS_FA,
  TEMPLATE_VARIABLES,
  type CanvasDoc,
  type CanvasElement,
  type CanvasElementType,
} from "@/certificate/types";
import { fetchTemplate, saveTemplateVersion, uploadAttachment } from "@/api/services";
import type { TemplateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

const FORMAT_PRESETS: Record<string, { width: number; height: number }> = {
  a4_landscape: { width: 297, height: 210 },
  a4_portrait: { width: 210, height: 297 },
  a5_landscape: { width: 210, height: 148 },
  a5_portrait: { width: 148, height: 210 },
};

function emptyEl(type: CanvasElementType): CanvasElement {
  const base = { id: uid(type), type, x: 24, y: 40, width: 80, height: 16 };
  if (type === "text") {
    return { ...base, width: 200, content: "{{recipient_name}}", fontSize: 18, align: "center", direction: "rtl" };
  }
  if (type === "qr") return { ...base, y: 160, width: 28, height: 28 };
  if (type === "shape") return { ...base, width: 297, height: 12, x: 0, y: 0, fill: "#0f766e" };
  if (type === "line") return { ...base, y: 60, width: 180, height: 2, color: "#111" };
  if (type === "watermark") {
    return { ...base, x: 60, y: 80, width: 180, height: 40, content: "{{organization_name}}", opacity: 0.15, fontSize: 28 };
  }
  if (type === "table") return { ...base, y: 120, width: 160, height: 36, rows: [["{{recipient_name}}", "{{score}}"]] };
  return { ...base, width: 40, height: 40 };
}

function canvasFromTemplate(row: TemplateRow): CanvasDoc {
  const raw = (row.current_version?.canvas || {}) as CanvasDoc;
  const portrait = (row.format || "").includes("portrait");
  return {
    width_mm: raw.width_mm || (portrait ? 210 : 297),
    height_mm: raw.height_mm || (portrait ? 297 : 210),
    background: raw.background || { color: "#ffffff" },
    elements: raw.elements || [],
  };
}

export default function TemplateEditorPage() {
  const { id } = useParams();
  const { t } = useLocale();
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [canvas, setCanvas] = useState<CanvasDoc>({
    width_mm: 297,
    height_mm: 210,
    background: { color: "#ffffff" },
    elements: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchTemplate(Number(id))
      .then((row) => {
        setTemplate(row);
        setCanvas(canvasFromTemplate(row));
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, [id]);

  const selected = useMemo(
    () => canvas.elements.find((el) => el.id === selectedId) || null,
    [canvas.elements, selectedId]
  );

  const patchElement = (elId: string, patch: Partial<CanvasElement>) => {
    setCanvas((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === elId ? { ...el, ...patch } : el)),
    }));
  };

  const updateSelected = (patch: Partial<CanvasElement>) => {
    if (!selected) return;
    patchElement(selected.id, patch);
  };

  const add = (type: CanvasElementType) => {
    const el = emptyEl(type);
    setCanvas((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setSelectedId(el.id);
  };

  if (!template) {
    return error ? <Typography color="error">{error}</Typography> : null;
  }

  const tools: { type: CanvasElementType; label: string }[] = [
    { type: "text", label: t.addText },
    { type: "qr", label: t.addQr },
    { type: "logo", label: t.addLogo },
    { type: "signature", label: t.addSignature },
    { type: "seal", label: t.addSeal },
    { type: "line", label: t.addLine },
    { type: "shape", label: t.addShape },
    { type: "watermark", label: t.addWatermark },
    { type: "table", label: t.addTable },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
        {template.name}
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mb: 2 }}>
        {tools.map((tool) => (
          <Button key={tool.type} size="small" variant="outline" onClick={() => add(tool.type)}>
            {tool.label}
          </Button>
        ))}
        <Button size="small" onClick={() => setPreview((v) => !v)}>
          {preview ? t.preview : t.samplePreview}
        </Button>
        <Button size="small" component="a" href={`/api/templates/${template.id}/preview/`} target="_blank" rel="noreferrer">
          {t.printPreview}
        </Button>
        <Button
          variant="contained"
          size="small"
          loading={saving}
          onClick={async () => {
            try {
              setError("");
              setSaving(true);
              const saved = await saveTemplateVersion(template.id, {
                canvas,
                name: template.name,
                format: template.format,
                locale: template.locale,
                width_mm: canvas.width_mm,
                height_mm: canvas.height_mm,
                variables: TEMPLATE_VARIABLES,
              });
              setTemplate(saved);
            } catch (e) {
              setError(getApiErrorMessage(e));
            } finally {
              setSaving(false);
            }
          }}
        >
          {t.save}
        </Button>
      </Stack>
      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 280px" }, gap: 2 }}>
        <CertificateStage
          canvas={canvas}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChangeElement={patchElement}
          previewVars={preview ? SAMPLE_VARS_FA : null}
        />
        <Stack spacing={1.5}>
          <Select
            label={t.template}
            value={template.format}
            onChange={(e) => {
              const format = String(e.target.value);
              const preset = FORMAT_PRESETS[format];
              setTemplate({ ...template, format });
              if (preset) {
                setCanvas((prev) => ({ ...prev, width_mm: preset.width, height_mm: preset.height }));
              }
            }}
            options={Object.keys(FORMAT_PRESETS).map((value) => ({ value, label: value }))}
          />
          <Input
            label={t.backgroundColor}
            value={canvas.background?.color || "#ffffff"}
            onChange={(e) => setCanvas({ ...canvas, background: { color: e.target.value } })}
          />
          {selected && (
            <>
              <Typography fontWeight={700}>{selected.type}</Typography>
              <Input
                label="X"
                type="number"
                value={String(selected.x)}
                onChange={(e) => updateSelected({ x: Number(e.target.value) })}
              />
              <Input
                label="Y"
                type="number"
                value={String(selected.y)}
                onChange={(e) => updateSelected({ y: Number(e.target.value) })}
              />
              {(selected.type === "text" || selected.type === "watermark") && (
                <>
                  <Input
                    label={t.preview}
                    value={selected.content || ""}
                    onChange={(e) => updateSelected({ content: e.target.value })}
                  />
                  <Select
                    label={t.variables}
                    value=""
                    onChange={(e) =>
                      updateSelected({ content: `${selected.content || ""}{{${e.target.value}}}` })
                    }
                    options={TEMPLATE_VARIABLES.map((v) => ({ value: v, label: `{{${v}}}` }))}
                  />
                  <Input
                    label={t.fontSize}
                    type="number"
                    value={String(selected.fontSize || 16)}
                    onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                  />
                  <Select
                    label={t.align}
                    value={selected.align || "center"}
                    onChange={(e) => updateSelected({ align: String(e.target.value) })}
                    options={[
                      { value: "right", label: "Right" },
                      { value: "center", label: "Center" },
                      { value: "left", label: "Left" },
                      { value: "justify", label: "Justify" },
                    ]}
                  />
                  <Select
                    label="RTL/LTR"
                    value={selected.direction || "rtl"}
                    onChange={(e) => updateSelected({ direction: String(e.target.value) })}
                    options={[
                      { value: "rtl", label: "RTL" },
                      { value: "ltr", label: "LTR" },
                    ]}
                  />
                  <Input
                    label={t.opacity}
                    type="number"
                    value={String(selected.opacity ?? 1)}
                    onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
                  />
                </>
              )}
              {selected.type === "table" && (
                <Input
                  label={t.addTable}
                  value={(selected.rows || []).map((r) => r.join("|")).join("\n")}
                  onChange={(e) =>
                    updateSelected({
                      rows: e.target.value.split("\n").map((line) => line.split("|")),
                    })
                  }
                />
              )}
              {["logo", "image", "signature", "seal"].includes(selected.type) && (
                <Button component="label" size="small">
                  {t.uploadLogo}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const form = new FormData();
                        form.append("file", file);
                        const uploaded = await uploadAttachment(form);
                        updateSelected({ src: uploaded.url });
                      } catch (err) {
                        setError(getApiErrorMessage(err));
                      }
                    }}
                  />
                </Button>
              )}
              <Button
                variant="danger"
                size="small"
                onClick={() => {
                  setCanvas({ ...canvas, elements: canvas.elements.filter((el) => el.id !== selected.id) });
                  setSelectedId(null);
                }}
              >
                {t.cancel}
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
