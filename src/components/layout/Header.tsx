"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const moduleItems = [
  { label: "Comercial", href: "/comercial", permission: "COMERCIAL_VIEW" },
  {
    label: "Abastecimiento y Logística",
    href: "/abastecimiento-logistica",
    permission: "ABASTECIMIENTO_LOGISTICA_VIEW",
  },
  { label: "Operaciones", href: "/operaciones", permission: "OPERACIONES_VIEW" },
  { label: "Financiera", href: "/financiera", permission: "FINANCIERA_VIEW" },
  {
    label: "Gestión Humana",
    href: "/gestion-humana",
    permission: "GESTION_HUMANA_VIEW",
  },
  {
    label: "Diseño y Desarrollo",
    href: "/diseno-desarrollo",
    permission: "DISENO_DESARROLLO_VIEW",
  },
];

const configItem = {
  label: "Configuración",
  href: "/configuracion",
  permission: "CONFIGURACION_VIEW",
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

  const pathname = usePathname();
  const { session, systemUser, hasPermission, signOut } = useAuth();

  const isLoginPage = pathname.startsWith("/login");

  const visibleModuleItems = useMemo(() => {
    if (!session || !systemUser) return [];

    return moduleItems.filter((item) => hasPermission(item.permission));
  }, [session, systemUser, hasPermission]);

  const canSeeConfig =
    Boolean(session && systemUser) && hasPermission(configItem.permission);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isModulesActive = visibleModuleItems.some((item) =>
    pathname.startsWith(item.href)
  );

  async function handleSignOut() {
    setOpen(false);
    setModulesOpen(false);
    await signOut();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-6">
        <Link
          href="/"
          className="flex min-w-fit items-center gap-3 transition hover:opacity-80"
        >
          <Image
            src="/logo.png"
            alt="AL Multiformas"
            width={56}
            height={56}
            className="h-auto w-11"
            priority
          />

          <div className="leading-tight">
            <p className="text-sm font-bold text-[#07076b]">Sistema CLAP</p>
            <p className="text-xs text-gray-500">A&L Multiformas</p>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
          {session && systemUser && (
            <>
              <Link
                href="/"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive("/")
                    ? "bg-[#07076b] text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-[#07076b]"
                }`}
              >
                Inicio
              </Link>

              {visibleModuleItems.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModulesOpen((current) => !current)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isModulesActive
                        ? "bg-[#07076b] text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-[#07076b]"
                    }`}
                  >
                    Módulos ▾
                  </button>

                  {modulesOpen && (
                    <div className="absolute left-1/2 top-11 w-72 -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                      {visibleModuleItems.map((item) => {
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setModulesOpen(false)}
                            className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                              active
                                ? "bg-[#07076b] text-white"
                                : "text-gray-600 hover:bg-gray-50 hover:text-[#07076b]"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {canSeeConfig && (
                <Link
                  href={configItem.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive(configItem.href)
                      ? "bg-[#07076b] text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-[#07076b]"
                  }`}
                >
                  Configuración
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="hidden min-w-fit lg:block">
          {session && systemUser ? (
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gray-50 px-4 py-2 text-right leading-tight">
                <p className="max-w-52 truncate text-sm font-bold text-[#07076b]">
                  {systemUser.full_name}
                </p>

                <p className="text-xs text-gray-500">
                  {systemUser.is_super_admin
                    ? "Super administrador"
                    : "Usuario ERP"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-[#07076b] hover:text-[#07076b] hover:shadow-md"
              >
                Cerrar sesión
              </button>
            </div>
          ) : !isLoginPage ? (
            <Link
              href="/login"
              className="inline-flex rounded-2xl bg-[#07076b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
            >
              Iniciar sesión
            </Link>
          ) : null}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#07076b] transition hover:bg-gray-100 lg:hidden"
          aria-label="Abrir menú"
        >
          <span className="text-3xl leading-none">{open ? "×" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white/95 shadow-lg backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            {session && systemUser && (
              <>
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className={`border-b border-gray-100 py-4 text-base font-medium transition ${
                    isActive("/")
                      ? "text-[#07076b] underline underline-offset-8"
                      : "text-gray-500 hover:text-[#07076b]"
                  }`}
                >
                  Inicio
                </Link>

                {visibleModuleItems.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`border-b border-gray-100 py-4 text-base font-medium transition ${
                        active
                          ? "text-[#07076b] underline underline-offset-8"
                          : "text-gray-500 hover:text-[#07076b]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}

                {canSeeConfig && (
                  <Link
                    href={configItem.href}
                    onClick={() => setOpen(false)}
                    className={`border-b border-gray-100 py-4 text-base font-medium transition ${
                      isActive(configItem.href)
                        ? "text-[#07076b] underline underline-offset-8"
                        : "text-gray-500 hover:text-[#07076b]"
                    }`}
                  >
                    Configuración
                  </Link>
                )}

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-[#07076b]">
                    {systemUser.full_name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {systemUser.is_super_admin
                      ? "Super administrador"
                      : "Usuario ERP"}
                  </p>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-4 w-full rounded-2xl bg-[#07076b] px-5 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}

            {!session && !isLoginPage && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-5 rounded-2xl bg-[#07076b] px-5 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:shadow-md"
              >
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
