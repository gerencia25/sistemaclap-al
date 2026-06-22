"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const menuItems = [
  { label: "Inicio", href: "/", permission: null },
  { label: "Comercial", href: "/comercial", permission: "COMERCIAL_VIEW" },
  {
    label: "Abastecimiento y Logística",
    href: "/abastecimiento-logistica",
    permission: "ABASTECIMIENTO_LOGISTICA_VIEW",
  },
  {
    label: "Operaciones",
    href: "/operaciones",
    permission: "OPERACIONES_VIEW",
  },
  {
    label: "Financiera",
    href: "/financiera",
    permission: "FINANCIERA_VIEW",
  },
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
  {
    label: "Configuración",
    href: "/configuracion",
    permission: "CONFIGURACION_VIEW",
  },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  const pathname = usePathname();
  const { session, systemUser, hasPermission, signOut } = useAuth();

  const isLoginPage = pathname.startsWith("/login");

  const visibleMenuItems = useMemo(() => {
    if (!session || !systemUser) return [];

    return menuItems.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  }, [session, systemUser, hasPermission]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  async function handleSignOut() {
    setOpen(false);
    await signOut();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-3 transition hover:opacity-80"
        >
          <Image
            src="/logo.png"
            alt="AL Multiformas"
            width={56}
            height={56}
            className="h-auto w-12"
            priority
          />

          <div className="leading-tight">
            <p className="text-sm font-bold text-[#07076b]">Sistema CLAP</p>
            <p className="text-xs text-gray-500">A&L Multiformas</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {visibleMenuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-1 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "border-[#07076b] text-[#07076b]"
                    : "border-transparent text-gray-500 hover:border-[#07076b] hover:text-[#07076b]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          {session && systemUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-[#07076b]">
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
                className="inline-flex rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#07076b] hover:text-[#07076b] hover:shadow-md active:translate-y-0"
              >
                Cerrar sesión
              </button>
            </div>
          ) : !isLoginPage ? (
            <Link
              href="/login"
              className="inline-flex rounded-2xl bg-[#07076b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 active:translate-y-0"
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
            {visibleMenuItems.map((item) => {
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

            {session && systemUser ? (
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
            ) : !isLoginPage ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-5 rounded-2xl bg-[#07076b] px-5 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:shadow-md"
              >
                Iniciar sesión
              </Link>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
