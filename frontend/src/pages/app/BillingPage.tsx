import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Card } from "@/components/ui";
import { fetchPlans, fetchSubscription } from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { formatMoney } from "@/utils/format";

export default function BillingPage() {
  const { t, locale } = useLocale();
  const [plans, setPlans] = useState<Array<{ code: string; name: string; name_fa: string; price_toman: number; capabilities: Record<string, unknown> }>>([]);
  const [sub, setSub] = useState<{ plan?: string; status?: string } | null>(null);
  useEffect(() => {
    fetchPlans().then(setPlans);
    fetchSubscription().then((d) => setSub(d.subscription));
  }, []);
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t.billing}</Typography>
      {sub && <Typography sx={{ mb: 2 }}>{sub.plan} — {sub.status}</Typography>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        {plans.map((p) => (
          <Card key={p.code} sx={{ p: 2 }}>
            <Typography fontWeight={800}>{locale === "fa" ? p.name_fa : p.name}</Typography>
            <Typography>{formatMoney(p.price_toman)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {String(p.capabilities.certificates_per_month ?? "")} cert/mo
            </Typography>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
