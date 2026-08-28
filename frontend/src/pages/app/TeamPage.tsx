import { useEffect, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { Button, Input, PageHeader, Select } from "@/components/ui";
import { EmptyState } from "@/components/ui/FeedbackStates";
import { fetchTeam, inviteMember, removeMember } from "@/api/services";
import { useLocale } from "@/i18n/LocaleContext";
import { getApiErrorMessage } from "@/api/client";

const ROLES = ["admin", "issuer", "designer", "viewer"] as const;

export default function TeamPage() {
  const { t } = useLocale();
  const [rows, setRows] = useState<Array<{ id: number; email: string; full_name: string; role: string }>>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("issuer");
  const [error, setError] = useState("");
  const load = () => fetchTeam().then((d) => setRows(d.results));
  useEffect(() => {
    void load();
  }, []);
  const roleLabel = (value: string) =>
    ({
      owner: t.roleOwner,
      admin: t.roleAdmin,
      issuer: t.roleIssuer,
      designer: t.roleDesigner,
      viewer: t.roleViewer,
    }[value] ?? value);
  return (
    <Stack spacing={3}>
      <PageHeader title={t.team} description={t.emptyTeam} />
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} maxWidth={720}>
        <Input label={t.inviteEmail} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Select
          label={t.role}
          value={role}
          onChange={(e) => setRole(String(e.target.value))}
          options={ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
        />
        <Button
          variant="contained"
          onClick={async () => {
            try {
              setError("");
              await inviteMember({ email, role, full_name: fullName });
              setEmail("");
              setFullName("");
              await load();
            } catch (err) {
              setError(getApiErrorMessage(err));
            }
          }}
        >
          {t.invite}
        </Button>
      </Stack>
      {error && <Typography color="error">{error}</Typography>}
      {rows.length === 0 ? (
        <EmptyState title={t.emptyTeam} />
      ) : (
        rows.map((row) => (
          <Stack key={row.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ flex: 1 }}>{row.full_name || row.email}</Typography>
            <Typography color="text.secondary">{roleLabel(row.role)}</Typography>
            {row.role !== "owner" && (
              <Button
                variant="text"
                onClick={async () => {
                  await removeMember(row.id);
                  await load();
                }}
              >
                {t.revoke}
              </Button>
            )}
          </Stack>
        ))
      )}
    </Stack>
  );
}
