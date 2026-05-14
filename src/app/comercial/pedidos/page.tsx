"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  order_number: string;
  entry_date: string | null;
  sales_advisor: string;
  shipping_city: string;
  customer_order_number: string;
  requested_delivery_date: string | null;
  status: string;
  total: number;
  support_file_url: string | null;
  customers:
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        entry_date,
        sales_advisor,
        shipping_city,
        customer_order_number,
        requested_delivery_date,
        status,
        total,
        support_file_url,
        customers:customer_id (
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando pedidos: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setOrders((data ?? []) as Order[]);
    setIsLoading(false);
  }

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return orders;

    return orders.filter((order) =>
      [
        order.order_number,
        Array.isArray(order.customers)
  ? order.customers[0]?.name
  : order.customers?.name,
        order.sales_advisor,
        order.shipping_city,
        order.customer_order_number,
        order.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [orders, search]);

  function getStatusClass(status: string) {
    if (status === "Pendiente") return "bg-amber-50 text-amber-700";
    if (status === "En planeación") return "bg-indigo-50 text-indigo-700";
    if (status === "En producción") return "bg-blue-50 text-blue-700";
    if (status === "Despachado") return "bg-emerald-50 text-emerald-700";
    if (status === "Cancelado") return "bg-red-50 text-red-700";
    return "bg-gray-100 text-gray-700";
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Comercial · Pedidos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Seguimiento de Pedidos
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Consulta pedidos registrados, valida documentos soporte y revisa su
            estado comercial y operativo.
          </p>
        </div>

        <Link
          href="/comercial/pedidos/nuevo"
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nuevo pedido
        </Link>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Pedidos registrados
          </h2>

          <input
            type="text"
            placeholder="Buscar por pedido, cliente, asesor, OC o estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} md:max-w-md`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Fecha ingreso</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Asesor</th>
                <th className="px-4 py-3">OC / Cotización</th>
                <th className="px-4 py-3">Fecha requerida</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Soporte</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando pedidos...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredOrders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-[#07076b]">
                      {order.order_number}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {order.entry_date || "—"}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {Array.isArray(order.customers)
  ? order.customers[0]?.name
  : order.customers?.name || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {order.sales_advisor || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {order.customer_order_number || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {order.requested_delivery_date || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {order.shipping_city || "—"}
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-900">
                      ${Number(order.total || 0).toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {order.support_file_url ? (
                        <a
                          href={order.support_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-[#07076b] hover:underline"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/comercial/pedidos/${order.id}`}
                        className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron pedidos.
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