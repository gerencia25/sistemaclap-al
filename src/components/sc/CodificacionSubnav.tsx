"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    label: "Solicitudes de código",
    description: "Revisión y gestión de solicitudes",
    href: "/sistema-gestion-calidad/codificacion",
  },
  {
    label: "Maestro de productos",
    description: "Consulta de productos oficiales",
    href: "/sistema-gestion-calidad/codificacion/maestro-productos",
  },
];

export default function CodificacionSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación de Codificación"
      className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/sistema-gestion-calidad/codificacion"
              ? pathname === tab.href
              : pathname === tab.href ||
                pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-xl px-4 py-3 transition ${
                isActive
                  ? "bg-[#07076b] text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <p className="text-sm font-semibold">
                {tab.label}
              </p>

              <p
                className={`mt-1 text-xs ${
                  isActive
                    ? "text-white/75"
                    : "text-gray-500"
                }`}
              >
                {tab.description}
              </p>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
