import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui";
import { EmptyState } from "@/components/ui/FeedbackStates";
import { fetchTemplates } from "@/api/services";
import type { TemplateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";

export default function TemplatesPage() {
  const { t } = useLocale();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  useEffect(() => {
    fetchTemplates().then((d) => setRows(d.results));
  }, []);
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t.templates}</Typography>
      {rows.length === 0 ? (
        <EmptyState title={t.emptyTemplates} />
      ) : (
        rows.map((row) => (
          <Box key={row.id} sx={{ py: 1.5, display: "flex", gap: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>{row.name}</Typography>
              <Typography variant="body2" color="text.secondary">{row.format} · {row.locale}</Typography>
            </Box>
            <Button component={Link} to={`/app/templates/${row.id}`}>{t.preview}</Button>
          </Box>
        ))
      )}
    </Box>
  );
}
