import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { PageHeader, Card } from "@/components/ui";
import { SimpleBarChart } from "@/components/SimpleBarChart";
import { fetchAnalytics } from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { formatNumber } from "@/utils/format";
import { getApiErrorMessage } from "@/api/client";

export default function AnalyticsPage() {
  const { t } = useLocale();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAnalytics>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);
  if (error) return <Typography color="error">{error}</Typography>;
  if (!data) return null;
  return (
    <Box>
      <PageHeader title={t.analytics} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
        <Card sx={{ p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>{t.issuedOverTime}</Typography>
          <SimpleBarChart
            data={data.series}
            series={[{ key: "issued", label: t.issued, color: "var(--ds-color-brand-primary)" }]}
            hideZeroBars
          />
        </Card>
        <Card sx={{ p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>{t.verifiedOverTime}</Typography>
          <SimpleBarChart
            data={data.series}
            series={[{ key: "verified", label: t.verifications, color: "var(--ds-chart-teal)" }]}
            hideZeroBars
          />
        </Card>
      </Box>
      <Typography sx={{ mb: 2 }}>
        {t.uniqueVisitors}: {formatNumber(data.unique_visitors)} · {t.verifications}: {formatNumber(data.verifications)}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <Card sx={{ p: 2 }}>
          <Typography fontWeight={700}>{t.topCourses}</Typography>
          {data.top_courses.map((row) => (
            <Typography key={row.name} variant="body2">{row.name} — {formatNumber(row.count)}</Typography>
          ))}
        </Card>
        <Card sx={{ p: 2 }}>
          <Typography fontWeight={700}>{t.topTemplates}</Typography>
          {data.top_templates.map((row) => (
            <Typography key={row.name} variant="body2">{row.name} — {formatNumber(row.count)}</Typography>
          ))}
        </Card>
      </Box>
    </Box>
  );
}
