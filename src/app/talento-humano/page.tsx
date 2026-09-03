import Link from "next/link";

const options = [
  {
    code: "CP",
    title: "Caracterización y procedimiento",
    description:
      "Consulta los documentos oficiales de caracterización y procedimiento de Talento Humano.",
    href: "/talento-humano/caracterizacion-procedimiento",
    status: "Activo",
  },
  {
  code: "SP",
  title: "Solicitudes de personal",
  description:
    "Consulta, revisa, aprueba o rechaza las solicitudes de personal recibidas desde las diferentes áreas.",
  href: "/talento-humano/solicitudes-personal",
  status: "Activo",
},
  {
    code: "PER",
    title: "Personal",
    description:
      "Administra el maestro de empleados, información laboral, cargos, jefaturas y estado del personal.",
    href: "/talento-humano/personal",
    status: "Activo",
  },
  {
    code: "EO",
    title: "Estructura organizacional",
    description:
      "Administra las áreas, cargos, niveles jerárquicos y relaciones de reporte de la organización.",
    href: "/talento-humano/estructura-organizacional",
    status: "Activo",
  },
];

export default function TalentoHumanoPage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Talento Humano
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Talento Humano
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Gestión del personal, estructura organizacional y procesos asociados
          al talento humano de la organización.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => (
          <Link
            key={option.code}
            href={option.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#07076b]/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07076b] text-xs font-semibold text-white">
                {option.code}
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {option.status}
              </span>
            </div>

            <h3 className="mt-5 text-base font-semibold text-gray-900">
              {option.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {option.description}
            </p>

            <span className="mt-5 inline-flex text-sm font-medium text-[#07076b] transition group-hover:translate-x-1">
              Abrir →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}