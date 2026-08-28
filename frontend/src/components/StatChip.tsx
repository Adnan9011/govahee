import { Chip, type ChipProps, type SxProps, type Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export function StatChip({ sx, ...props }: ChipProps) {
  const color = props.color && props.color !== "default" ? props.color : "primary";
  const paletteColor =
    color === "primary" || color === "secondary" || color === "info" || color === "success" || color === "warning" || color === "error"
      ? color
      : "primary";

  return (
    <Chip
      size="small"
      {...props}
      sx={[
        (theme) => {
        const main =
          paletteColor === "primary" || paletteColor === "secondary" || paletteColor === "info" || paletteColor === "success" || paletteColor === "warning" || paletteColor === "error"
            ? theme.palette[paletteColor].main
            : theme.palette.primary.main;
        const base = {
          height: 28,
          px: 0.35,
          fontWeight: 700,
          fontSize: "0.76rem",
          borderRadius: 999,
          border: `1px solid ${alpha(main, 0.35)}`,
          bgcolor: alpha(main, props.variant === "filled" ? 0.22 : 0.1),
          color: props.variant === "filled" ? theme.palette.getContrastText(main) : main,
          "& .MuiChip-icon": {
            color: "inherit",
            fontSize: "0.95rem",
            ml: 0.25,
            mr: -0.15,
          },
          "& .MuiChip-label": {
            px: 1,
          },
        };
          return base;
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>}
    />
  );
}
