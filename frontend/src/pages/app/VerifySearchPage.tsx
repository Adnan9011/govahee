import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stack, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { searchCertificate } from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function VerifySearchPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  return (
    <Stack spacing={2} maxWidth={480}>
      <Typography variant="h5" fontWeight={800}>{t.verification}</Typography>
      <Input label={t.certificateNumber} value={number} onChange={(e) => setNumber(e.target.value)} />
      {error && <Typography color="error">{error}</Typography>}
      <Button
        variant="contained"
        onClick={async () => {
          try {
            const res = await searchCertificate(number);
            navigate(`/verify/${res.redirect_token}`);
          } catch (e) {
            setError(getApiErrorMessage(e));
          }
        }}
      >
        {t.search}
      </Button>
    </Stack>
  );
}
