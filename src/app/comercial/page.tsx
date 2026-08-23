import Link from "next/link";
import {
  getNavigationChildren,
  getNavigationItemById,
} from "@/config/clapNavigation";

export default function CommercialPage() {
  const department = getNavigationItemById("dc");
  const processes = getNavigationChildren("dc");

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
            Procesos de Dirección Comercial
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Selecciona el proceso comercial que deseas gestionar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {processes.map((process) => {
            const isActive = process.status === "active";

            const cardContent = (
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
                    <h3
                      className={`text-base font-semibold ${
                        isActive ? "text-gray-900" : "text-gray-600"
                      }`}
                    >
                      {process.label}
                    </h3>

                    <p
                      className={`mt-1.5 text-sm leading-6 ${
                        isActive ? "text-gray-600" : "text-gray-500"
                      }`}
                    >
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
                    <span className="text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
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

            if (isActive) {
              return (
                <Link
                  key={process.id}
                  href={process.href}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={process.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
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