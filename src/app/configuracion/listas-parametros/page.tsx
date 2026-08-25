import Link from "next/link";

const parameterGroups = [
  {
    code: "LN",
    title: "Líneas de negocio",
    description:
      "Retail, Farmacéutico, Especiales, Alimentos y nuevas líneas que la compañía defina.",
    status: "Activo",
    href: "/configuracion/listas-parametros/lineas-negocio",
  },
  {
    code: "SC",
    title: "Segmentos comerciales",
    description:
      "Mayorista, Minorista, Cliente Final y futuras clasificaciones comerciales.",
    status: "Activo",
    href: "/configuracion/listas-parametros/segmentos-comerciales",
  },
  {
  code: "CT",
  title: "Categorías de terceros",
  description:
    "Cliente, Proveedor y futuras categorías utilizadas en las solicitudes y maestro de terceros.",
  status: "Activo",
  href: "/configuracion/listas-parametros/categorias-terceros",
},
];

export default function ListasParametrosPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Listas y parámetros
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Administra las opciones utilizadas en listas desplegables y
          parámetros generales de CLAP sin necesidad de modificar código ni
          ingresar directamente a Supabase.
        </p>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Comercial
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Selecciona una lista para consultar y administrar sus opciones.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {parameterGroups.map((group) => (
            <Link
              key={group.code}
              href={group.href}
              className="group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold text-white">
                  {group.code}
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {group.status}
                </span>
              </div>

              <h3 className="mt-5 text-base font-semibold text-gray-900">
                {group.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {group.description}
              </p>

              <span className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
                Administrar →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <p className="text-sm font-semibold text-[#07076b]">
          Administración centralizada
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
          Las opciones inactivas dejarán de aparecer en nuevos formularios,
          pero permanecerán disponibles en registros históricos. De esta forma
          no se pierde trazabilidad al modificar una lista.
        </p>
      </section>
    </div>
  );
}