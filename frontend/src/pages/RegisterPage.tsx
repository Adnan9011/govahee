import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Stack, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function RegisterPage() {
  const { t } = useLocale();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {t.register}
      </Typography>
      <Stack
        spacing={2}
        component="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await register({
              full_name: fullName,
              email,
              password,
              organization_name: orgName,
            });
            navigate("/app");
          } catch (err) {
            setError(getApiErrorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label={t.orgName} value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
        <Input label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={t.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <Typography color="error">{error}</Typography>}
        <Button type="submit" variant="contained" disabled={busy}>
          {t.ctaStart}
        </Button>
        <Button component={Link} to="/login" variant="text">
          {t.login}
        </Button>
      </Stack>
    </Container>
  );
}
