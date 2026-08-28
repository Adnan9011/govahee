import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRoleFromToken } from "@/api/client";
import { fetchAuthSession, login as apiLogin, logoutSession, register as apiRegister } from "@/api/services";
import type { Membership, Role, Session } from "@/api/types";
import { api } from "@/api/client";

interface AuthContextValue {
  role: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  organizationId: number | null;
  memberships: Membership[];
  login: (loginValue: string, password: string) => Promise<Role>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    organization_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setOrganizationId: (id: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(
    () => (sessionStorage.getItem("auth_role") as Role | null) ?? null
  );
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [organizationId, setOrganizationIdState] = useState<number | null>(() => {
    const raw = sessionStorage.getItem("org_id");
    return raw ? Number(raw) : null;
  });

  const applyOrgHeader = useCallback((id: number | null) => {
    if (id) {
      api.defaults.headers.common["X-Organization-Id"] = String(id);
      sessionStorage.setItem("org_id", String(id));
    } else {
      delete api.defaults.headers.common["X-Organization-Id"];
      sessionStorage.removeItem("org_id");
    }
  }, []);

  const setOrganizationId = useCallback(
    (id: number) => {
      setOrganizationIdState(id);
      applyOrgHeader(id);
    },
    [applyOrgHeader]
  );

  const loadSession = useCallback(async () => {
    try {
      const data = await fetchAuthSession();
      setSession(data);
      setRole(data.role);
      sessionStorage.setItem("auth_role", data.role);
      const first = data.memberships[0];
      const current =
        data.memberships.find((m) => m.organization_id === organizationId) ?? first;
      if (current) {
        setOrganizationIdState(current.organization_id);
        applyOrgHeader(current.organization_id);
      }
    } catch {
      setSession(null);
      setRole(null);
      sessionStorage.removeItem("auth_role");
    } finally {
      setLoading(false);
    }
  }, [applyOrgHeader, organizationId]);

  useEffect(() => {
    applyOrgHeader(organizationId);
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const data = await apiLogin(loginValue, password);
    const nextRole = (data.role || getRoleFromToken(data.access || "") || "member") as Role;
    sessionStorage.setItem("auth_role", nextRole);
    setRole(nextRole);
    await loadSession();
    return nextRole;
  }, [loadSession]);

  const register = useCallback(async (payload) => {
    await apiRegister(payload);
    sessionStorage.setItem("auth_role", "member");
    setRole("member");
    await loadSession();
  }, [loadSession]);

  const logout = useCallback(async () => {
    await logoutSession();
    sessionStorage.removeItem("auth_role");
    sessionStorage.removeItem("org_id");
    setRole(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      role,
      loading,
      isAuthenticated: Boolean(role),
      session,
      organizationId,
      memberships: session?.memberships ?? [],
      login,
      register,
      logout,
      setOrganizationId,
    }),
    [role, loading, session, organizationId, login, register, logout, setOrganizationId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
