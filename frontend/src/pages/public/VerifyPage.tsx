import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Container, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { Button } from "@/components/ui";
import { verifyToken } from "@/api/services";
import type { VerifyResult } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { SeoHead } from "@/components/seo/SeoHead";

export default function VerifyPage() {
  const { token = "" } = useParams();
  const { t } = useLocale();
  const [data, setData] = useState<VerifyResult | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    verifyToken(token)
      .then(setData)
      .catch(() => setMissing(true));
  }, [token]);
  const status = missing ? "not_found" : data?.status;
  const ok = status === "active" || status === "issued";
  const title = ok ? t.verified : status === "revoked" ? t.revokedMsg : status === "expired" ? t.expiredMsg : t.notFound;
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <SeoHead title={title} noIndex={!data?.indexable} description={t.legalNote} />
      <Stack spacing={2} alignItems="center" textAlign="center">
        {ok ? <CheckCircleIcon color="success" sx={{ fontSize: 64 }} /> : <ErrorIcon color="error" sx={{ fontSize: 64 }} />}
        <Typography variant="h4" fontWeight={800}>{title}</Typography>
        {data && (
          <>
            <Typography variant="h6">{data.recipient_name}</Typography>
            <Typography>{data.title || data.course_name}</Typography>
            <Typography color="text.secondary">{t.issuedBy}: {data.organization_name}</Typography>
            <Typography variant="body2">{t.certificateNumber}: {data.certificate_number}</Typography>
            <Typography variant="body2">{t.issueDate}: {data.issue_date}</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => data.verification_url && navigator.clipboard.writeText(data.verification_url)}>{t.copyLink}</Button>
              <Button component="a" href={`https://wa.me/?text=${encodeURIComponent(data.verification_url || "")}`}>{t.share}</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">{data.disclaimer}</Typography>
          </>
        )}
      </Stack>
    </Container>
  );
}
