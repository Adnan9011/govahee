import {
  Box,
  CircularProgress,
  Skeleton as MuiSkeleton,
  Stack,
  Typography,
  type BoxProps,
  type SkeletonProps as MuiSkeletonProps,
} from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { mergeSx } from "@/components/ui/sx";

export type EmptyStateProps = Omit<BoxProps, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actionLabel?: ReactNode;
  onAction?: () => void;
};

export function EmptyState({
  title = "داده‌ای یافت نشد",
  description,
  icon = <InboxOutlinedIcon sx={{ fontSize: 42 }} />,
  actionLabel,
  onAction,
  ...props
}: EmptyStateProps) {
  return (
    <Box
      {...props}
      role="status"
      sx={mergeSx(
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          px: 2,
          py: 6,
          color: "text.secondary",
        },
        props.sx,
      )}
    >
      <Box aria-hidden sx={{ display: "flex", mb: 1.5, color: "text.disabled" }}>
        {icon}
      </Box>
      <Typography variant="h6" color="text.primary">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 480 }}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" onClick={onAction} sx={{ mt: 2 }}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}

export type LoadingStateProps = BoxProps & {
  label?: ReactNode;
  size?: number;
  inline?: boolean;
};

export function LoadingState({
  label = "در حال بارگذاری…",
  size = 32,
  inline = false,
  ...props
}: LoadingStateProps) {
  return (
    <Box
      {...props}
      role="status"
      aria-live="polite"
      sx={mergeSx(
        {
          display: "flex",
          flexDirection: inline ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          py: inline ? 1 : 6,
        },
        props.sx,
      )}
    >
      <CircularProgress size={size} />
      {label ? (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      ) : null}
    </Box>
  );
}

export type SkeletonProps = MuiSkeletonProps & {
  lines?: number;
};

export function Skeleton({ lines = 1, ...props }: SkeletonProps) {
  if (lines <= 1) return <MuiSkeleton animation="wave" {...props} />;
  return (
    <Stack spacing={1} aria-label="در حال بارگذاری" role="status">
      {Array.from({ length: lines }, (_, index) => (
        <MuiSkeleton
          animation="wave"
          {...props}
          key={index}
          width={index === lines - 1 ? "68%" : props.width}
        />
      ))}
    </Stack>
  );
}
