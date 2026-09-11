import Link from "next/link";
import {
  getNavigationChildren,
  getNavigationItemById,
} from "@/config/clapNavigation";

export default function SistemaGestionCalidadPage() {
  const department = getNavigationItemById("sc");
  const processes = getNavigationChildren("sc");

  return (
    <div className="space-y-10">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          {department?.code}
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          {department?.label}
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          {department?.description}
        </p>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Procesos del Sistema de Gestión de la Calidad
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Selecciona el proceso que deseas gestionar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {processes.map((process) => {
            const isActive = process.status === "active";

            const content = (
              <>
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide text-white ${
                      isActive ? "bg-[#07076b]" : "bg-gray-400"
                    }`}
                  >
                    {process.code}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {process.label}
                    </h3>

                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      {process.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {isActive ? "Activo" : "En construcción"}
                  </span>

                  {isActive ? (
                    <span className="text-sm font-medium text-[#07076b]">
                      Ingresar →
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      Próximamente
                    </span>
                  )}
                </div>
              </>
            );

            return isActive ? (
              <Link
                key={process.id}
                href={process.href}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
              >
                {content}
              </Link>
            ) : (
              <div
                key={process.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
