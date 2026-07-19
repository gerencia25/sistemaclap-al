"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type SystemUser = {
  id: string;
  employee_id: string | null;
  full_name: string;
  email: string;
  role_id: string | null;
  status: string;
  is_super_admin: boolean;
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  systemUser: SystemUser | null;
  permissions: string[];
  hasPermission: (permissionCode: string) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const publicPaths = ["/login", "/auth/callback"];

const protectedRoutes = [
  {
    path: "/configuracion/usuarios-permisos",
    permission: "USUARIOS_PERMISOS_MANAGE",
  },
  {
    path: "/configuracion/areas-cargos",
    permission: "AREAS_CARGOS_MANAGE",
  },
  {
    path: "/configuracion/personal",
    permission: "PERSONAL_VIEW",
  },
  {
    path: "/configuracion/terceros",
    permission: "TERCEROS_VIEW",
  },
  {
    path: "/configuracion/codificacion",
    permission: "CODIFICACION_VIEW",
  },
  {
    path: "/configuracion",
    permission: "CONFIGURACION_VIEW",
  },
  {
    path: "/comercial",
    permission: "COMERCIAL_VIEW",
  },
  {
    path: "/abastecimiento-logistica",
    permission: "ABASTECIMIENTO_LOGISTICA_VIEW",
  },
  {
    path: "/operaciones",
    permission: "OPERACIONES_VIEW",
  },
  {
    path: "/financiera",
    permission: "FINANCIERA_VIEW",
  },
  {
    path: "/gestion-humana",
    permission: "GESTION_HUMANA_VIEW",
  },
  {
    path: "/diseno-desarrollo",
    permission: "DISENO_DESARROLLO_VIEW",
  },
];

function getRequiredPermission(pathname: string) {
  const matchedRoute = protectedRoutes.find((route) =>
    pathname.startsWith(route.path)
  );

  return matchedRoute?.permission ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  const requiredPermission = getRequiredPermission(pathname);

  const isRouteAllowed =
    !requiredPermission ||
    Boolean(systemUser?.is_super_admin) ||
    permissions.includes(requiredPermission);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(currentSession);

        if (currentSession?.user?.email) {
          await loadSystemUser(currentSession.user.email);
        } else {
          setSystemUser(null);
          setPermissions([]);
          setAccessDenied(false);
        }
      } catch (error) {
        console.error("Error inicializando autenticación:", error);

        if (isMounted) {
          setSession(null);
          setSystemUser(null);
          setPermissions([]);
          setAccessDenied(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession?.user?.email) {
        loadSystemUser(newSession.user.email);
      } else {
        setSystemUser(null);
        setPermissions([]);
        setAccessDenied(false);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!session && !isPublicPath) {
      router.replace("/login");
      return;
    }

    if (session && isPublicPath && systemUser && !accessDenied) {
      router.replace("/");
    }
  }, [loading, session, systemUser, accessDenied, isPublicPath, router]);

  async function loadSystemUser(email: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: userData, error: userError } = await supabase
        .from("system_users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (userError || !userData) {
        if (userError) {
          console.warn("Error consultando usuario ERP:", userError);
        }

        setSystemUser(null);
        setPermissions([]);
        setAccessDenied(true);
        return;
      }

      const user = userData as SystemUser;

      if (user.status !== "Activo") {
        setSystemUser(user);
        setPermissions([]);
        setAccessDenied(true);
        return;
      }

      setSystemUser(user);
      setAccessDenied(false);

      if (user.is_super_admin) {
        const { data: allPermissions, error: permissionsError } = await supabase
          .from("system_permissions")
          .select("permission_code")
          .eq("status", "Activo");

        if (permissionsError) {
          console.error("Error cargando permisos:", permissionsError);
          setPermissions([]);
          return;
        }

        setPermissions(
          (allPermissions ?? []).map(
            (permission) => permission.permission_code
          )
        );
        return;
      }

      if (!user.role_id) {
        setPermissions([]);
        return;
      }

      const { data: rolePermissionRows, error: rolePermissionsError } =
        await supabase
          .from("system_role_permissions")
          .select("permission_id")
          .eq("role_id", user.role_id);

      if (rolePermissionsError || !rolePermissionRows?.length) {
        console.error("Error cargando permisos del rol:", rolePermissionsError);
        setPermissions([]);
        return;
      }

      const permissionIds = rolePermissionRows.map((row) => row.permission_id);

      const { data: permissionsData, error: permissionsError } = await supabase
        .from("system_permissions")
        .select("permission_code")
        .in("id", permissionIds)
        .eq("status", "Activo");

      if (permissionsError) {
        console.error("Error cargando códigos de permisos:", permissionsError);
        setPermissions([]);
        return;
      }

      setPermissions(
        (permissionsData ?? []).map(
          (permission) => permission.permission_code
        )
      );
    } catch (error) {
      console.error("Error cargando usuario del ERP:", error);
      setSystemUser(null);
      setPermissions([]);
      setAccessDenied(true);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setSystemUser(null);
    setPermissions([]);
    setAccessDenied(false);
    router.replace("/login");
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      systemUser,
      permissions,
      hasPermission: (permissionCode: string) =>
        Boolean(
          systemUser?.is_super_admin || permissions.includes(permissionCode)
        ),
      signOut,
    }),
    [loading, session, systemUser, permissions]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#07076b]">
            Cargando Sistema CLAP...
          </p>
        </div>
      </div>
    );
  }

  if (!session && !isPublicPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#07076b]">
            Redirigiendo al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  if (session && accessDenied && !isPublicPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-700">
            Acceso no autorizado
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tu correo está autenticado, pero no existe como usuario activo en el
            ERP o se encuentra bloqueado.
          </p>

          <button
            type="button"
            onClick={signOut}
            className="mt-6 rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#05054f]"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (session && systemUser && !isPublicPath && !isRouteAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-lg rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-amber-700">
            Permiso insuficiente
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tu usuario no tiene permiso para ingresar a esta sección del ERP.
          </p>

          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            Permiso requerido: {requiredPermission}
          </p>

          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-6 rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#05054f]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
