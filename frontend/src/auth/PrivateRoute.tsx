import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Box, CircularProgress } from "@mui/material";

export function PrivateRoute({
  children,
  platformOnly = false,
}: {
  children: ReactNode;
  platformOnly?: boolean;
}) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (platformOnly && role !== "platform_admin") {
    return <Navigate to="/app" replace />;
  }
  return children;
}
