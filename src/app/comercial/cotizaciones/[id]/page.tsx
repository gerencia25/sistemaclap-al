"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ProductItem = {
  id: string;
  product_name: string;
  color: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

type QuotationDetail = {
  id: string;
  quote_number: string;
  quote_date: string | null;
  total: number;
  status: string;
  seller_name: string | null;
  payment_terms: string | null;
  delivery_time: string | null;
  validity: string | null;
  observations: string | null;
  customers:
    | {
        name: string;
        nit: string;
        contact: string;
        email: string;
        phone: string;
        city: string;
        address: string;
      }[]
    | null;
};

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const quotationId = Array.isArray(params.id)
  ? params.id[0]
  : params.id;
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const customer = useMemo(() => {
    return quotation?.customers?.[0] ?? null;
  }, [quotation]);

  const fetchQuotation = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("quotations")
      .select(
        `
        *,
        customers (
          name,
          nit,
          contact,
          email,
          phone,
          city,
          address
        )
      `
      )
      .eq("id", quotationId)
      .single();

    if (error) {
      alert(`Error cargando cotización: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setQuotation(data as QuotationDetail);

    const { data: itemsData, error: itemsError } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotationId);

    if (itemsError) {
      alert(`Error cargando productos: ${itemsError.message}`);
      setIsLoading(false);
      return;
    }

    setItems((itemsData ?? []) as ProductItem[]);
    setIsLoading(false);
  };

useEffect(() => {
  fetchQuotation();
}, []);

  const formatCurrency = (value: number) => {
    return `$${Number(value).toLocaleString("es-CO")}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("es-CO");
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-gray-500">
        Cargando cotización...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-gray-700">
          No se encontró la cotización.
        </p>

        <Link
          href="/comercial/cotizaciones"
          className="mt-4 inline-flex rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white"
        >
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Comercial · Cotizaciones
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            {quotation.quote_number}
          </h1>

          <p className="mt-3 text-base text-gray-600">
            Consulta completa de la cotización comercial generada.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/comercial/cotizaciones"
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Volver
          </Link>

          <button className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
            Abrir Sheet
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Cliente</p>

          <h2 className="mt-2 text-xl font-bold text-gray-900">
            {customer?.name ?? "—"}
          </h2>

          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">NIT:</span>{" "}
              {customer?.nit ?? "—"}
            </p>

            <p>
              <span className="font-medium">Contacto:</span>{" "}
              {customer?.contact ?? "—"}
            </p>

            <p>
              <span className="font-medium">Email:</span>{" "}
              {customer?.email ?? "—"}
            </p>

            <p>
              <span className="font-medium">Teléfono:</span>{" "}
              {customer?.phone ?? "—"}
            </p>

            <p>
              <span className="font-medium">Ciudad:</span>{" "}
              {customer?.city ?? "—"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Información comercial</p>

          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p>
              <span className="font-medium">Fecha:</span>{" "}
              {formatDate(quotation.quote_date)}
            </p>

            <p>
              <span className="font-medium">Vendedor:</span>{" "}
              {quotation.seller_name || "—"}
            </p>

            <p>
              <span className="font-medium">Forma de pago:</span>{" "}
              {quotation.payment_terms || "—"}
            </p>

            <p>
              <span className="font-medium">Entrega:</span>{" "}
              {quotation.delivery_time || "—"}
            </p>

            <p>
              <span className="font-medium">Vigencia:</span>{" "}
              {quotation.validity || "—"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Resumen</p>

          <div className="mt-5">
            <p className="text-sm text-gray-500">Estado</p>

            <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              {quotation.status}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500">Total cotización</p>

            <p className="mt-2 text-3xl font-bold text-[#07076b]">
              {formatCurrency(quotation.total)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Productos cotizados
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Precio unitario</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-gray-900">
                    {item.product_name}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {item.color || "—"}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {item.quantity}
                  </td>

                  <td className="px-4 py-4 font-medium text-gray-900">
                    {formatCurrency(item.unit_price)}
                  </td>

                  <td className="px-4 py-4 font-semibold text-[#07076b]">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Esta cotización no tiene productos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Observaciones
        </h2>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-700">
          {quotation.observations || "Sin observaciones registradas."}
        </div>
      </section>
    </div>
  );
}