const configOptions = [
  {
    code: "CL",
    title: "Clientes",
    description:
      "Administrar la base maestra de clientes comerciales del sistema.",
    href: "/configuracion/clientes",
    status: "Activo",
  },
  {
    code: "IT",
    title: "Items",
    description:
      "Gestionar productos, materias primas, insumos, repuestos, activos, servicios y su comportamiento operativo.",
    href: "/configuracion/productos",
    status: "Activo",
  },
  {
    code: "PV",
    title: "Proveedores",
    description:
      "Administrar proveedores, contactos, datos fiscales y condiciones de pago para compras y recepción de materiales.",
    href: "/configuracion/proveedores",
    status: "Activo",
  },
  {
    code: "CA",
    title: "Categorías",
    description:
      "Configurar categorías comerciales utilizadas en clientes, items y cotizaciones.",
    href: "/configuracion/categorias",
    status: "En construcción",
  },
  {
    code: "VE",
    title: "Vendedores",
    description:
      "Administrar usuarios comerciales, cargos y datos de contacto para cotizaciones y pedidos.",
    href: "/configuracion/vendedores",
    status: "En construcción",
  },
  {
    code: "BO",
    title: "Bodegas",
    description:
      "Configurar bodegas, ubicaciones y centros de almacenamiento para inventarios, producción y despachos.",
    href: "/configuracion/bodegas",
    status: "En construcción",
  },
  {
    code: "AC",
    title: "Acabados",
    description:
      "Administrar acabados disponibles por proceso productivo: soplado, inyección y extrusión.",
    href: "/configuracion/acabados",
    status: "En construcción",
  },
  {
    code: "LP",
    title: "Listas de precios",
    description:
      "Controlar precios comerciales, vigencias y condiciones por cliente o producto.",
    href: "/configuracion/listas-precios",
    status: "En construcción",
  },
  {
    code: "PI",
    title: "Plantillas ISO",
    description:
      "Gestionar versiones, formatos y plantillas oficiales para documentos comerciales.",
    href: "/configuracion/plantillas",
    status: "En construcción",
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