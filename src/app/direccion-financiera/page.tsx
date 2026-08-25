import Link from "next/link";

const financialOptions = [
  {
    code: "CP",
    title: "Caracterización y procedimiento",
    description:
      "Consulta los documentos oficiales de caracterización, procedimientos y versiones vigentes de la Dirección Financiera.",
    href: "/direccion-financiera/caracterizacion-procedimiento",
    status: "Activo",
  },
  {
    code: "TER",
    title: "Terceros",
    description:
      "Administra clientes, proveedores y otros terceros, sus solicitudes recibidas y datos maestros.",
    href: "/direccion-financiera/terceros",
    status: "Activo",
  },
];

export default function DireccionFinancieraPage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Dirección Financiera
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Dirección Financiera
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Gestión financiera, administrativa y de maestros bajo responsabilidad
          de la Dirección Financiera.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {financialOptions.map((option) => (
          <Link
            key={option.code}
            href={option.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold text-white">
                {option.code}
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {option.status}
              </span>
            </div>

            <h3 className="mt-5 text-base font-semibold text-gray-900">
              {option.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {option.description}
            </p>

            <span className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
              Abrir →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}