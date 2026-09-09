import { Fade } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import { forwardRef, type ReactElement } from "react";

type InstantTransitionProps = TransitionProps & {
  children?: ReactElement;
};

/** Zero-duration MUI transition so overlays appear without enter/exit animation. */
export const InstantTransition = forwardRef<HTMLDivElement, InstantTransitionProps>(
  function InstantTransition(props, ref) {
    return <Fade ref={ref} {...props} appear={false} timeout={0} />;
  },
);
