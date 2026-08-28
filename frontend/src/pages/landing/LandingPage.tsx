import { Link as RouterLink } from "react-router-dom";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Button, Card } from "@/components/ui";
import { useLocale } from "@/i18n/LocaleContext";
import { SeoHead } from "@/components/seo/SeoHead";
import { fetchSiteConfig } from "@/api/services";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const { t, locale, setLocale } = useLocale();
  const [brand, setBrand] = useState(t.brand);
  useEffect(() => {
    fetchSiteConfig()
      .then((c) => setBrand(locale === "fa" ? c.display_name_fa : c.display_name))
      .catch(() => undefined);
  }, [locale]);

  const features = [
    t.featureDesign,
    t.featureBulk,
    t.featurePdf,
    t.featureQr,
    t.featureApi,
    t.featureBrand,
  ];

  return (
    <Box>
      <SeoHead title={`${brand} — ${t.tagline}`} description={t.tagline} />
      <Box sx={{ px: 3, py: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <Typography fontWeight={800}>{brand}</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="text" onClick={() => setLocale(locale === "fa" ? "en" : "fa")}>
          {locale === "fa" ? "EN" : "FA"}
        </Button>
        <Button component={RouterLink} to="/login" variant="text">
          {t.ctaLogin}
        </Button>
        <Button component={RouterLink} to="/register" variant="contained">
          {t.ctaStart}
        </Button>
      </Box>
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 12 }, textAlign: "center" }}>
        <Typography variant="h3" fontWeight={800} gutterBottom>
          {t.heroTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, fontSize: 18 }}>
          {t.tagline}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <Button component={RouterLink} to="/register" size="large" variant="contained">
            {t.ctaStart}
          </Button>
          <Button component={RouterLink} to="/login" size="large" variant="outlined">
            {t.ctaLogin}
          </Button>
        </Stack>
      </Container>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          {t.featuresTitle}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          {features.map((item) => (
            <Card key={item} sx={{ p: 3, minHeight: 88 }}>
              <Typography fontWeight={700}>{item}</Typography>
            </Card>
          ))}
        </Box>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 6, mb: 2 }}>
          {t.howTitle}
        </Typography>
        <Stack spacing={1}>
          <Typography>1. {t.how1}</Typography>
          <Typography>2. {t.how2}</Typography>
          <Typography>3. {t.how3}</Typography>
          <Typography>4. {t.how4}</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 6, fontSize: 13 }}>
          {t.legalNote}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
          <Button component={RouterLink} to="/legal/terms" variant="text" size="small">
            {t.terms}
          </Button>
          <Button component={RouterLink} to="/legal/privacy" variant="text" size="small">
            {t.privacy}
          </Button>
          <Button component={RouterLink} to="/legal/issuer_responsibility" variant="text" size="small">
            {t.issuerResponsibility}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
