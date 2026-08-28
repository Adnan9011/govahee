import { useEffect, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { Button, Input, PageHeader, Card } from "@/components/ui";
import {
  createApiKey,
  createWebhook,
  fetchApiKeys,
  fetchWebhooks,
  revokeApiKey,
} from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

const DEFAULT_SCOPES = [
  "certificates:read",
  "certificates:write",
  "certificates:revoke",
  "templates:read",
];

export default function IntegrationsPage() {
  const { t } = useLocale();
  const [keys, setKeys] = useState<Array<{ id: number; name: string; prefix: string; revoked_at: string | null }>>([]);
  const [hooks, setHooks] = useState<Array<{ id: number; url: string; events: string[] }>>([]);
  const [name, setName] = useState("Production");
  const [rawKey, setRawKey] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const [k, h] = await Promise.all([fetchApiKeys(), fetchWebhooks()]);
    setKeys(k.results);
    setHooks(h.results);
  };
  useEffect(() => {
    void load().catch((e) => setError(getApiErrorMessage(e)));
  }, []);
  return (
    <Stack spacing={3}>
      <PageHeader title={t.integrations} description={t.featureApi} />
      {error && <Typography color="error">{error}</Typography>}
      <Card sx={{ p: 2 }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>{t.apiKeys}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <Input label={t.createApiKey} value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            variant="contained"
            onClick={async () => {
              try {
                const created = await createApiKey({ name, permissions: DEFAULT_SCOPES });
                setRawKey(created.key);
                await load();
              } catch (e) {
                setError(getApiErrorMessage(e));
              }
            }}
          >
            {t.create}
          </Button>
        </Stack>
        {rawKey && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t.keyCreatedOnce}
            <br />
            <code>{rawKey}</code>
          </Typography>
        )}
        {keys.map((key) => (
          <Stack key={key.id} direction="row" spacing={2} sx={{ py: 1 }}>
            <Typography sx={{ flex: 1 }}>{key.name} · {key.prefix}</Typography>
            {!key.revoked_at && (
              <Button
                variant="text"
                onClick={async () => {
                  await revokeApiKey(key.id);
                  await load();
                }}
              >
                {t.revokeKey}
              </Button>
            )}
          </Stack>
        ))}
      </Card>
      <Card sx={{ p: 2 }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>{t.webhooks}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <Input label={t.webhookUrl} value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
          <Button
            onClick={async () => {
              try {
                await createWebhook({
                  url: hookUrl,
                  events: ["certificate.issued", "certificate.revoked", "certificate.verified"],
                });
                setHookUrl("");
                await load();
              } catch (e) {
                setError(getApiErrorMessage(e));
              }
            }}
          >
            {t.create}
          </Button>
        </Stack>
        {hooks.map((hook) => (
          <Typography key={hook.id} variant="body2">{hook.url} · {hook.events.join(", ")}</Typography>
        ))}
      </Card>
    </Stack>
  );
}
