import CloseIcon from "@mui/icons-material/Close";
import { IconButton, type IconButtonProps } from "@mui/material";

export type FieldClearButtonProps = Omit<IconButtonProps, "children">;

/**
 * Compact clear (×) control for filter/search fields.
 * Shown only by the parent when the field has a value.
 */
export function FieldClearButton({
  edge = "end",
  tabIndex = -1,
  "aria-label": ariaLabel = "پاک کردن",
  sx,
  ...props
}: FieldClearButtonProps) {
  return (
    <IconButton
      size="small"
      edge={edge}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      {...props}
      sx={{
        p: 0.25,
        color: "text.secondary",
        "&:hover": { color: "text.primary" },
        ...sx,
      }}
    >
      <CloseIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}
