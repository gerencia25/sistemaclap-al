"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { CLAP_DEPARTMENTS } from "@/config/clapNavigation";

const legacyPermissions: Record<string, string | undefined> = {
  JD: undefined,
  SC: undefined,
  DF: "FINANCIERA_VIEW",
  DC: "COMERCIAL_VIEW",
  DD: "DISENO_DESARROLLO_VIEW",
  DT: undefined,
  DO: "OPERACIONES_VIEW",
  TH: "GESTION_HUMANA_VIEW",
  CO: "CONFIGURACION_VIEW",
};

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
            procesos de A&L Multiformas.
          </p>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            La plataforma está organizada por departamentos y permite gestionar
            solicitudes, procesos, aprobaciones, trazabilidad, usuarios, roles y
            permisos de acceso.
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
                CLAP valida sesión, usuario ERP, rol y permisos.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-[#07076b]">
                Estructura centralizada
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Los departamentos y rutas principales se administran desde un
                catálogo central.
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">
                CLAP V2 en construcción
              </p>
              <p className="mt-1 text-sm text-amber-700/80">
                Los procesos se irán habilitando progresivamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Departamentos
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Selecciona el departamento al que deseas ingresar. Los accesos
            dependen del rol y los permisos asignados a cada usuario.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CLAP_DEPARTMENTS.map((department) => {
            const legacyPermission =
              legacyPermissions[department.departmentCode ?? ""];

            const allowed =
              Boolean(systemUser?.is_super_admin) ||
              (legacyPermission
                ? hasPermission(legacyPermission)
                : department.permission
                  ? hasPermission(department.permission)
                  : false);

            const isActive = department.status === "active";

            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide text-white ${
                        allowed ? "bg-[#07076b]" : "bg-gray-400"
                      }`}
                    >
                      {department.code}
                    </div>

                    <div>
                      <h3
                        className={`text-base font-semibold ${
                          allowed ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {department.label}
                      </h3>

                      <p
                        className={`mt-1.5 text-sm leading-6 ${
                          allowed ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        {department.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isActive ? "Activo" : "En construcción"}
                    </span>

                    {!allowed && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                        Bloqueado
                      </span>
                    )}
                  </div>

                  {allowed ? (
                    <span className="text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
                      Ir al módulo →
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      Sin acceso
                    </span>
                  )}
                </div>
              </>
            );

            if (allowed) {
              return (
                <Link
                  key={department.id}
                  href={department.href}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={department.id}
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