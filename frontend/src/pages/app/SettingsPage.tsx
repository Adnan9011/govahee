import { useEffect, useState } from "react";
import { Box, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import {
  createCustomField,
  fetchCurrentOrg,
  fetchCustomFields,
  fetchEmailTemplates,
  fetchBranding,
  updateBranding,
  updateCurrentOrg,
  updateEmailTemplate,
} from "@/api/services";
import type { Organization } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function SettingsPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState(0);
  const [org, setOrg] = useState<Organization | null>(null);
  const [branding, setBranding] = useState({
    primary_color: "#0f766e",
    secondary_color: "#134e4a",
    font_family: "Vazirmatn",
    email_from_name: "",
    verification_footer: "",
  });
  const [fields, setFields] = useState<Array<{ id: number; key: string; label: string; is_public: boolean }>>([]);
  const [fieldKey, setFieldKey] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [emails, setEmails] = useState<Array<{ id: number; subject: string; body: string }>>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchCurrentOrg().then(setOrg);
    fetchBranding().then((d) => setBranding({ ...branding, ...d }));
    fetchCustomFields().then((d) => setFields(d.results));
    fetchEmailTemplates().then((d) => setEmails(d.results));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!org) return null;
  return (
    <Stack spacing={2} maxWidth={640}>
      <Typography variant="h5" fontWeight={800}>{t.settings}</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
        <Tab label={t.settingsGeneral} />
        <Tab label={t.settingsBranding} />
        <Tab label={t.settingsCertificate} />
        <Tab label={t.customFields} />
        <Tab label={t.settingsEmail} />
      </Tabs>
      {tab === 0 && (
        <Stack spacing={2}>
          <Input label={t.orgName} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          <Input label={t.legalName} value={org.legal_name || ""} onChange={(e) => setOrg({ ...org, legal_name: e.target.value })} />
          <Input label={t.licenseNumber} value={org.license_number || ""} onChange={(e) => setOrg({ ...org, license_number: e.target.value })} />
          <Input label="Website" value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
        </Stack>
      )}
      {tab === 1 && (
        <Stack spacing={2}>
          <Input label="Primary" value={branding.primary_color} onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })} />
          <Input label="Secondary" value={branding.secondary_color} onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })} />
          <Input label={t.settingsEmail} value={branding.email_from_name} onChange={(e) => setBranding({ ...branding, email_from_name: e.target.value })} />
        </Stack>
      )}
      {tab === 2 && (
        <Input
          label="Prefix"
          value={org.certificate_number_prefix}
          onChange={(e) => setOrg({ ...org, certificate_number_prefix: e.target.value })}
        />
      )}
      {tab === 3 && (
        <Stack spacing={2}>
          {fields.map((f) => (
            <Typography key={f.id} variant="body2">{f.label} ({f.key}) {f.is_public ? t.isPublic : ""}</Typography>
          ))}
          <Input label="key" value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} />
          <Input label={t.addField} value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} />
          <Button
            onClick={async () => {
              try {
                await createCustomField({ key: fieldKey, label: fieldLabel, field_type: "text", is_public: false });
                setFieldKey("");
                setFieldLabel("");
                setFields((await fetchCustomFields()).results);
              } catch (e) {
                setError(getApiErrorMessage(e));
              }
            }}
          >
            {t.addField}
          </Button>
        </Stack>
      )}
      {tab === 4 && (
        <Stack spacing={2}>
          {emails.map((tmpl) => (
            <Box key={tmpl.id}>
              <Input
                label={t.emailSubject}
                value={tmpl.subject}
                onChange={(e) =>
                  setEmails((prev) => prev.map((row) => (row.id === tmpl.id ? { ...row, subject: e.target.value } : row)))
                }
              />
              <TextField
                label={t.emailBody}
                value={tmpl.body}
                multiline
                minRows={4}
                fullWidth
                sx={{ mt: 1 }}
                onChange={(e) =>
                  setEmails((prev) => prev.map((row) => (row.id === tmpl.id ? { ...row, body: e.target.value } : row)))
                }
              />
              <Button sx={{ mt: 1 }} onClick={() => void updateEmailTemplate(tmpl.id, { subject: tmpl.subject, body: tmpl.body })}>
                {t.save}
              </Button>
            </Box>
          ))}
        </Stack>
      )}
      {error && <Typography color="error">{error}</Typography>}
      <Button
        variant="contained"
        onClick={async () => {
          try {
            setOrg(await updateCurrentOrg(org));
            if (tab === 1) await updateBranding(branding);
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
