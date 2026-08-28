import { type ReactNode, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import AddBoxIcon from "@mui/icons-material/AddBox";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import PeopleIcon from "@mui/icons-material/People";
import VerifiedIcon from "@mui/icons-material/Verified";
import SettingsIcon from "@mui/icons-material/Settings";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { Button } from "@/components/ui";
import { APP_DRAWER_WIDTH } from "@/constants/layout";
import { useAuth } from "@/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { PageTransition } from "@/components/PageTransition";
import { AppAlertProvider } from "@/context/AppAlertContext";

export function AppLayout({ children }: { children?: ReactNode }) {
  const { t, locale, setLocale } = useLocale();
  const { logout, role, memberships, organizationId, setOrganizationId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(false);

  const nav = useMemo(
    () => [
      { to: "/app", label: t.dashboard, icon: <DashboardIcon />, end: true },
      { to: "/app/certificates", label: t.certificates, icon: <WorkspacePremiumIcon /> },
      { to: "/app/issue", label: t.issue, icon: <AddBoxIcon /> },
      { to: "/app/bulk", label: t.bulk, icon: <UploadFileIcon /> },
      { to: "/app/templates", label: t.templates, icon: <DesignServicesIcon /> },
      { to: "/app/recipients", label: t.recipients, icon: <PeopleIcon /> },
      { to: "/app/verify-search", label: t.verification, icon: <VerifiedIcon /> },
      { to: "/app/billing", label: t.billing, icon: <CreditCardIcon /> },
      { to: "/app/settings", label: t.settings, icon: <SettingsIcon /> },
      ...(role === "platform_admin"
        ? [{ to: "/platform", label: t.platform, icon: <AdminPanelSettingsIcon /> }]
        : []),
    ],
    [t, role]
  );

  const drawer = (
    <Box sx={{ width: APP_DRAWER_WIDTH, pt: 2 }} dir={locale === "fa" ? "rtl" : "ltr"}>
      <Typography variant="h6" sx={{ px: 2, fontWeight: 800, mb: 2 }}>
        {t.brand}
      </Typography>
      <List>
        {nav.map((item) => {
          const selected = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={selected}
              onClick={() => setOpen(false)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <AppAlertProvider>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {isMobile ? (
          <Drawer open={open} onClose={() => setOpen(false)}>
            {drawer}
          </Drawer>
        ) : (
          <Drawer variant="permanent" open>
            {drawer}
          </Drawer>
        )}
        <Box sx={{ flex: 1, ml: { md: `${APP_DRAWER_WIDTH}px` }, mr: 0 }}>
          <AppBar position="sticky" color="transparent" elevation={0}>
            <Toolbar sx={{ gap: 1 }}>
              {isMobile && (
                <IconButton onClick={() => setOpen(true)} aria-label="menu">
                  <MenuIcon />
                </IconButton>
              )}
              {memberships.length > 1 && (
                <select
                  value={organizationId ?? ""}
                  onChange={(e) => setOrganizationId(Number(e.target.value))}
                  style={{ background: "transparent", color: "inherit", border: "1px solid #334155", borderRadius: 8, padding: 8 }}
                >
                  {memberships.map((m) => (
                    <option key={m.organization_id} value={m.organization_id}>
                      {m.organization_name}
                    </option>
                  ))}
                </select>
              )}
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="text" onClick={() => setLocale(locale === "fa" ? "en" : "fa")}>
                {locale === "fa" ? "EN" : "FA"}
              </Button>
              <IconButton
                aria-label={t.logout}
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
          <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: "auto" }}>
            <PageTransition>
              {children ?? <Outlet />}
            </PageTransition>
          </Box>
        </Box>
      </Box>
    </AppAlertProvider>
  );
}
