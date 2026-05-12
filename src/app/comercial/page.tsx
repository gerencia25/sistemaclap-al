const commercialOptions = [
  {
    code: "NC",
    title: "Nueva Cotización",
    description:
      "Crear propuestas comerciales para clientes con productos, cantidades, precios y condiciones.",
    href: "/comercial/cotizaciones/nueva",
    status: "Disponible",
  },
  {
    code: "HC",
    title: "Historial de Cotizaciones",
    description:
      "Consultar cotizaciones generadas, revisar consecutivos, clientes, valores y estados comerciales.",
    href: "/comercial/cotizaciones",
    status: "Disponible",
  },
  {
    code: "NP",
    title: "Nuevo Pedido",
    description:
      "Registrar pedidos comerciales confirmados y preparar su seguimiento operativo.",
    href: "/comercial/pedidos/nuevo",
    status: "En construcción",
  },
  {
    code: "SP",
    title: "Seguimiento de Pedidos",
    description:
      "Consultar el estado, avance y trazabilidad de los pedidos registrados en el sistema.",
    href: "/comercial/pedidos",
    status: "En construcción",
  },
];

export default function CommercialPage() {
  return (
    <div className="space-y-10">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Módulo
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Comercial
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Espacio para la gestión comercial de A&L Multiformas: cotizaciones,
          pedidos y seguimiento de solicitudes comerciales.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Acciones comerciales
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {commercialOptions.map((option) => (
            <div
              key={option.title}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold tracking-wide text-white">
                  {option.code}
                </div>

                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
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
                Ingresar →
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}