import { Card } from "@/components/ui";
import { cssDesignVariables } from "@/theme/tokens";
import { Box, CardContent, Stack, Typography, alpha, useTheme } from "@mui/material";
import type { ReactNode } from "react";

function resolveColor(color: string) {
  const match = color.match(/^var\((--[^),\s]+)\)$/);
  if (!match) return color;

  return cssDesignVariables[match[1] as keyof typeof cssDesignVariables] ?? color;
}

export function DashboardStatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  const theme = useTheme();
  const resolvedColor = resolveColor(color);

  return (
    <Card
      className="ui-hover-lift ui-card-stagger"
      sx={{
        height: "100%",
        background: `linear-gradient(145deg, ${alpha(resolvedColor, 0.16)} 0%, ${alpha(theme.palette.background.paper, 0.92)} 65%)`,
        border: `1px solid ${alpha(resolvedColor, 0.28)}`,
        position: "relative",
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          top: -24,
          left: -24,
          width: 88,
          height: 88,
          borderRadius: "50%",
          bgcolor: alpha(resolvedColor, 0.08),
          pointerEvents: "none",
        },
      }}
    >
      <CardContent sx={{ position: "relative", zIndex: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(resolvedColor, 0.2),
              color,
              boxShadow: `0 4px 14px ${alpha(resolvedColor, 0.25)}`,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
