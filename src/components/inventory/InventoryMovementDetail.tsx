"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "@/components/auth/AuthProvider";

import {
  setDynamicBreadcrumbLabel,
} from "@/lib/dynamicBreadcrumb";

type Kind =
  | "salida"
  | "traslado"
  | "ajuste";

type Warehouse = {
  id: string;
  code: string;
  name: string;
};

type Product = {
  id: string;
  final_code: string | null;
  reference: string | null;
  name: string;
  unit: string | null;
  category: string | null;
};

type Lot = {
  id: string;
  lot_number: string;
};

type DetailItem = {
  id: string;

  quantity: number;
  quantity_adjustment: number;

  previous_balance: number;
  new_balance: number;

  product: Product | null;
  warehouse: Warehouse | null;
  lot: Lot | null;
};

type Header = {
  reason?: string | null;
  destination?: string | null;
  reference?: string | null;
  observations?: string | null;

  dispatched_by?: string | null;
  transferred_by?: string | null;
  adjusted_by?: string | null;

  source_warehouse?: Warehouse | null;
  destination_warehouse?: Warehouse | null;
};

type Payload = {
  kind: Kind;
  document_number: string;
  document_date: string;
  header: Header;
  items: DetailItem[];
};

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

export default function InventoryMovementDetail({
  kind,
  id,
}: {
  kind: Kind;
  id: string;
}) {
  const { session } =
    useAuth();

  const pathname =
    usePathname();

  const [
    data,
    setData,
  ] =
    useState<Payload | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  useEffect(() => {
    if (
      !session?.access_token ||
      !id
    ) {
      return;
    }

    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response =
          await fetch(
            `/api/abastecimiento-logistica/inventarios/movimientos/detalle?kind=${encodeURIComponent(
              kind,
            )}&id=${encodeURIComponent(
              id,
            )}`,
            {
              headers: {
                Authorization:
                  `Bearer ${session?.access_token}`,
              },
              cache:
                "no-store",
            },
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "No se pudo cargar el movimiento.",
          );
        }

        if (!cancelled) {
          setData(
            payload,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el movimiento.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [
    session?.access_token,
    id,
    kind,
  ]);


  useEffect(() => {
    if (
      !data?.document_number
    ) {
      return;
    }

    setDynamicBreadcrumbLabel(
      pathname,
      data.document_number,
    );
  }, [
    pathname,
    data?.document_number,
  ]);


  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        Cargando movimiento...
      </div>
    );
  }

  if (
    errorMessage ||
    !data
  ) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {errorMessage ||
          "No se encontró el movimiento."}
      </div>
    );
  }

  const title =
    kind === "salida"
      ? "Salida de almacén"
      : kind === "traslado"
        ? "Traslado entre almacenes"
        : "Ajuste de inventario";

  const backHref =
    kind === "salida"
      ? "/abastecimiento-logistica/almacenes-inventarios/salidas"
      : kind === "traslado"
        ? "/abastecimiento-logistica/almacenes-inventarios/traslados"
        : "/abastecimiento-logistica/almacenes-inventarios/ajustes";

  const responsible =
    data.header.dispatched_by ||
    data.header.transferred_by ||
    data.header.adjusted_by ||
    "—";

  return (
    <div className="space-y-8">
      <Link
        href={backHref}
        className="inline-flex text-sm font-semibold text-[#07076b] hover:underline"
      >
        ← Volver
      </Link>

      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Almacenes e Inventarios · {title}
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          {data.document_number}
        </h1>

        <p className="mt-2 text-gray-600">
          Detalle y trazabilidad del movimiento de inventario.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Tipo de movimiento"
          value={title}
        />

        <Card
          label="Fecha"
          value={
            data.document_date ||
            "—"
          }
        />

        {kind === "salida" && (
          <>
            <Card
              label="Motivo"
              value={
                data.header.reason ||
                "—"
              }
            />

            <Card
              label="Destino"
              value={
                data.header.destination ||
                "—"
              }
            />
          </>
        )}

        {kind === "traslado" && (
          <>
            <Card
              label="Almacén origen"
              value={
                data.header.source_warehouse
                  ? `${data.header.source_warehouse.code} · ${data.header.source_warehouse.name}`
                  : "—"
              }
            />

            <Card
              label="Almacén destino"
              value={
                data.header.destination_warehouse
                  ? `${data.header.destination_warehouse.code} · ${data.header.destination_warehouse.name}`
                  : "—"
              }
            />
          </>
        )}

        {kind === "ajuste" && (
          <Card
            label="Motivo"
            value={
              data.header.reason ||
              "—"
            }
          />
        )}

        <Card
          label="Referencia"
          value={
            data.header.reference ||
            "—"
          }
        />

        <Card
          label="Responsable"
          value={
            responsible
          }
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Productos
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Movimiento por producto, almacén y lote interno CLAP.
        </p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1050px] text-left text-sm">
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
                  Lote interno CLAP
                </th>

                <th className="px-4 py-3 text-right">
                  Cantidad
                </th>

                {kind === "ajuste" && (
                  <>
                    <th className="px-4 py-3 text-right">
                      Saldo anterior
                    </th>

                    <th className="px-4 py-3 text-right">
                      Saldo nuevo
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {data.items.map(
                (item) => {
                  const unit =
                    item.product?.unit ||
                    "";

                  const quantity =
                    kind === "ajuste"
                      ? item.quantity_adjustment
                      : item.quantity;

                  const warehouseText =
                    kind === "traslado"
                      ? `${data.header.source_warehouse?.code ?? "—"} → ${data.header.destination_warehouse?.code ?? "—"}`
                      : item.warehouse
                        ? `${item.warehouse.code} · ${item.warehouse.name}`
                        : "—";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-semibold text-[#07076b]">
                        {item.product?.final_code ||
                          item.product?.reference ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {item.product?.name ||
                            "—"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {item.product?.category ||
                            ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {warehouseText}
                      </td>

                      <td className="px-4 py-4 font-semibold text-[#07076b]">
                        {item.lot?.lot_number ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-gray-900">
                        {quantity > 0 &&
                        kind === "ajuste"
                          ? "+"
                          : ""}
                        {formatNumber(
                          quantity,
                        )}{" "}
                        {unit}
                      </td>

                      {kind === "ajuste" && (
                        <>
                          <td className="px-4 py-4 text-right text-gray-600">
                            {formatNumber(
                              item.previous_balance,
                            )}{" "}
                            {unit}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-gray-900">
                            {formatNumber(
                              item.new_balance,
                            )}{" "}
                            {unit}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Observaciones
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {data.header.observations ||
            "Sin observaciones."}
        </p>
      </section>
    </div>
  );
}

function Card({
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
