"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { setDynamicBreadcrumbLabel } from "@/lib/dynamicBreadcrumb";

type Product = {
  id: string;
  final_code: string | null;
  reference: string | null;
  name: string;
  unit: string | null;
  category: string | null;
  classification_code: string | null;
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
};

type InternalLot = {
  id: string;
  lot_number: string;
  expiration_date: string | null;
  origin_type: string | null;
  origin_reference: string | null;
  status: string | null;
};

type ReceiptItem = {
  id: string;
  item_id: string;
  warehouse_id: string;
  supplier_lot_number: string | null;
  internal_lot_id: string | null;
  quantity_received: number;
  quantity_ordered: number;
  quantity_difference: number;
  difference_reason: string | null;
  unit_price: number;
  total: number;

  product: Product | null;
  warehouse: Warehouse | null;
  internal_lot: InternalLot | null;
};

type Receipt = {
  id: string;
  receipt_number: string;
  purchase_order_number: string | null;
  supplier_name: string;
  receipt_date: string;
  supplier_invoice_number: string | null;
  supplier_remission_number: string | null;
  payment_due_date: string | null;
  payment_terms_days: number | null;
  observations: string | null;
  total: number;
  receipt_mode: string;
  authorization_reference: string | null;
  received_by: string | null;
  created_at: string | null;
  items: ReceiptItem[];
};

function formatDate(
  value: string | null,
) {
  if (!value) return "—";

  const date = value.slice(
    0,
    10,
  );

  const [
    year,
    month,
    day,
  ] = date.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

export default function ReceptionDetailPage() {
  const params = useParams();
  const { session } = useAuth();

  const id =
    typeof params.id === "string"
      ? params.id
      : "";

  const [
    receipt,
    setReceipt,
  ] = useState<Receipt | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadReceipt =
    useCallback(async () => {
      if (
        !session?.access_token ||
        !id
      ) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response =
          await fetch(
            `/api/abastecimiento-logistica/inventarios/recepciones/detalle?id=${encodeURIComponent(
              id,
            )}`,
            {
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
              cache: "no-store",
            },
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "No se pudo consultar la recepción.",
          );
        }

        setReceipt(
          payload.data,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo consultar la recepción.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      id,
      session?.access_token,
    ]);

  useEffect(() => {
    void loadReceipt();
  }, [loadReceipt]);

  useEffect(() => {
    if (
      !id ||
      !receipt?.receipt_number
    ) {
      return;
    }

    setDynamicBreadcrumbLabel(
      `/abastecimiento-logistica/recepciones/${id}`,
      receipt.receipt_number,
    );
  }, [
    id,
    receipt?.receipt_number,
  ]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-gray-500">
        Cargando recepción...
      </div>
    );
  }

  if (
    errorMessage ||
    !receipt
  ) {
    return (
      <div className="space-y-6">
        <Link
          href="/abastecimiento-logistica/recepciones"
          className="text-sm font-semibold text-[#07076b]"
        >
          ← Volver a recepciones
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage ||
            "No se encontró la recepción."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4">
          <Link
            href="/abastecimiento-logistica/recepciones"
            className="text-sm font-semibold text-[#07076b] hover:underline"
          >
            ← Volver a recepciones
          </Link>
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · Recepciones
        </p>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
              {receipt.receipt_number}
            </h1>

            <p className="mt-2 text-base text-gray-600">
              Detalle y trazabilidad de la recepción de inventario.
            </p>
          </div>

          <span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Recibido
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Tipo de entrada"
          value={
            receipt.receipt_mode
          }
        />

        <InfoCard
          label="Fecha recepción"
          value={formatDate(
            receipt.receipt_date,
          )}
        />

        <InfoCard
          label="Proveedor"
          value={
            receipt.supplier_name
          }
        />

        <InfoCard
          label="Orden de compra"
          value={
            receipt.purchase_order_number ||
            "Entrada directa"
          }
        />

        <InfoCard
          label="Factura proveedor"
          value={
            receipt.supplier_invoice_number ||
            "—"
          }
        />

        <InfoCard
          label="Remisión proveedor"
          value={
            receipt.supplier_remission_number ||
            "—"
          }
        />

        <InfoCard
          label="Autorización / referencia"
          value={
            receipt.authorization_reference ||
            "—"
          }
        />

        <InfoCard
          label="Recibido por"
          value={
            receipt.received_by ||
            "—"
          }
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Productos recibidos
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Trazabilidad por producto, almacén y lote interno CLAP.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1350px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  Código
                </th>

                <th className="px-4 py-3">
                  Producto
                </th>

                <th className="px-4 py-3">
                  Almacén
                </th>

                <th className="px-4 py-3">
                  Cantidad
                </th>

                <th className="px-4 py-3">
                  Lote proveedor
                </th>

                <th className="px-4 py-3">
                  Lote interno CLAP
                </th>

                <th className="px-4 py-3">
                  Vencimiento
                </th>

                <th className="px-4 py-3 text-right">
                  Costo unit.
                </th>

                <th className="px-4 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {receipt.items.map(
                (item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      {item.product
                        ?.final_code ||
                        item.product
                          ?.reference ||
                        "—"}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {item.product
                          ?.name ||
                          "Producto"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.product
                          ?.category ||
                          ""}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {item.warehouse
                        ? `${item.warehouse.code} · ${item.warehouse.name}`
                        : "—"}
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-900">
                      {formatNumber(
                        Number(
                          item.quantity_received ||
                            0,
                        ),
                      )}{" "}
                      {item.product
                        ?.unit ||
                        ""}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {item.supplier_lot_number ||
                        "—"}
                    </td>

                    <td className="px-4 py-4">
                      {item.internal_lot
                        ?.lot_number ? (
                        <span className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-bold text-[#07076b]">
                          {
                            item.internal_lot
                              .lot_number
                          }
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {formatDate(
                        item.internal_lot
                          ?.expiration_date ||
                          null,
                      )}
                    </td>

                    <td className="px-4 py-4 text-right text-gray-700">
                      {formatCurrency(
                        Number(
                          item.unit_price ||
                            0,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(
                        Number(
                          item.total ||
                            0,
                        ),
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Observaciones
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {receipt.observations ||
              "Sin observaciones."}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total recepción
          </p>

          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {formatCurrency(
              Number(
                receipt.total ||
                  0,
              ),
            )}
          </p>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}
