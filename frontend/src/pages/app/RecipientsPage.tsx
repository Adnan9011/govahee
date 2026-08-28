import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Input } from "@/components/ui";
import { fetchRecipients } from "@/api/services";
import type { RecipientRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";

export default function RecipientsPage() {
  const { t } = useLocale();
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    fetchRecipients({ search }).then((d) => setRows(d.results));
  }, [search]);
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t.recipients}</Typography>
      <Input placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2, maxWidth: 360 }} />
      {rows.map((r) => (
        <Box key={r.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography fontWeight={600}>{r.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">{r.email}</Typography>
        </Box>
      ))}
    </Box>
  );
}
