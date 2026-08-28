import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Button, Card, PageHeader } from "@/components/ui";
import { fetchPlans, fetchSubscription, startPayment } from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { formatMoney } from "@/utils/format";
import { getApiErrorMessage } from "@/api/client";

export default function BillingPage() {
  const { t, locale } = useLocale();
  const [params] = useSearchParams();
  const payment = params.get("payment");
  const [plans, setPlans] = useState<Array<{
    id: number;
    code: string;
    name: string;
    name_fa: string;
    price_toman: number;
    capabilities: Record<string, unknown>;
  }>>([]);
  const [sub, setSub] = useState<{ plan?: string; status?: string } | null>(null);
  const [gateways, setGateways] = useState<{ bitpay: boolean; zibal: boolean }>({ bitpay: false, zibal: false });
  const [error, setError] = useState("");
  useEffect(() => {
    fetchPlans().then(setPlans);
    fetchSubscription().then((d) => {
      setSub(d.subscription);
      if (d.gateways) setGateways(d.gateways);
    });
  }, []);
  const pay = async (gateway: string, planId: number) => {
    try {
      setError("");
      const started = await startPayment(gateway, planId);
      window.location.href = started.redirect_url;
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };
  return (
    <Box>
      <PageHeader title={t.billing} />
      {payment === "success" && <Typography color="success.main" sx={{ mb: 2 }}>{t.paymentSuccess}</Typography>}
      {payment === "failed" && <Typography color="error" sx={{ mb: 2 }}>{t.paymentFailed}</Typography>}
      {payment === "canceled" && <Typography color="warning.main" sx={{ mb: 2 }}>{t.paymentCanceled}</Typography>}
      {sub && <Typography sx={{ mb: 2 }}>{sub.plan} — {sub.status}</Typography>}
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        {plans.map((p) => (
          <Card key={p.code} sx={{ p: 2 }}>
            <Typography fontWeight={800}>{locale === "fa" ? p.name_fa : p.name}</Typography>
            <Typography sx={{ my: 1 }}>{formatMoney(p.price_toman)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {String(p.capabilities.certificates_per_month ?? "")} / {t.thisMonth}
            </Typography>
            {p.price_toman > 0 && (
              <Box sx={{ display: "grid", gap: 1 }}>
                {gateways.zibal && (
                  <Button size="small" variant="contained" onClick={() => void pay("zibal", p.id)}>
                    {t.payWithZibal}
                  </Button>
                )}
                {gateways.bitpay && (
                  <Button size="small" variant="outline" onClick={() => void pay("bitpay", p.id)}>
                    {t.payWithBitPay}
                  </Button>
                )}
                {!gateways.zibal && !gateways.bitpay && (
                  <Typography variant="caption" color="text.secondary">{t.gatewayDisabled}</Typography>
                )}
              </Box>
            )}
          </Card>
        ))}
      </Box>
    </Box>
  );
}
