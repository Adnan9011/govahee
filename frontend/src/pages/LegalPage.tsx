import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Typography } from "@mui/material";
import { useLocale } from "@/i18n/LocaleContext";
import { fetchLegal } from "@/api/services";
import { SeoHead } from "@/components/seo/SeoHead";

export default function LegalPage() {
  const { kind = "terms" } = useParams();
  const { locale } = useLocale();
  const [doc, setDoc] = useState<{ title_fa: string; title_en: string; body_fa: string; body_en: string } | null>(null);
  useEffect(() => {
    fetchLegal(kind).then(setDoc).catch(() => setDoc(null));
  }, [kind]);
  if (!doc) return null;
  const title = locale === "fa" ? doc.title_fa : doc.title_en;
  const body = locale === "fa" ? doc.body_fa : doc.body_en;
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <SeoHead title={title} noIndex />
      <Typography variant="h4" fontWeight={800} gutterBottom>
        {title}
      </Typography>
      <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>{body}</Typography>
    </Container>
  );
}
