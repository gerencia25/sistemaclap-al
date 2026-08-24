"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Quote = {
  id: string;
  quote_number: string;
  version_number: number;
  business_line_snapshot: string;
  customer_name_snapshot: string;
  seller_name_snapshot: string;
  status: string;
  issue_date: string | null;
  valid_until: string | null;
  currency: string;
  total: number;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700",
  LISTA_PARA_EMITIR: "bg-amber-50 text-amber-700",
  EMITIDA: "bg-blue-50 text-blue-700",
  ACEPTADA: "bg-emerald-50 text-emerald-700",
  RECHAZADA: "bg-red-50 text-red-700",
  VENCIDA: "bg-orange-50 text-orange-700",
  CONVERTIDA_PEDIDO: "bg-indigo-50 text-indigo-700",
  ANULADA: "bg-slate-100 text-slate-600",
};

const statusLabels: Record<string, string> = {
  BORRADOR: "Borrador",
  LISTA_PARA_EMITIR: "Lista para emitir",
  EMITIDA: "Emitida",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
  CONVERTIDA_PEDIDO: "Convertida a pedido",
  ANULADA: "Anulada",
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency || "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function CotizacionesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("commercial_quotes")
      .select(
        `
          id,
          quote_number,
          version_number,
          business_line_snapshot,
          customer_name_snapshot,
          seller_name_snapshot,
          status,
          issue_date,
          valid_until,
          currency,
          total,
          created_at
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setQuotes([]);
      setIsLoading(false);
      return;
    }

    setQuotes((data ?? []) as Quote[]);
    setIsLoading(false);
  }

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return quotes.filter((quote) => {
      const matchesStatus =
        statusFilter === "TODOS" || quote.status === statusFilter;

      const matchesSearch =
        !term ||
        [
          quote.quote_number,
          quote.customer_name_snapshot,
          quote.business_line_snapshot,
          quote.seller_name_snapshot,
          quote.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [quotes, search, statusFilter]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Dirección Comercial
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Cotizaciones
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Crea, consulta y realiza seguimiento a las propuestas comerciales
            enviadas a clientes y prospectos.
          </p>
        </div>

        <Link
          href="/comercial/cotizaciones/nueva"
          className="inline-flex items-center justify-center rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          + Nueva cotización
        </Link>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por consecutivo, cliente, vendedor o línea de negocio..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="LISTA_PARA_EMITIR">Lista para emitir</option>
            <option value="EMITIDA">Emitida</option>
            <option value="ACEPTADA">Aceptada</option>
            <option value="RECHAZADA">Rechazada</option>
            <option value="VENCIDA">Vencida</option>
            <option value="CONVERTIDA_PEDIDO">Convertida a pedido</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Bandeja de cotizaciones
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {filteredQuotes.length} registro
                {filteredQuotes.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Cargando cotizaciones...
          </div>
        ) : errorMessage ? (
          <div className="m-5 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              No se pudieron cargar las cotizaciones.
            </p>
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#07076b]/10 text-sm font-bold text-[#07076b]">
              COT
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Aún no hay cotizaciones
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Cuando se creen cotizaciones en CLAP aparecerán aquí con su
              cliente, versión, estado, línea de negocio y valor.
            </p>

            <Link
              href="/comercial/cotizaciones/nueva"
              className="mt-5 inline-flex rounded-xl bg-[#07076b] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Crear primera cotización
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Cotización</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Línea de negocio</th>
                  <th className="px-5 py-3">Vendedor</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Vigencia</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#07076b]">
                        {quote.quote_number}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Versión {quote.version_number}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium text-gray-900">
                      {quote.customer_name_snapshot}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {quote.business_line_snapshot}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {quote.seller_name_snapshot}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(quote.issue_date)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(quote.valid_until)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[quote.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[quote.status] ?? quote.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(quote.total, quote.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}