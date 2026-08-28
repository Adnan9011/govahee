import {
  Tooltip as MuiTooltip,
  type TooltipProps as MuiTooltipProps,
} from "@mui/material";

export type TooltipProps = MuiTooltipProps;

export function Tooltip({
  enterTouchDelay = 0,
  leaveTouchDelay = 3000,
  ...props
}: TooltipProps) {
  return (
    <MuiTooltip
      {...props}
      enterTouchDelay={enterTouchDelay}
      leaveTouchDelay={leaveTouchDelay}
    />
  );
}
