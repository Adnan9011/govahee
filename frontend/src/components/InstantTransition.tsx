import { Fade, type FadeProps } from "@mui/material";
import { forwardRef } from "react";

/** Zero-duration MUI transition so overlays appear without enter/exit animation. */
export const InstantTransition = forwardRef<HTMLDivElement, FadeProps>(
  function InstantTransition({ children, ...props }, ref) {
    return (
      <Fade ref={ref} {...props} appear={false} timeout={0}>
        {children}
      </Fade>
    );
  },
);
