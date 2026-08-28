import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { fetchCertificate, revokeCertificate, sendCertificate, certificatePdfUrl } from "@/api/services";
import type { CertificateDetail } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function CertificateDetailPage() {
  const { id } = useParams();
  const { t } = useLocale();
  const [cert, setCert] = useState<CertificateDetail | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (id) fetchCertificate(Number(id)).then(setCert);
  }, [id]);
  if (!cert) return null;
  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={800}>
        {cert.certificate_number}
      </Typography>
      <Typography>{cert.recipient.full_name} — {cert.course_name}</Typography>
      <Typography color="text.secondary">{t.status}: {cert.public_status}</Typography>
      <iframe title="preview" src={`/api/certificates/${cert.id}/preview/`} style={{ width: "100%", minHeight: 420, border: 0, background: "#fff" }} />
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button component="a" href={certificatePdfUrl(cert.id)} variant="contained">{t.downloadPdf}</Button>
        <Button onClick={() => void sendCertificate(cert.id)}>{t.send}</Button>
        <Button
          variant="danger"
          onClick={async () => {
            try {
              setCert(await revokeCertificate(cert.id, reason));
            } catch (e) {
              setError(getApiErrorMessage(e));
            }
          }}
        >
          {t.revoke}
        </Button>
      </Stack>
      <Input label={t.revoke} value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && <Typography color="error">{error}</Typography>}
      <Box>
        {cert.events.map((e) => (
          <Typography key={e.created_at + e.kind} variant="body2">
            {e.kind} — {e.created_at}
          </Typography>
        ))}
      </Box>
      <Button onClick={() => navigator.clipboard.writeText(cert.verification_url)}>{t.copyLink}</Button>
    </Stack>
  );
}
