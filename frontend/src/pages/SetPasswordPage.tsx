import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Stack, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { setPassword } from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function SetPasswordPage() {
  const { t } = useLocale();
  const { uid, token } = useParams();
  const [password, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {t.setPassword}
      </Typography>
      <Stack
        spacing={2}
        component="form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!uid || !token) return;
          setBusy(true);
          setError("");
          try {
            await setPassword(uid, token, password);
            window.location.href = "/app";
          } catch (err) {
            setError(getApiErrorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          label={t.password}
          type="password"
          value={password}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="new-password"
        />
        {error && <Typography color="error">{error}</Typography>}
        <Button type="submit" variant="contained" disabled={busy}>
          {t.save}
        </Button>
        <Button component={Link} to="/login" variant="text">
          {t.login}
        </Button>
      </Stack>
    </Container>
  );
}
