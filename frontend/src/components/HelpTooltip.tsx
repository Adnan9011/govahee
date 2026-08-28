import {
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  ClickAwayListener,
  IconButton,
  Tooltip,
  type TooltipProps,
} from "@mui/material";

type TapTooltipProps = {
  title: ReactNode;
  children: ReactElement;
  placement?: TooltipProps["placement"];
};

/** Tooltip that opens on tap (mobile) and hover (desktop). */
export function TapTooltip({ title, children, placement = "top" }: TapTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Tooltip
        title={title}
        arrow
        placement={placement}
        open={open}
        onClose={() => setOpen(false)}
        disableFocusListener
        disableHoverListener
        disableTouchListener
        enterTouchDelay={0}
        leaveTouchDelay={3000}
        slotProps={{
          tooltip: { sx: { maxWidth: 320, fontSize: "0.8rem", lineHeight: 1.6 } },
          popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 1 } },
        }}
      >
        <span
          style={{ display: "inline-flex", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </span>
      </Tooltip>
    </ClickAwayListener>
  );
}

type HelpTooltipProps = {
  title: ReactNode;
  placement?: TooltipProps["placement"];
  size?: "small" | "medium";
};

export function HelpTooltip({ title, placement = "top", size = "small" }: HelpTooltipProps) {
  return (
    <TapTooltip title={title} placement={placement}>
      <IconButton
        size={size}
        color="inherit"
        aria-label="راهنما"
        sx={{ p: 0.25, color: "text.secondary" }}
      >
        <HelpOutlineIcon sx={{ fontSize: size === "small" ? 18 : 22 }} />
      </IconButton>
    </TapTooltip>
  );
}
