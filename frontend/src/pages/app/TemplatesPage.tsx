import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { EmptyState } from "@/components/ui/FeedbackStates";
import { createTemplate, fetchTemplates } from "@/api/services";
import type { TemplateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function TemplatesPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates().then((d) => setRows(d.results));
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
        {t.templates}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 3, maxWidth: 480 }}>
        <Input label={t.templateName} value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          variant="contained"
          onClick={async () => {
            if (!name.trim()) return;
            try {
              const created = await createTemplate({ name: name.trim() });
              navigate(`/app/templates/${created.id}`);
            } catch (e) {
              setError(getApiErrorMessage(e));
            }
          }}
        >
          {t.createTemplate}
        </Button>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {rows.length === 0 ? (
        <EmptyState title={t.emptyTemplates} />
      ) : (
        rows.map((row) => (
          <Box
            key={row.id}
            sx={{ py: 1.5, display: "flex", gap: 2, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>{row.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {row.format} · {row.locale}
              </Typography>
            </Box>
            <Button component={Link} to={`/app/templates/${row.id}`}>
              {t.preview}
            </Button>
          </Box>
        ))
      )}
    </Box>
  );
}
