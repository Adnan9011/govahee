import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Typography } from "@mui/material";
import { fetchIssuer } from "@/api/services";
import { SeoHead } from "@/components/seo/SeoHead";

export default function IssuerPage() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchIssuer>> | null>(null);
  useEffect(() => {
    fetchIssuer(slug).then(setData).catch(() => setData(null));
  }, [slug]);
  if (!data) return null;
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <SeoHead title={data.name} description={data.about || data.description} />
      <Typography variant="h4" fontWeight={800}>{data.name}</Typography>
      {data.verification_status === "verified" && (
        <Typography color="success.main">Verified organization</Typography>
      )}
      <Typography sx={{ mt: 2 }}>{data.about || data.description}</Typography>
      {data.certificates_issued != null && (
        <Typography sx={{ mt: 2 }}>{data.certificates_issued}</Typography>
      )}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 4 }}>
        {data.disclaimer}
      </Typography>
    </Container>
  );
}
