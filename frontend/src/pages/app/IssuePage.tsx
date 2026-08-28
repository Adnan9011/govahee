import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { Button, Input, Select } from "@/components/ui";
import { fetchCertificateTypes, fetchTemplates, issueCertificate } from "@/api/services";
import type { CertificateTypeRow, TemplateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function IssuePage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<CertificateTypeRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [typeId, setTypeId] = useState<number | "">("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [score, setScore] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetchCertificateTypes().then((d) => setTypes(d.results));
    fetchTemplates().then((d) => setTemplates(d.results));
  }, []);
  const steps = [t.wizardType, t.wizardTemplate, t.wizardRecipient, t.wizardCourse, t.wizardPreview];
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t.issue}</Typography>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>
      {step === 0 && (
        <Select
          value={typeId}
          onChange={(e) => setTypeId(Number(e.target.value))}
          label={t.certificateType}
          options={types.map((tp) => ({ value: tp.id, label: tp.name }))}
        />
      )}
      {step === 1 && (
        <Select
          value={templateId}
          onChange={(e) => setTemplateId(Number(e.target.value))}
          label={t.template}
          options={templates.map((tp) => ({ value: tp.id, label: tp.name }))}
        />
      )}
      {step === 2 && (
        <Box sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
          <Input label={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Box>
      )}
      {step === 3 && (
        <Box sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
          <Input label={t.course} value={course} onChange={(e) => setCourse(e.target.value)} />
          <Input label="Score" value={score} onChange={(e) => setScore(e.target.value)} />
        </Box>
      )}
      {step === 4 && (
        <Typography>
          {fullName} — {course}
        </Typography>
      )}
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      <Box sx={{ mt: 3, display: "flex", gap: 1 }}>
        {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>{t.back}</Button>}
        {step < 4 && <Button variant="contained" onClick={() => setStep((s) => s + 1)}>{t.next}</Button>}
        {step === 4 && (
          <Button
            variant="contained"
            onClick={async () => {
              try {
                const cert = await issueCertificate({
                  template_id: templateId,
                  certificate_type_id: typeId || null,
                  recipient: { full_name: fullName, email },
                  course_name: course,
                  score,
                });
                navigate(`/app/certificates/${cert.id}`);
              } catch (e) {
                setError(getApiErrorMessage(e));
              }
            }}
          >
            {t.issue}
          </Button>
        )}
      </Box>
    </Box>
  );
}
