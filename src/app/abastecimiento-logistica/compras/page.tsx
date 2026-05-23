"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PurchaseOrder = {
  id: string;
  purchase_order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  total: number;

  suppliers:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

export default function ComprasPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
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
      .from("purchase_orders")
      .select(
        `
        id,
        purchase_order_number,
        order_date,
        expected_delivery_date,
        status,
        total,
        suppliers:supplier_id (
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando órdenes de compra: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setOrders((data ?? []) as PurchaseOrder[]);
    setIsLoading(false);
  }

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return orders;

    return orders.filter((order) => {
      const supplierName = Array.isArray(order.suppliers)
        ? order.suppliers[0]?.name ?? ""
        : order.suppliers?.name ?? "";

      return [
        order.purchase_order_number,
        supplierName,
        order.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [orders, search]);

  function getStatusClass(status: string) {
    if (status === "Abierta") {
      return "bg-amber-50 text-amber-700";
    }

    if (status === "Parcial") {
      return "bg-blue-50 text-blue-700";
    }

    if (status === "Recibida") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (status === "Cancelada") {
      return "bg-red-50 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Abastecimiento · Compras
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Órdenes de Compra
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Gestiona compras de materias primas, insumos, repuestos y materiales
            para producción e inventarios.
          </p>
        </div>

        <Link
          href="/abastecimiento/compras/nueva"
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nueva orden de compra
        </Link>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Órdenes registradas
          </h2>

          <input
            type="text"
            placeholder="Buscar por OC, proveedor o estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} md:max-w-md`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">OC</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Entrega esperada</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando órdenes de compra...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredOrders.map((order) => {
                  const supplierName = Array.isArray(order.suppliers)
                    ? order.suppliers[0]?.name ?? "—"
                    : order.suppliers?.name ?? "—";

                  return (
                    <tr
                      key={order.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-bold text-[#07076b]">
                        {order.purchase_order_number}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {order.order_date}
                      </td>

                      <td className="px-4 py-4 font-medium text-gray-900">
                        {supplierName}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {order.expected_delivery_date || "—"}
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
                        <button className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20">
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron órdenes de compra.
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