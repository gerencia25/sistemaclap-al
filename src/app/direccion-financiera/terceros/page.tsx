const thirdPartyOptions = [
  {
    title: "Creación de terceros",
    description:
      "Gestiona las solicitudes recibidas, revisa pendientes y formaliza la creación o actualización de terceros.",
    href: "/direccion-financiera/terceros/creacion",
    code: "CT",
    status: "Activo",
  },
  {
    title: "Base de datos de terceros",
    description:
      "Consulta, crea y edita clientes, proveedores y otros terceros registrados en el sistema.",
    href: "/direccion-financiera/terceros/base-datos",
    code: "BD",
    status: "Activo",
  },
];

export default function TercerosPage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Dirección Financiera · Terceros
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Módulo de Terceros
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
  Administra la creación, consulta y mantenimiento de clientes, proveedores y
  otros terceros registrados en CLAP.
</p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {thirdPartyOptions.map((option) => {
          const isActive = option.status === "Activo";

          return (
            <a
              key={option.title}
              href={option.href}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold tracking-wide text-white">
                  {option.code}
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {option.status}
                </span>
              </div>

              <div className="mt-5">
                <h3 className="text-base font-semibold text-gray-900">
                  {option.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {option.description}
                </p>
              </div>

              <span className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
                Abrir →
              </span>
            </a>
          );
        })}
      </section>
    </div>
  );
}