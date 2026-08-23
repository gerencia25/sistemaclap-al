import { getNavigationItemById } from "@/config/clapNavigation";

export default function CommercialPage() {
  const department = getNavigationItemById("dc");

  return (
    <div className="space-y-10">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          {department?.code}
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          {department?.label}
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          {department?.description}
        </p>
      </section>

      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8">
        <p className="text-sm font-semibold text-[#07076b]">
          Dirección Comercial · CLAP V2
        </p>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Este módulo se encuentra listo para ser construido nuevamente bajo la
          estructura definida para CLAP V2.
        </p>
      </section>
    </div>
  );
}