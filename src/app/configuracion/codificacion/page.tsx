const codificationOptions = [
  {
    title: "Base de datos de productos",
    description:
      "Consulta, crea y edita productos, materias primas, insumos, repuestos, activos y servicios codificados.",
    href: "/configuracion/codificacion/base-datos-productos",
    code: "BD",
    status: "Activo",
  },
  {
    title: "Creación de código",
    description:
      "Gestiona el historial de solicitudes, revisa pendientes y crea nuevos códigos desde el formulario oficial.",
    href: "/configuracion/codificacion/creacion-codigo",
    code: "CC",
    status: "En construcción",
  },
  {
    title: "Caracterización y procedimiento",
    description:
      "Administra los documentos PDF de caracterización, procedimientos y versiones oficiales del proceso.",
    href: "/configuracion/codificacion/caracterizacion-procedimiento",
    code: "CP",
    status: "En construcción",
  },
  {
    title: "Formatos",
    description:
      "Consulta y administra los formatos oficiales asociados al proceso de codificación.",
    href: "/configuracion/codificacion/formatos",
    code: "FO",
    status: "En construcción",
  },
];

export default function CodificacionPage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Codificación
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Módulo de Codificación
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Administra la base de productos, solicitudes de código, creación de
          códigos, documentos de caracterización, procedimientos y formatos del
          proceso.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {codificationOptions.map((option) => {
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