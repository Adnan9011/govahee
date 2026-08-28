import { Button } from "@/components/ui";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Box,
  Typography,
} from "@mui/material";
import { logger } from "@/utils/logger";
import { fa } from "@/i18n/fa";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("React render error", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            {fa.unexpectedError}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {this.state.error?.message || fa.error}
          </Typography>
          <Button variant="contained" onClick={this.handleRetry}>
            {fa.retry}
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
