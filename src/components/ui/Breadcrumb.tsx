"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getBestNavigationItemByPath,
  getBreadcrumbItems,
} from "@/config/clapNavigation";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items?: BreadcrumbItem[];
};

function normalizePath(path: string) {
  if (!path || path === "/") return "/";

  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const pathname = usePathname();

  let breadcrumbItems: BreadcrumbItem[] = items ?? [];

  if (!items) {
    const matchedItem = getBestNavigationItemByPath(pathname);

    if (!matchedItem || matchedItem.id === "inicio") {
      return null;
    }

    const currentPath = normalizePath(pathname);
    const matchedPath = normalizePath(matchedItem.href);
    const isExactMatch = currentPath === matchedPath;

    /*
     * Evita mostrar breadcrumbs incompletos en rutas antiguas
     * que todavía no están registradas en el catálogo V2.
     *
     * Ejemplo:
     * /configuracion/codificacion/...
     *
     * Por ahora no mostraría simplemente:
     * Inicio > Configuración
     */
    if (!isExactMatch && matchedItem.type !== "page") {
      return null;
    }

    breadcrumbItems = getBreadcrumbItems(matchedItem.id).map((item) => ({
      label: item.label,
      href: item.href,
    }));

    /*
     * Soporte para rutas dinámicas futuras:
     *
     * /operaciones/planeacion/recepcion-pedidos/PED-000152
     */
    if (!isExactMatch && matchedItem.type === "page") {
      const remainingPath = currentPath
        .slice(matchedPath.length)
        .split("/")
        .filter(Boolean);

      let accumulatedPath = matchedPath;

      const dynamicItems = remainingPath.map((segment) => {
        accumulatedPath += `/${segment}`;

        return {
          label: decodeURIComponent(segment),
          href: accumulatedPath,
        };
      });

      breadcrumbItems = [...breadcrumbItems, ...dynamicItems];
    }
  }

  if (!breadcrumbItems.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500"
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="font-medium transition hover:text-[#07076b]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "font-semibold text-[#07076b]"
                    : "font-medium text-slate-500"
                }
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <span className="select-none text-slate-300">›</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}