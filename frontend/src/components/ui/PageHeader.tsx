import {
  Box,
  Stack,
  Typography,
  type BoxProps,
} from "@mui/material";
import type { ReactNode } from "react";
import { mergeSx } from "@/components/ui/sx";
import { designTokens } from "@/theme/tokens";

export type PageHeaderProps = Omit<BoxProps, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <Box
      {...props}
      component="header"
      sx={mergeSx({ mb: `${designTokens.layout.headerGap}px` }, props.sx)}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography variant="overline" color="primary.main">
              {eyebrow}
            </Typography>
          ) : null}
          <Typography component="h1" variant="h4" color="text.primary">
            {title}
          </Typography>
          {description ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75, maxWidth: designTokens.layout.readableMaxWidth }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Stack
            direction="row"
            flexWrap="wrap"
            useFlexGap
            gap={1}
            sx={{ flexShrink: 0 }}
          >
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

export type SectionHeaderProps = Omit<BoxProps, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function SectionHeader({
  title,
  description,
  actions,
  ...props
}: SectionHeaderProps) {
  return (
    <Box {...props} component="header" sx={mergeSx({ mb: 2 }, props.sx)}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h5" color="text.primary">
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
