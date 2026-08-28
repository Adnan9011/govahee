import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Button, Select } from "@/components/ui";
import { fetchPlatformOrgs, patchPlatformOrg } from "@/api/services";
import type { Organization } from "@/api/types";
import { useLocale } from "@/i18n/LocaleContext";

export default function PlatformPage() {
  const { t } = useLocale();
  const [rows, setRows] = useState<Organization[]>([]);
  useEffect(() => {
    fetchPlatformOrgs().then(setRows);
  }, []);
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t.platform}</Typography>
      {rows.map((org) => (
        <Box key={org.id} sx={{ py: 2, borderBottom: "1px solid", borderColor: "divider", display: "grid", gap: 1 }}>
          <Typography fontWeight={700}>{org.name}</Typography>
          <Select
            label="status"
            value={org.verification_status}
            onChange={async (e) => {
              const updated = await patchPlatformOrg({ id: org.id, verification_status: e.target.value });
              setRows((prev) => prev.map((r) => (r.id === org.id ? updated : r)));
            }}
            options={[
              { value: "pending", label: "pending" },
              { value: "verified", label: "verified" },
              { value: "rejected", label: "rejected" },
              { value: "suspended", label: "suspended" },
            ]}
          />
          <Button
            onClick={async () => {
              const updated = await patchPlatformOrg({ id: org.id, is_suspended: true, issuance_enabled: false });
              setRows((prev) => prev.map((r) => (r.id === org.id ? updated : r)));
            }}
          >
            Suspend
          </Button>
        </Box>
      ))}
    </Box>
  );
}
