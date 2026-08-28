import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Button, Checkbox, Input, Select } from "@/components/ui";
import {
  downloadBatchZip,
  fetchBatch,
  fetchBatches,
  fetchTemplates,
  startBulkIssue,
  uploadBulk,
  validateBulk,
} from "@/api/services";
import type { BatchRow, TemplateRow } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

const FIELDS = [
  "recipient_name",
  "email",
  "course_name",
  "score",
  "grade",
  "issue_date",
  "duration",
  "instructor_name",
];

export default function BulkPage() {
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<BatchRow | null>(null);
  const [preview, setPreview] = useState<{ row_number: number; data: Record<string, string>; errors?: string[] }[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [sendEmail, setSendEmail] = useState(false);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState<BatchRow[]>([]);

  useEffect(() => {
    fetchTemplates().then((d) => setTemplates(d.results));
    fetchBatches().then((d) => setBatches(d.results));
  }, []);

  useEffect(() => {
    if (!batch || !["processing", "validating"].includes(batch.status)) return;
    const timer = window.setInterval(() => {
      fetchBatch(batch.id)
        .then((row) => {
          setBatch(row);
          if (["completed", "partial", "failed"].includes(row.status)) {
            fetchBatches().then((d) => setBatches(d.results));
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [batch?.id, batch?.status]);

  const fieldOptions = [{ value: "", label: "—" }, ...FIELDS.map((f) => ({ value: f, label: f }))];

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
        {t.bulk}
      </Typography>
      {step === 0 && (
        <Stack spacing={2} maxWidth={480}>
          <Select
            label={t.template}
            value={templateId}
            onChange={(e) => setTemplateId(Number(e.target.value))}
            options={templates.map((tp) => ({ value: tp.id, label: tp.name }))}
          />
          <Button component="label" variant="contained" disabled={!templateId}>
            {t.bulkUpload}
            <input
              hidden
              type="file"
              accept=".csv,.xlsx"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !templateId) return;
                const form = new FormData();
                form.append("file", file);
                form.append("template_id", String(templateId));
                form.append("step", "upload");
                try {
                  setError("");
                  const res = await uploadBulk(form);
                  setHeaders(res.headers);
                  setMapping(res.suggested_mapping);
                  setBatch(res.batch);
                  setPreview(res.preview);
                  setStep(1);
                } catch (err) {
                  setError(getApiErrorMessage(err));
                }
              }}
            />
          </Button>
        </Stack>
      )}
      {step === 1 && (
        <Stack spacing={2} maxWidth={560}>
          {headers.map((h) => (
            <Select
              key={h}
              label={h}
              value={mapping[h] || ""}
              onChange={(e) => setMapping({ ...mapping, [h]: String(e.target.value) })}
              options={fieldOptions}
            />
          ))}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={() => setStep(0)}>{t.back}</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!batch) return;
                try {
                  setError("");
                  const res = await validateBulk({ batch_id: batch.id, column_mapping: mapping });
                  setBatch(res.batch);
                  setPreview(res.preview);
                  setValidCount(res.valid_count);
                  setInvalidCount(res.invalid_count);
                  setStep(2);
                } catch (err) {
                  setError(getApiErrorMessage(err));
                }
              }}
            >
              {t.bulkValidate}
            </Button>
          </Box>
        </Stack>
      )}
      {step === 2 && batch && (
        <Stack spacing={2}>
          <Typography>
            {t.bulkValid}: {validCount} · {t.bulkInvalid}: {invalidCount}
          </Typography>
          {preview.map((row) => (
            <Typography key={row.row_number} variant="body2" color={row.errors?.length ? "error" : "text.primary"}>
              {t.row} {row.row_number}: {row.data.recipient_name || row.data.email || "—"}
              {row.errors?.length ? ` — ${row.errors.join(" ")}` : ""}
            </Typography>
          ))}
          <Checkbox label={t.sendEmail} checked={sendEmail} onChange={(_, checked) => setSendEmail(checked)} />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={() => setStep(1)}>{t.back}</Button>
            <Button
              variant="contained"
              disabled={validCount === 0}
              onClick={async () => {
                if (!batch) return;
                try {
                  setError("");
                  const updated = await startBulkIssue({
                    step: "issue",
                    batch_id: batch.id,
                    column_mapping: mapping,
                    send_email: sendEmail,
                  });
                  setBatch(updated);
                  setStep(3);
                } catch (err) {
                  setError(getApiErrorMessage(err));
                }
              }}
            >
              {t.bulkIssue}
            </Button>
          </Box>
        </Stack>
      )}
      {step === 3 && batch && (
        <Stack spacing={2}>
          <Typography>
            {batch.status} — {batch.processed_rows}/{batch.total_rows} ({batch.success_count} {t.bulkValid}, {batch.error_count} {t.bulkInvalid})
          </Typography>
          {batch.zip_ready ? (
            <Button onClick={() => void downloadBatchZip(batch.id)}>{t.downloadZip}</Button>
          ) : (
            ["completed", "partial"].includes(batch.status) && <Typography color="text.secondary">{t.waitZip}</Typography>
          )}
        </Stack>
      )}
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ mt: 4 }}>
        {batches.map((b) => (
          <Box key={b.id} sx={{ py: 1, display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="body2">
              #{b.id} {b.status} {b.success_count}/{b.total_rows}
            </Typography>
            {b.zip_ready ? (
              <Button size="small" onClick={() => void downloadBatchZip(b.id)}>
                {t.downloadZip}
              </Button>
            ) : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
