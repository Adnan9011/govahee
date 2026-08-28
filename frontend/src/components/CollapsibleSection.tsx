import {
  ReactNode,
  useState,
} from "react";
import { Box,
  Collapse,
  Paper,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  optionalHint?: string;
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  optionalHint,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          px: 2,
          py: 1.25,
          cursor: "pointer",
          userSelect: "none",
          bgcolor: open ? "action.selected" : "transparent",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {optionalHint && !open ? (
            <Typography variant="caption" color="text.secondary">
              {optionalHint}
            </Typography>
          ) : null}
        </Box>
        {open ? (
          <ExpandLessIcon fontSize="small" color="action" />
        ) : (
          <ExpandMoreIcon fontSize="small" color="action" />
        )}
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 2, pt: 0.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}
