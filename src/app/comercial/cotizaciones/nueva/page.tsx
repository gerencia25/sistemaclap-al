"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type QuotePath =
  | "PRODUCTO_LINEA"
  | "PRODUCTO_NUEVO"
  | "SERVICIO_TRANSFORMACION";

const quotePaths: {
  id: QuotePath;
  code: string;
  title: string;
  description: string;
  details: string;
}[] = [
  {
    id: "PRODUCTO_LINEA",
    code: "PL",
    title: "Producto de línea",
    description:
      "Cotiza un producto ya codificado y disponible en el Maestro de Productos.",
    details:
      "CLAP buscará automáticamente la lista de precios vigente, la regla aplicable y el precio recomendado.",
  },
  {
    id: "PRODUCTO_NUEVO",
    code: "PN",
    title: "Producto nuevo",
    description:
      "Registra una necesidad nueva del cliente que requiere evaluación técnica.",
    details:
      "La solicitud pasará por viabilidad de Diseño y Desarrollo + Operaciones antes de llegar al precio y a la cotización formal.",
  },
  {
    id: "SERVICIO_TRANSFORMACION",
    code: "ST",
    title: "Servicio de transformación",
    description:
      "Cotiza fabricación para un cliente que aporta molde, materia prima o ambos.",
    details:
      "Permite calcular transformación por unidad a partir de tarifas, productividad y procesos complementarios.",
  },
];

export default function NuevaCotizacionPage() {
      const router = useRouter();
  const [selectedPath, setSelectedPath] = useState<QuotePath | null>(null);

  function handleContinue() {
    if (!selectedPath) return;

    if (selectedPath === "PRODUCTO_LINEA") {
      router.push("/comercial/cotizaciones/nueva/producto-linea");
      return;
    }

    alert(
      "Este flujo se implementará después de terminar Producto de línea.",
    );
  }

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Dirección Comercial
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Nueva cotización
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Selecciona qué necesita cotizar el cliente. Los tres caminos terminan
          en una misma cotización comercial COT-XXXXX.
        </p>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            ¿Qué deseas cotizar?
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Esta selección define el flujo interno que CLAP utilizará para
            obtener el producto y su precio.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {quotePaths.map((path) => {
            const isSelected = selectedPath === path.id;

            return (
              <button
                key={path.id}
                type="button"
                onClick={() => setSelectedPath(path.id)}
                className={`group flex min-h-[280px] flex-col rounded-3xl border p-6 text-left shadow-sm transition-all duration-300 ${
                  isSelected
                    ? "border-[#07076b] bg-[#07076b]/[0.03] ring-2 ring-[#07076b]/10"
                    : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-[#07076b]/25 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                      isSelected
                        ? "bg-[#07076b] text-white"
                        : "bg-[#07076b]/10 text-[#07076b]"
                    }`}
                  >
                    {path.code}
                  </div>

                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-[#07076b] bg-[#07076b] text-white"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </div>
                </div>

                <h3 className="mt-6 text-xl font-bold text-[#07076b]">
                  {path.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-700">
                  {path.description}
                </p>

                <div className="mt-auto pt-5">
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm leading-6 text-gray-500">
                      {path.details}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {selectedPath
              ? "Camino seleccionado"
              : "Selecciona una opción para continuar"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {selectedPath
              ? quotePaths.find((path) => path.id === selectedPath)?.title
              : "Todavía no se ha seleccionado el tipo de cotización."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedPath}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar →
        </button>
      </section>
    </div>
  );
}