import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { Button, Input } from "@/components/ui";
import {
  completeOnboarding,
  createTemplate,
  fetchCurrentOrg,
  fetchTemplates,
  updateBranding,
  updateCurrentOrg,
  uploadAttachment,
} from "@/api/services";
import type { Organization, TemplateRow } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function OnboardingPage() {
  const { t } = useLocale();
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [org, setOrg] = useState<Organization | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCurrentOrg().then(setOrg);
    fetchTemplates().then((d) => setTemplates(d.results));
  }, []);

  if (!org) return null;

  const finish = async () => {
    try {
      setError("");
      await completeOnboarding();
      await refreshSession();
      navigate("/app");
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const steps = [t.onboardingOrg, t.onboardingLogo, t.onboardingTemplate, t.onboardingIssue];

  return (
    <Box maxWidth={560}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
        {t.onboardingTitle}
      </Typography>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {step === 0 && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Input label={t.orgName} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          <Input
            label={t.legalName}
            value={org.legal_name || ""}
            onChange={(e) => setOrg({ ...org, legal_name: e.target.value })}
          />
          <Input label="Website" value={org.website || ""} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
        </Box>
      )}
      {step === 1 && (
        <Box sx={{ display: "grid", gap: 2 }}>
          {logoUrl ? <Box component="img" src={logoUrl} alt="" sx={{ maxWidth: 160, maxHeight: 80 }} /> : null}
          <Button component="label">
            {t.uploadLogo}
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const form = new FormData();
                  form.append("file", file);
                  const uploaded = await uploadAttachment(form);
                  await updateBranding({ logo_file: uploaded.id });
                  setLogoUrl(uploaded.url);
                } catch (err) {
                  setError(getApiErrorMessage(err));
                }
              }}
            />
          </Button>
        </Box>
      )}
      {step === 2 && (
        <Box sx={{ display: "grid", gap: 2 }}>
          {templates.map((row) => (
            <Typography key={row.id} variant="body2">
              {row.name}
            </Typography>
          ))}
          <Input
            label={t.templateName}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <Button
            onClick={async () => {
              if (!templateName.trim()) return;
              try {
                const created = await createTemplate({ name: templateName.trim(), locale: org.locale || "fa" });
                setTemplates((prev) => [...prev, created]);
                setTemplateName("");
              } catch (err) {
                setError(getApiErrorMessage(err));
              }
            }}
          >
            {t.createTemplate}
          </Button>
        </Box>
      )}
      {step === 3 && (
        <Typography color="text.secondary">{t.legalNote}</Typography>
      )}
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ mt: 3, display: "flex", gap: 1 }}>
        {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>{t.back}</Button>}
        {step < 3 && (
          <Button
            variant="contained"
            onClick={async () => {
              if (step === 0) {
                try {
                  setOrg(await updateCurrentOrg(org));
                } catch (err) {
                  setError(getApiErrorMessage(err));
                  return;
                }
              }
              setStep((s) => s + 1);
            }}
          >
            {t.next}
          </Button>
        )}
        {step === 3 && (
          <Button variant="contained" onClick={() => void finish()}>
            {t.finishOnboarding}
          </Button>
        )}
        <Button onClick={() => void finish()}>{t.skip}</Button>
      </Box>
    </Box>
  );
}
