import {
  Box,
  Drawer as MuiDrawer,
  IconButton,
  Stack,
  Typography,
  type DrawerProps as MuiDrawerProps,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { ReactNode } from "react";

export type DrawerProps = MuiDrawerProps & {
  title?: ReactNode;
  closeLabel?: string;
};

export function Drawer({
  title,
  children,
  closeLabel = "بستن",
  onClose,
  anchor = "right",
  PaperProps,
  ...props
}: DrawerProps) {
  return (
    <MuiDrawer
      {...props}
      anchor={anchor}
      onClose={onClose}
      PaperProps={{
        dir: "rtl",
        ...PaperProps,
      }}
    >
      {title || onClose ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
        >
          <Typography variant="h6">{title}</Typography>
          {onClose ? (
            <IconButton
              size="small"
              aria-label={closeLabel}
              onClick={(event) => onClose(event, "escapeKeyDown")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      ) : null}
      <Box sx={{ minWidth: 0, minHeight: 0, flex: 1 }}>{children}</Box>
    </MuiDrawer>
  );
}
