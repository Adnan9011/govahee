import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { AuthProvider } from "@/auth/AuthContext";
import { PrivateRoute } from "@/auth/PrivateRoute";
import { AppLayout } from "@/components/Layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import LandingPage from "@/pages/landing/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import SetPasswordPage from "@/pages/SetPasswordPage";
import LegalPage from "@/pages/LegalPage";
import VerifyPage from "@/pages/public/VerifyPage";
import IssuerPage from "@/pages/public/IssuerPage";

const DashboardPage = lazy(() => import("@/pages/app/DashboardPage"));
const CertificatesPage = lazy(() => import("@/pages/app/CertificatesPage"));
const CertificateDetailPage = lazy(() => import("@/pages/app/CertificateDetailPage"));
const IssuePage = lazy(() => import("@/pages/app/IssuePage"));
const BulkPage = lazy(() => import("@/pages/app/BulkPage"));
const TemplatesPage = lazy(() => import("@/pages/app/TemplatesPage"));
const TemplateEditorPage = lazy(() => import("@/pages/app/TemplateEditorPage"));
const RecipientsPage = lazy(() => import("@/pages/app/RecipientsPage"));
const TeamPage = lazy(() => import("@/pages/app/TeamPage"));
const AnalyticsPage = lazy(() => import("@/pages/app/AnalyticsPage"));
const IntegrationsPage = lazy(() => import("@/pages/app/IntegrationsPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));
const OnboardingPage = lazy(() => import("@/pages/app/OnboardingPage"));
const BillingPage = lazy(() => import("@/pages/app/BillingPage"));
const VerifySearchPage = lazy(() => import("@/pages/app/VerifySearchPage"));
const PlatformPage = lazy(() => import("@/pages/platform/PlatformPage"));

function Fallback() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/set-password/:uid/:token" element={<SetPasswordPage />} />
          <Route path="/legal/:kind" element={<LegalPage />} />
          <Route path="/verify/:token" element={<VerifyPage />} />
          <Route path="/issuer/:slug" element={<IssuerPage />} />
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="certificates/:id" element={<CertificateDetailPage />} />
            <Route path="issue" element={<IssuePage />} />
            <Route path="bulk" element={<BulkPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="templates/:id" element={<TemplateEditorPage />} />
            <Route path="recipients" element={<RecipientsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="verify-search" element={<VerifySearchPage />} />
          </Route>
          <Route
            path="/platform"
            element={
              <PrivateRoute platformOnly>
                <AppLayout>
                  <PlatformPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
