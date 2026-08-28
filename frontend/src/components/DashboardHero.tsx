import { Card } from "@/components/ui";
import { Box, CardContent, Stack, Typography, alpha, useTheme } from "@mui/material";
import type { ReactNode } from "react";

export function DashboardHero({
  overline,
  title,
  subtitle,
  icon,
  actions,
  accent = "primary",
}: {
  overline: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  actions?: ReactNode;
  accent?: "primary" | "secondary";
}) {
  const theme = useTheme();
  const color = accent === "secondary" ? theme.palette.secondary : theme.palette.primary;

  return (
    <Card
      className="ui-card-stagger"
      sx={{
        mb: 3,
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${alpha(color.main, 0.28)}`,
        background: `linear-gradient(135deg, ${alpha(color.main, 0.24)} 0%, ${alpha(
          theme.palette.secondary.main,
          0.12,
        )} 45%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
        "&::before": {
          content: '""',
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "50%",
          top: -80,
          left: -60,
          bgcolor: alpha(color.light, 0.12),
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          bottom: -70,
          right: -40,
          bgcolor: alpha(theme.palette.secondary.main, 0.1),
          pointerEvents: "none",
        },
      }}
    >
      <CardContent sx={{ position: "relative", zIndex: 1 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              {icon}
              <Typography variant="overline" color={`${accent}.light`} fontWeight={800} letterSpacing={1.2}>
                {overline}
              </Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
              {subtitle}
            </Typography>
          </Box>
          {actions}
        </Stack>
      </CardContent>
    </Card>
  );
}
