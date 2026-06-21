const thirdPartyForms = [
  {
    title: "Solicitud de terceros",
    description:
      "Formulario oficial para solicitar la creación o actualización de clientes, proveedores y otros terceros.",
    href: "/configuracion/terceros/formatos/solicitud-terceros",
    code: "ST",
    status: "Activo",
  },
];

export default function FormatosTercerosPage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Terceros
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Formatos
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Consulta y diligencia los formatos oficiales asociados al proceso de
          gestión de terceros.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {thirdPartyForms.map((form) => {
          const isActive = form.status === "Activo";

          return (
            <a
              key={form.title}
              href={form.href}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold tracking-wide text-white">
                  {form.code}
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {form.status}
                </span>
              </div>

              <div className="mt-5">
                <h3 className="text-base font-semibold text-gray-900">
                  {form.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {form.description}
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