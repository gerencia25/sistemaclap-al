"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

const modules = [
  {
    code: "CO",
    title: "Comercial",
    description:
      "Gestión de clientes, cotizaciones, seguimiento comercial y oportunidades de negocio.",
    href: "/comercial",
    status: "Activo",
    permission: "COMERCIAL_VIEW",
  },
  {
    code: "AL",
    title: "Abastecimiento y Logística",
    description:
      "Compras, inventarios, proveedores, abastecimiento y control logístico interno.",
    href: "/abastecimiento-logistica",
    status: "En construcción",
    permission: "ABASTECIMIENTO_LOGISTICA_VIEW",
  },
  {
    code: "OP",
    title: "Operaciones",
    description:
      "Gestión operativa, trazabilidad de procesos y control de actividades internas.",
    href: "/operaciones",
    status: "En construcción",
    permission: "OPERACIONES_VIEW",
  },
  {
    code: "FI",
    title: "Financiera",
    description:
      "Facturación, cartera, ingresos, egresos y control financiero empresarial.",
    href: "/financiera",
    status: "En construcción",
    permission: "FINANCIERA_VIEW",
  },
  {
    code: "GH",
    title: "Gestión Humana",
    description:
      "Administración de personal, roles, novedades, desempeño y recursos humanos.",
    href: "/gestion-humana",
    status: "En construcción",
    permission: "GESTION_HUMANA_VIEW",
  },
  {
    code: "DD",
    title: "Diseño y Desarrollo",
    description:
      "Gestión creativa, diseño de productos, desarrollo técnico y soporte digital.",
    href: "/diseno-desarrollo",
    status: "En construcción",
    permission: "DISENO_DESARROLLO_VIEW",
  },
  {
    code: "CF",
    title: "Configuración",
    description:
      "Administración de datos maestros, usuarios, permisos, terceros, personal y parámetros base del ERP.",
    href: "/configuracion",
    status: "Activo",
    permission: "CONFIGURACION_VIEW",
  },
];

export default function HomePage() {
  const { hasPermission, systemUser } = useAuth();

  return (
    <div className="space-y-12">
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            ERP interno
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b] md:text-4xl">
            Sistema CLAP
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
            Plataforma integral para centralizar, organizar y controlar los
            procesos comerciales, logísticos, operativos, financieros,
            administrativos y organizacionales de A&L Multiformas.
          </p>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            El sistema permite trabajar con datos maestros controlados,
            solicitudes internas, aprobaciones, trazabilidad, usuarios por rol y
            permisos de acceso según las responsabilidades de cada persona.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Estado general
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-700">
                Acceso seguro por usuario
              </p>
              <p className="mt-1 text-sm text-emerald-700/80">
                El sistema valida sesión, usuario ERP, rol y permisos.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-[#07076b]">
                Módulos escalables
              </p>
              <p className="mt-1 text-sm text-gray-600">
                La plataforma está preparada para crecer por áreas y procesos.
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">
                Módulos en construcción
              </p>
              <p className="mt-1 text-sm text-amber-700/80">
                Sistema en constante actualización.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Módulos del sistema
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Los módulos bloqueados aparecen visibles para mostrar la estructura
            completa del ERP, pero el acceso depende de los permisos asignados a
            tu usuario.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {modules.map((module) => {
            const isActive = module.status === "Activo";
            const allowed =
              Boolean(systemUser?.is_super_admin) ||
              hasPermission(module.permission);

            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide text-white ${
                        allowed ? "bg-[#07076b]" : "bg-gray-400"
                      }`}
                    >
                      {module.code}
                    </div>

                    <div>
                      <h3
                        className={`text-base font-semibold ${
                          allowed ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {module.title}
                      </h3>

                      <p
                        className={`mt-1.5 max-w-xl text-sm leading-6 ${
                          allowed ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        {module.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {module.status}
                    </span>

                    {!allowed && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>

                {allowed ? (
                  <span className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
                    Ir al módulo →
                  </span>
                ) : (
                  <span className="mt-5 inline-flex text-sm font-medium text-gray-400">
                    Sin permiso de acceso
                  </span>
                )}
              </>
            );

            if (allowed) {
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={module.title}
                className="rounded-2xl border border-gray-200 bg-white/70 p-5 opacity-80 shadow-sm"
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
