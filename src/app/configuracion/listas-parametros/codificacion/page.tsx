import Link from "next/link";

const sections = [
  {
    code: "CA",
    title: "Categorías",
    description:
      "Administra las categorías principales de items, como PTF, PTC, materia prima, insumos y otras clasificaciones.",
    href: "/configuracion/listas-parametros/codificacion/categorias",
  },
  {
    code: "GR",
    title: "Grupos",
    description:
      "Administra los grupos pertenecientes a cada categoría, por ejemplo FARMA, Retail u otras agrupaciones.",
    href: "/configuracion/listas-parametros/codificacion/grupos",
  },
  {
    code: "SG",
    title: "Subgrupos",
    description:
      "Administra los subgrupos pertenecientes a cada grupo, como envases, tapas y demás familias de items.",
    href: "/configuracion/listas-parametros/codificacion/subgrupos",
  },
  {
    code: "PL",
    title: "Plantillas de codificación",
    description:
      "Define cómo se construye el código y nombre automático para cada combinación de categoría, grupo y subgrupo.",
    href: "/configuracion/listas-parametros/codificacion/plantillas",
  },
  {
    code: "OP",
    title: "Opciones de clasificación",
    description:
      "Administra valores codificados utilizados por las plantillas, como tipo, boca, capacidad, color y material.",
    href: "/configuracion/listas-parametros/codificacion/opciones",
  },
  {
    code: "DM",
    title: "Datos maestros",
    description:
      "Configura los campos adicionales que debe registrar cada categoría, como proceso productivo, ficha técnica, imagen y precio.",
    href: "/configuracion/listas-parametros/codificacion/datos-maestros",
  },
];

export default function CodificacionParametrosPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Listas y parámetros
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Codificación
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Administra la estructura que utiliza CLAP para clasificar items,
          construir códigos automáticos y definir sus datos maestros.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.code}
            href={section.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold text-white">
                {section.code}
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Activo
              </span>
            </div>

            <h2 className="mt-5 text-base font-semibold text-gray-900">
              {section.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {section.description}
            </p>

            <span className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
              Administrar →
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
        <p className="text-sm font-semibold text-amber-800">
          Protección de la estructura de códigos
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-800/80">
          Los códigos técnicos que ya estén relacionados con plantillas,
          productos u otros maestros no podrán modificarse libremente.
          Las configuraciones que dejen de utilizarse se inactivarán para
          conservar la trazabilidad histórica.
        </p>
      </section>
    </div>
  );
}
