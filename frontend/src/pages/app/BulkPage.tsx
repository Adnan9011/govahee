import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Button, Input, Select } from "@/components/ui";
import { fetchBatches, startBulkIssue, uploadBulk } from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { fetchTemplates } from "@/api/services";
import { useEffect } from "react";
import type { BatchRow, TemplateRow } from "@/api/types";
import { getApiErrorMessage } from "@/api/client";

export default function BulkPage() {
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>();
  const [batch, setBatch] = useState<BatchRow | null>(null);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState<BatchRow[]>([]);
  useEffect(() => {
    fetchTemplates().then((d) => setTemplates(d.results));
    fetchBatches().then((d) => setBatches(d.results));
  }, []);
  const fields = ["recipient_name", "email", "course_name", "score", "issue_date", "grade"];
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t.bulk}</Typography>
      {step === 0 && (
        <Box sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
          <Select
            label={t.template}
            value={templateId}
            onChange={(e) => setTemplateId(Number(e.target.value))}
            options={templates.map((tp) => ({ value: tp.id, label: tp.name }))}
          />
          <Button component="label" variant="contained">
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
                  const res = await uploadBulk(form);
                  setHeaders(res.headers);
                  setMapping(res.suggested_mapping);
                  setBatch(res.batch);
                  setStep(1);
                } catch (err) {
                  setError(getApiErrorMessage(err));
                }
              }}
            />
          </Button>
        </Box>
      )}
      {step === 1 && mapping && (
        <Box sx={{ display: "grid", gap: 2, maxWidth: 560 }}>
          {headers.map((h) => (
            <Select
              key={h}
              label={h}
              value={mapping[h] || ""}
              onChange={(e) => setMapping({ ...mapping, [h]: String(e.target.value) })}
              options={fields.map((f) => ({ value: f, label: f }))}
            />
          ))}
          <Button
            variant="contained"
            onClick={async () => {
              if (!batch) return;
              const updated = await startBulkIssue({
                step: "issue",
                batch_id: batch.id,
                column_mapping: mapping,
              });
              setBatch(updated);
              setStep(2);
            }}
          >
            {t.bulkIssue}
          </Button>
        </Box>
      )}
      {step === 2 && batch && (
        <Typography>
          {batch.status} — {batch.processed_rows}/{batch.total_rows}
        </Typography>
      )}
      {error && <Typography color="error">{error}</Typography>}
      <Box sx={{ mt: 4 }}>
        {batches.map((b) => (
          <Typography key={b.id} variant="body2">
            #{b.id} {b.status} {b.success_count}/{b.total_rows}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
