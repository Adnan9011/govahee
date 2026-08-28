import {
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { Box,
} from "@mui/material";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <Box key={location.pathname} className="ui-page-enter">
      {children}
    </Box>
  );
}
