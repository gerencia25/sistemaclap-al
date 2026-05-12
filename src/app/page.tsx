const modules = [
  {
    code: "CO",
    title: "Comercial",
    description:
      "Gestión de clientes, cotizaciones, seguimiento comercial y oportunidades de negocio.",
    href: "/comercial",
    status: "Activo",
  },
  {
    code: "AL",
    title: "Abastecimiento y Logística",
    description:
      "Compras, inventarios, proveedores, abastecimiento y control logístico interno.",
    href: "/abastecimiento-logistica",
    status: "En construcción",
  },
  {
    code: "OP",
    title: "Operaciones",
    description:
      "Gestión operativa, trazabilidad de procesos y control de actividades internas.",
    href: "/operaciones",
    status: "En construcción",
  },
  {
    code: "FI",
    title: "Financiera",
    description:
      "Facturación, cartera, ingresos, egresos y control financiero empresarial.",
    href: "/financiera",
    status: "En construcción",
  },
  {
    code: "GH",
    title: "Gestión Humana",
    description:
      "Administración de personal, roles, novedades, desempeño y recursos humanos.",
    href: "/gestion-humana",
    status: "En construcción",
  },
  {
    code: "DD",
    title: "Diseño y Desarrollo",
    description:
      "Gestión creativa, diseño de productos, desarrollo técnico y soporte digital.",
    href: "/diseno-desarrollo",
    status: "En construcción",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          ERP Interno
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Sistema integral para la administración de procesos comerciales,
          logísticos, operativos, financieros y organizacionales de A&L
          Multiformas.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Módulos del sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {modules.map((module) => {
            const isActive = module.status === "Activo";

            return (
              <div
                key={module.title}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold tracking-wide text-white">
                      {module.code}
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {module.title}
                      </h3>

                      <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-600">
                        {module.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {module.status}
                  </span>
                </div>

                <a
                  href={module.href}
                  className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1"
                >
                  Ir al módulo →
                </a>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}