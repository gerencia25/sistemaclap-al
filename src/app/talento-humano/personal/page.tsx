import Link from "next/link";

export default function PersonalPage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Talento Humano · Personal
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Personal
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Administración del maestro de empleados y su información laboral.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/talento-humano/personal/base-datos"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold text-white">
              BD
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Activo
            </span>
          </div>

          <h3 className="mt-5 text-base font-semibold text-gray-900">
            Base de datos de personal
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Consulta, registra y actualiza empleados, datos laborales,
            jefaturas y estado del personal.
          </p>

          <span className="mt-5 inline-flex text-sm font-medium text-[#07076b]">
            Abrir →
          </span>
        </Link>
      </section>
    </div>
  );
}