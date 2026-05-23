const options = [
  {
    code: "OC",
    title: "Órdenes de compra",
    description:
      "Crear y consultar órdenes de compra a proveedores de materias primas, insumos y repuestos.",
    href: "/abastecimiento-logistica/compras",
    status: "Activo",
  },
  {
    code: "RC",
    title: "Recepción de compras",
    description:
      "Registrar entradas de materiales, lotes, facturas, remisiones y cuentas por pagar.",
    href: "/abastecimiento-logistica/recepciones",
    status: "En construcción",
  },
  {
    code: "IN",
    title: "Inventarios",
    description:
      "Consultar existencias por item, bodega, lote, reservado y disponible.",
    href: "/abastecimiento-logistica/inventarios",
    status: "En construcción",
  },
  {
    code: "KD",
    title: "Kardex",
    description:
      "Consultar movimientos históricos de entradas, salidas, reservas, ajustes y producción.",
    href: "/abastecimiento-logistica/kardex",
    status: "En construcción",
  },
  {
    code: "CP",
    title: "Cuentas por pagar",
    description:
      "Consultar facturas de proveedores, vencimientos, saldos y estados de pago.",
    href: "/abastecimiento-logistica/cuentas-por-pagar",
    status: "En construcción",
  },
];

export default function AbastecimientoPage() {
  return (
    <div className="space-y-10">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Módulo
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Abastecimiento y Logística
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Gestiona compras, recepciones, inventarios, kardex, reservas y
          trazabilidad logística del sistema.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Operaciones principales
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => {
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
                  Ir al módulo →
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}