"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Quotation = {
  id: string;
  quote_number: string;
  quote_date: string | null;
  total: number;
  status: string;
  seller_name: string | null;
customers:
  | {
      name: string;
      nit: string;
    }[]
  | null;
};

export default function CotizacionesPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  const fetchQuotations = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("quotations")
      .select(
        `
        id,
        quote_number,
        quote_date,
        total,
        status,
        seller_name,
        customers (
          name,
          nit
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando cotizaciones: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setQuotations((data ?? []) as Quotation[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const filteredQuotations = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return quotations;

    return quotations.filter((quotation) =>
      [
        quotation.quote_number,
        quotation.customers?.[0]?.name ?? "",
        quotation.customers?.[0]?.nit ?? "",
        quotation.seller_name ?? "",
        quotation.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [quotations, search]);

  const formatDate = (date: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Comercial · Cotizaciones
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Cotizaciones
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Consulta el historial de cotizaciones generadas, clientes,
            vendedores, estados y valores totales.
          </p>
        </div>

        <Link
          href="/comercial/cotizaciones/nueva"
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nueva cotización
        </Link>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Historial comercial
          </h2>

          <input
            type="text"
            placeholder="Buscar por consecutivo, cliente o vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClassName} md:max-w-md`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Consecutivo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">NIT</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando cotizaciones...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredQuotations.map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      {quotation.quote_number}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {quotation.customers?.[0]?.name ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {quotation.customers?.[0]?.nit ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(quotation.quote_date)}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {quotation.seller_name || "—"}
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-900">
                      ${Number(quotation.total).toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        {quotation.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <Link
  href={`/comercial/cotizaciones/${quotation.id}`}
  className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
>
  Ver detalle
</Link>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredQuotations.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron cotizaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}