import Link from "next/link";
import {
  getNavigationChildren,
  getNavigationItemById,
} from "@/config/clapNavigation";

export default function AlmacenesInventariosPage() {
  const section = getNavigationItemById("al-ai");
  const options = getNavigationChildren("al-ai");

  return (
    <div className="space-y-10">
      <section>
        <div className="mt-6 max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            AL · Almacenes e Inventarios
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
            {section?.label}
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            {section?.description}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Operaciones de almacén
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Consulta existencias y registra los movimientos que afectan el inventario.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => {
            const isActive = option.status === "active";

            return (
              <Link
                key={option.id}
                href={option.href}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold tracking-wide text-white">
                    {option.code}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {option.label}
                    </h3>

                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      {option.description}
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

                  <span className="text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
                    Ir al módulo →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
