import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import VerifiedIcon from "@mui/icons-material/Verified";
import BlockIcon from "@mui/icons-material/Block";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { Button } from "@/components/ui";
import { DashboardHero } from "@/components/DashboardHero";
import { DashboardStatCard } from "@/components/DashboardStatCard";
import { EmptyState } from "@/components/ui/FeedbackStates";
import { fetchDashboard } from "@/api/services";
import type { DashboardStats } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";
import { formatNumber } from "@/utils/format";
import { getApiErrorMessage } from "@/api/client";

export default function DashboardPage() {
  const { t } = useLocale();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);
  if (error) return <Typography color="error">{error}</Typography>;
  if (!data) return null;
  const limit = Number(data.entitlements.certificates_per_month || 0);
  return (
    <Box>
      <DashboardHero
        overline={t.dashboard}
        title={t.brand}
        subtitle={t.tagline}
        actions={
          <Button component={Link} to="/app/issue" variant="contained">
            {t.issue}
          </Button>
        }
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <DashboardStatCard icon={<WorkspacePremiumIcon />} label={t.issued} value={formatNumber(data.issued)} color="var(--ds-color-brand-primary)" />
        <DashboardStatCard icon={<VerifiedIcon />} label={t.active} value={formatNumber(data.active)} color="var(--ds-color-success)" />
        <DashboardStatCard icon={<EventBusyIcon />} label={t.expired} value={formatNumber(data.expired)} color="var(--ds-color-warning)" />
        <DashboardStatCard icon={<BlockIcon />} label={t.revoked} value={formatNumber(data.revoked)} color="var(--ds-color-error)" />
        <DashboardStatCard icon={<VerifiedIcon />} label={t.verifications} value={formatNumber(data.verifications)} color="var(--ds-chart-teal)" />
        <DashboardStatCard icon={<WorkspacePremiumIcon />} label={t.thisMonth} value={formatNumber(data.this_month)} color="var(--ds-chart-purple)" />
        <DashboardStatCard icon={<WorkspacePremiumIcon />} label={t.downloads} value={formatNumber(data.downloads)} color="var(--ds-chart-amber)" />
        <DashboardStatCard
          icon={<WorkspacePremiumIcon />}
          label={t.planUsage}
          value={`${formatNumber(data.usage_issued)}${limit ? ` / ${formatNumber(limit)}` : ""}`}
          color="var(--ds-chart-royal)"
        />
      </Box>
      {data.issued === 0 ? (
        <EmptyState title={t.emptyCertificates} actionLabel={t.issue} onAction={() => { window.location.href = "/app/issue"; }} />
      ) : (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>{t.recentCertificates}</Typography>
          {data.recent_certificates.map((c) => (
            <Box key={c.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
              <Button component={Link} to={`/app/certificates/${c.id}`} variant="text">
                {c.certificate_number} — {c.recipient_name}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
