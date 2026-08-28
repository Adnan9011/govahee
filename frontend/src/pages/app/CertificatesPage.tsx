import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { EmptyState } from "@/components/ui/FeedbackStates";
import { fetchCertificates } from "@/api/services";
import type { CertificateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { fa } from "@/i18n/fa";

export default function CertificatesPage() {
  const { t } = useLocale();
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const tmr = setTimeout(() => {
      fetchCertificates({ search, page_size: 50 }).then((d) => setRows(d.results));
    }, 250);
    return () => clearTimeout(tmr);
  }, [search]);
  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" fontWeight={800} sx={{ flex: 1 }}>
          {t.certificates}
        </Typography>
        <Button component={Link} to="/app/issue" variant="contained">
          {t.issue}
        </Button>
      </Box>
      <Input placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2, maxWidth: 360 }} />
      {rows.length === 0 ? (
        <EmptyState title={t.emptyCertificates} />
      ) : (
        rows.map((row) => (
          <Box key={row.id} sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>{row.recipient_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {row.certificate_number} · {row.course_name} · {fa.statusLabels[row.public_status as keyof typeof fa.statusLabels] ?? row.public_status}
              </Typography>
            </Box>
            <Button component={Link} to={`/app/certificates/${row.id}`} variant="text">
              {t.view}
            </Button>
          </Box>
        ))
      )}
    </Box>
  );
}
