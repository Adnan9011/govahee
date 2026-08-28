import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import { fetchCurrentOrg, updateCurrentOrg } from "@/api/services";
import type { Organization } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function SettingsPage() {
  const { t } = useLocale();
  const [org, setOrg] = useState<Organization | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchCurrentOrg().then(setOrg);
  }, []);
  if (!org) return null;
  return (
    <Stack spacing={2} maxWidth={520}>
      <Typography variant="h5" fontWeight={800}>{t.settings}</Typography>
      <Input label={t.orgName} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
      <Input
        label="Prefix"
        value={org.certificate_number_prefix}
        onChange={(e) => setOrg({ ...org, certificate_number_prefix: e.target.value })}
      />
      <Input label="Website" value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
      {error && <Typography color="error">{error}</Typography>}
      <Button
        variant="contained"
        onClick={async () => {
          try {
            setOrg(await updateCurrentOrg(org));
          } catch (e) {
            setError(getApiErrorMessage(e));
          }
        }}
      >
        {t.save}
      </Button>
    </Stack>
  );
}
