"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  id: string;
  product_name: string;
  production_process: string;
  quantity: number;
  unit_price: number;
  finishes: string[];
  item_observations: string | null;
};

type OrderDetail = {
  id: string;
  order_number: string;
  entry_date: string;
  sales_advisor: string;
  shipping_address: string;
  shipping_city: string;
  customer_order_number: string;
  requested_delivery_date: string;
  commercial_observations: string | null;
  support_file_url: string | null;
  total: number;
  status: string;

  customers:
  | {
      name: string;
      email: string | null;
      phone: string | null;
    }
  | {
      name: string;
      email: string | null;
      phone: string | null;
    }[]
  | null;
};

export default function PedidoDetallePage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, []);

  async function fetchOrder() {
    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        customers:customer_id (
  name,
  email,
  phone
)
      `
      )
      .eq("id", orderId)
      .single();

    if (orderError) {
      alert(orderError.message);
      setLoading(false);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)

    if (itemsError) {
      alert(itemsError.message);
      setLoading(false);
      return;
    }

    setOrder(orderData as OrderDetail);
    setItems((itemsData ?? []) as OrderItem[]);

    setLoading(false);
  }

  const customer = Array.isArray(order?.customers)
    ? order?.customers[0]
    : order?.customers;

  if (loading) {
    return (
      <div className="p-10 text-sm text-gray-500">
        Cargando pedido...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 text-sm text-red-500">
        Pedido no encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Comercial · Pedidos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            {order.order_number}
          </h1>

          <p className="mt-3 text-base text-gray-600">
            Detalle completo del pedido comercial registrado.
          </p>
        </div>

        <div className="flex gap-3">
          {order.support_file_url && (
            <a
              href={order.support_file_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[#07076b] px-5 py-3 text-sm font-semibold text-[#07076b] transition hover:bg-[#07076b]/5"
            >
              Ver PDF soporte
            </a>
          )}

          <Link
            href="/comercial/pedidos"
            className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Volver
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Estado
          </p>

          <div className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
            {order.status}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fecha ingreso
          </p>

          <p className="mt-3 text-lg font-semibold text-gray-900">
            {order.entry_date}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fecha requerida
          </p>

          <p className="mt-3 text-lg font-semibold text-gray-900">
            {order.requested_delivery_date}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Total pedido
          </p>

          <p className="mt-3 text-3xl font-bold text-[#07076b]">
            ${Number(order.total || 0).toLocaleString("es-CO")}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Información comercial
          </h2>

          <div className="space-y-4 text-sm">
            <InfoRow
              label="Cliente"
              value={customer?.name || "—"}
            />

            <InfoRow
              label="Correo"
              value={customer?.email || "—"}
            />

            <InfoRow
              label="Teléfono"
              value={customer?.phone || "—"}
            />

            <InfoRow
              label="Asesor"
              value={order.sales_advisor || "—"}
            />

            <InfoRow
              label="OC / Cotización"
              value={order.customer_order_number || "—"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Información logística
          </h2>

          <div className="space-y-4 text-sm">
            <InfoRow
              label="Ciudad"
              value={order.shipping_city || "—"}
            />

            <InfoRow
              label="Dirección"
              value={order.shipping_address || "—"}
            />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Observaciones comerciales
              </p>

              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                {order.commercial_observations ||
                  "Sin observaciones comerciales."}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Productos del pedido
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Productos comerciales registrados para producción y despacho.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Proceso</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Acabados</th>
                <th className="px-4 py-3">Observaciones</th>
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
                    {item.production_process}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {item.quantity}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    $
                    {Number(item.unit_price || 0).toLocaleString(
                      "es-CO"
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {(item.finishes || []).map((finish) => (
                        <span
                          key={finish}
                          className="rounded-full bg-[#07076b]/10 px-3 py-1 text-xs font-medium text-[#07076b]"
                        >
                          {finish}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {item.item_observations || "—"}
                  </td>

                  <td className="px-4 py-4 font-semibold text-gray-900">
                    $
                    {(
                      Number(item.quantity || 0) *
                      Number(item.unit_price || 0)
                    ).toLocaleString("es-CO")}
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Este pedido no tiene productos registrados.
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="text-sm font-medium text-gray-800">
        {value}
      </p>
    </div>
  );
}