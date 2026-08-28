import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { fetchTemplates, saveTemplateVersion } from "@/api/services";
import type { TemplateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

type Element = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  align?: string;
};

export default function TemplateEditorPage() {
  const { id } = useParams();
  const { t } = useLocale();
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchTemplates().then((d) => {
      const row = d.results.find((r) => r.id === Number(id));
      if (!row) return;
      setTemplate(row);
      const canvas = (row.current_version?.canvas || {}) as { elements?: Element[] };
      setElements(canvas.elements || []);
    });
  }, [id]);
  if (!template) return null;
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{template.name}</Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button onClick={() => setElements([...elements, { id: `t${Date.now()}`, type: "text", x: 20, y: 40, width: 250, height: 14, content: "{{recipient_name}}", fontSize: 18, align: "center" }])}>
          Text
        </Button>
        <Button onClick={() => setElements([...elements, { id: `q${Date.now()}`, type: "qr", x: 12, y: 168, width: 28, height: 28 }])}>
          QR
        </Button>
        <Button
          variant="contained"
          onClick={async () => {
            try {
              await saveTemplateVersion(template.id, {
                canvas: { ...(template.current_version?.canvas as object), elements },
              });
            } catch (e) {
              setError(getApiErrorMessage(e));
            }
          }}
        >
          {t.save}
        </Button>
      </Box>
      <Box sx={{ position: "relative", width: "100%", maxWidth: 900, aspectRatio: "297/210", bgcolor: "#fff", color: "#111", borderRadius: 2, overflow: "hidden" }}>
        {elements.map((el) => (
          <Box
            key={el.id}
            sx={{
              position: "absolute",
              left: `${(el.x / 297) * 100}%`,
              top: `${(el.y / 210) * 100}%`,
              width: `${(el.width / 297) * 100}%`,
              height: `${(el.height / 210) * 100}%`,
              border: "1px dashed #94a3b8",
              fontSize: 12,
              overflow: "hidden",
            }}
          >
            {el.type === "text" ? el.content : el.type}
          </Box>
        ))}
      </Box>
      {elements.filter((e) => e.type === "text").map((el) => (
        <Input
          key={el.id}
          sx={{ mt: 1 }}
          label={el.id}
          value={el.content || ""}
          onChange={(e) =>
            setElements(elements.map((item) => (item.id === el.id ? { ...item, content: e.target.value } : item)))
          }
        />
      ))}
      {error && <Typography color="error">{error}</Typography>}
    </Box>
  );
}
