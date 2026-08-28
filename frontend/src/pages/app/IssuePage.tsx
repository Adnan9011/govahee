import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { Button, Checkbox, DatePickerField, Input, Select } from "@/components/ui";
import {
  fetchCertificateTypes,
  fetchCustomFields,
  fetchTemplates,
  issueCertificate,
} from "@/api/services";
import type { CertificateTypeRow, TemplateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

export default function IssuePage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<CertificateTypeRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [customFields, setCustomFields] = useState<Array<{ key: string; label: string }>>([]);
  const [typeId, setTypeId] = useState<number | "">("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [score, setScore] = useState("");
  const [grade, setGrade] = useState("");
  const [duration, setDuration] = useState("");
  const [instructor, setInstructor] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryMode, setExpiryMode] = useState("none");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryValue, setExpiryValue] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [sendEmail, setSendEmail] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCertificateTypes().then((d) => setTypes(d.results));
    fetchTemplates().then((d) => setTemplates(d.results));
    fetchCustomFields().then((d) => setCustomFields(d.results.map((f) => ({ key: f.key, label: f.label }))));
  }, []);

  const steps = [t.wizardType, t.wizardTemplate, t.wizardRecipient, t.wizardCourse, t.wizardDates, t.wizardPreview];

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
        {t.issue}
      </Typography>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
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
          <Input label={t.score} value={score} onChange={(e) => setScore(e.target.value)} />
          <Input label={t.grade} value={grade} onChange={(e) => setGrade(e.target.value)} />
          <Input label={t.duration} value={duration} onChange={(e) => setDuration(e.target.value)} />
          <Input label={t.instructor} value={instructor} onChange={(e) => setInstructor(e.target.value)} />
          {customFields.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              value={customValues[field.key] || ""}
              onChange={(e) => setCustomValues({ ...customValues, [field.key]: e.target.value })}
            />
          ))}
        </Box>
      )}
      {step === 4 && (
        <Box sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
          <DatePickerField label={t.issueDate} value={issueDate} onChange={setIssueDate} />
          <Select
            label={t.expiry}
            value={expiryMode}
            onChange={(e) => setExpiryMode(String(e.target.value))}
            options={[
              { value: "none", label: t.expiryNone },
              { value: "date", label: t.expiryDate },
              { value: "months", label: t.expiryMonths },
              { value: "years", label: t.expiryYears },
            ]}
          />
          {expiryMode === "date" && <DatePickerField label={t.expiry} value={expiryDate} onChange={setExpiryDate} />}
          {(expiryMode === "months" || expiryMode === "years") && (
            <Input
              label={t.expiry}
              type="number"
              value={expiryValue}
              onChange={(e) => setExpiryValue(e.target.value)}
            />
          )}
        </Box>
      )}
      {step === 5 && (
        <Box sx={{ display: "grid", gap: 1, maxWidth: 480 }}>
          <Typography>
            {fullName} — {course}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {issueDate || t.issueDate} · {expiryMode === "none" ? t.noExpiry : expiryDate || expiryValue}
          </Typography>
          <Checkbox label={t.sendEmail} checked={sendEmail} onChange={(_, checked) => setSendEmail(checked)} />
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ mt: 3, display: "flex", gap: 1 }}>
        {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>{t.back}</Button>}
        {step < 5 && <Button variant="contained" onClick={() => setStep((s) => s + 1)}>{t.next}</Button>}
        {step === 5 && (
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
                  grade,
                  duration,
                  instructor_name: instructor,
                  custom_fields: customValues,
                  issue_date: issueDate || undefined,
                  expiry_mode: expiryMode,
                  expiry_date: expiryMode === "date" && expiryDate ? expiryDate : undefined,
                  expiry_value: expiryValue ? Number(expiryValue) : undefined,
                  send_email: sendEmail,
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
