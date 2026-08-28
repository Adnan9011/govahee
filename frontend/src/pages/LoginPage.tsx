import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function LoginPage() {
  const { t } = useLocale();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {t.login}
      </Typography>
      <Stack spacing={2} component="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const role = await login(loginValue, password);
            navigate(role === "platform_admin" ? "/platform" : "/app");
          } catch (err) {
            setError(getApiErrorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label={t.email} value={loginValue} onChange={(e) => setLoginValue(e.target.value)} autoComplete="username" />
        <Input label={t.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <Typography color="error">{error}</Typography>}
        <Button type="submit" variant="contained" disabled={busy}>
          {t.login}
        </Button>
        <Button component={Link} to="/register" variant="text">
          {t.register}
        </Button>
      </Stack>
    </Container>
  );
}
