"use client";

import Link from "next/link";

const receptions = [
  {
    receptionNumber: "RC-26001",
    purchaseOrder: "OC-26001",
    supplier: "QUIMIPLAST SAS",
    date: "2026-05-19",
    invoice: "FV-8821",
    total: 2450000,
    status: "Recibido",
  },
];

export default function RecepcionesPage() {
  function getStatusClass(status: string) {
    if (status === "Recibido") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (status === "Parcial") {
      return "bg-blue-50 text-blue-700";
    }

    return "bg-gray-100 text-gray-700";
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Abastecimiento · Recepciones
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Recepción de Compras
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Registra entradas de materiales, lotes, facturas y movimientos de
            inventario provenientes de órdenes de compra.
          </p>
        </div>

        <Link
          href="/abastecimiento-logistica/recepciones/nueva"
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nueva recepción
        </Link>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Recepciones registradas
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Recepción</th>
                <th className="px-4 py-3">OC</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {receptions.map((reception) => (
                <tr
                  key={reception.receptionNumber}
                  className="transition hover:bg-gray-50"
                >
                  <td className="px-4 py-4 font-bold text-[#07076b]">
                    {reception.receptionNumber}
                  </td>

                  <td className="px-4 py-4 text-gray-700">
                    {reception.purchaseOrder}
                  </td>

                  <td className="px-4 py-4 font-medium text-gray-900">
                    {reception.supplier}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {reception.date}
                  </td>

                  <td className="px-4 py-4 text-gray-700">
                    {reception.invoice}
                  </td>

                  <td className="px-4 py-4 font-semibold text-gray-900">
                    ${reception.total.toLocaleString("es-CO")}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                        reception.status
                      )}`}
                    >
                      {reception.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <button className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}