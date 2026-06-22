const configOptions = [
  {
    code: "CD",
    title: "Codificación",
    description:
      "Gestionar productos, materias primas, insumos, repuestos, activos, servicios y su comportamiento operativo.",
    href: "/configuracion/codificacion",
    status: "Activo",
  },
  {
    code: "TR",
    title: "Terceros",
    description:
      "Administrar clientes, proveedores y otros terceros en una única base maestra preparada para integración con SIIGO.",
    href: "/configuracion/terceros",
    status: "Activo",
  },
  {
  title: "Personal",
  description:
    "Administrar empleados, solicitudes de ingreso, cargos, áreas y estado laboral del personal.",
  href: "/configuracion/personal",
  code: "PE",
  status: "Activo",
},
];

export default function ConfiguracionPage() {
  return (
    <div className="space-y-10">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Módulo
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Configuración
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Administra los datos maestros y parámetros principales que alimentan
          los módulos operativos del sistema.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Datos maestros y parámetros
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {configOptions.map((option) => {
            const isActive = option.status === "Activo";

            return (
              <div
                key={option.title}
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

                <a
                  href={option.href}
                  className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1"
                >
                  Ir a configuración →
                </a>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}