"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  setDynamicBreadcrumbLabel,
} from "@/lib/dynamicBreadcrumb";

type SiigoPreparation = {
  ready: boolean;
  issues: string[];
  sync_tasks: string[];

  supplier: {
    id: string;
    name: string;
    identification_number: string;
    siigo_third_party_id: string | null;
    siigo_sync_status: string | null;
    ready: boolean;
    synced: boolean;
  } | null;

  items: Array<{
    id: string;
    item_id: string;
    ready: boolean;
    synced: boolean;
    issues: string[];
    sync_tasks: string[];

    product: {
      id: string;
      code: string | null;
      name: string;
      unit: string | null;
      siigo_product_id: string | null;
      siigo_sync_status: string | null;
    } | null;
  }>;
};

type PurchaseOrder = {
  id: string;
  purchase_order_number: string;
  clap_request_number: string | null;
  siigo_order_number: string | null;
  siigo_document_id: string | null;
  siigo_sync_status:
    | "Pendiente"
    | "Sincronizada"
    | "Error"
    | "Importada"
    | "No aplica";
  siigo_sync_error: string | null;
  siigo_last_sync_at: string | null;
  source_system: "CLAP" | "SIIGO";
  supplier_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  observations: string | null;
  total: number;
  status: string;
  created_at: string;
};

type Supplier = {
  id: string;
  business_name: string | null;
  commercial_name: string | null;
  first_name: string | null;
  last_name: string | null;
  identification_number: string;
  email: string | null;
  phone: string | null;
  supplier_knowledge_status:
    | "Pendiente"
    | "Completo"
    | "No aplica";
  status: string;
};

type Product = {
  id: string;
  final_code: string | null;
  reference: string | null;
  name: string;
  unit: string | null;
  item_type: string | null;
};

type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total: number;
  products:
    | Product
    | Product[]
    | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0));
}

function formatDate(
  value: string | null,
) {
  if (!value) return "—";

  const [year, month, day] =
    value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function getProduct(
  value:
    | Product
    | Product[]
    | null,
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default function PurchaseOrderDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const router = useRouter();
  const {
    session,
    hasPermission,
  } = useAuth();

  const [
    siigoPreparation,
    setSiigoPreparation,
  ] = useState<SiigoPreparation | null>(null);

  const [
    loadingSiigoPreparation,
    setLoadingSiigoPreparation,
  ] = useState(false);

  const [
    siigoPreparationError,
    setSiigoPreparationError,
  ] = useState("");

  const [
    emittingSiigo,
    setEmittingSiigo,
  ] = useState(false);

  const [
    siigoEmitMessage,
    setSiigoEmitMessage,
  ] = useState("");

  async function loadSiigoPreparation(
    purchaseOrderId: string,
  ) {
    if (
      !session?.access_token ||
      !hasPermission(
        "ABASTECIMIENTO_COMPRAS_MANAGE",
      )
    ) {
      return;
    }

    setLoadingSiigoPreparation(true);
    setSiigoPreparationError("");

    try {
      const response =
        await fetch(
          `/api/abastecimiento-logistica/compras/siigo/preparacion?id=${encodeURIComponent(
            purchaseOrderId,
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
          payload.error ||
            "No se pudo validar la preparación SIIGO.",
        );
      }

      setSiigoPreparation(
        payload as SiigoPreparation,
      );
    } catch (error) {
      console.error(
        "Preparación SIIGO:",
        error,
      );

      setSiigoPreparation(null);

      setSiigoPreparationError(
        error instanceof Error
          ? error.message
          : "No se pudo validar la preparación SIIGO.",
      );
    } finally {
      setLoadingSiigoPreparation(false);
    }
  }

  const [order, setOrder] =
    useState<PurchaseOrder | null>(
      null,
    );

  const [supplier, setSupplier] =
    useState<Supplier | null>(
      null,
    );

  const [items, setItems] =
    useState<PurchaseOrderItem[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    if (
      !session?.access_token ||
      !params.id
    ) {
      return;
    }

    loadDetail();
  }, [
    session?.access_token,
    params.id,
  ]);

  useEffect(() => {
    if (
      !order?.id ||
      !session?.access_token ||
      !hasPermission(
        "ABASTECIMIENTO_COMPRAS_MANAGE",
      )
    ) {
      return;
    }

    void loadSiigoPreparation(
      order.id,
    );
  }, [
    order?.id,
    session?.access_token,
    hasPermission,
  ]);

  async function handleEmitSiigo() {
    if (
      !order?.id ||
      !session?.access_token ||
      !siigoPreparation?.ready
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Emitir ${order.clap_request_number || order.purchase_order_number} en SIIGO?`,
      );

    if (!confirmed) {
      return;
    }

    setEmittingSiigo(true);
    setSiigoEmitMessage("");

    try {
      const response =
        await fetch(
          "/api/abastecimiento-logistica/compras/siigo/emitir",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                purchase_order_id:
                  order.id,
              }),
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        setSiigoEmitMessage(
          payload.error ||
            "No se pudo emitir la orden en SIIGO.",
        );

        return;
      }

      setSiigoEmitMessage(
        `OC SIIGO ${payload.data.siigo_order_number} creada correctamente.`,
      );

      await loadDetail();
    } catch (error) {
      setSiigoEmitMessage(
        error instanceof Error
          ? error.message
          : "No se pudo emitir la orden en SIIGO.",
      );
    } finally {
      setEmittingSiigo(false);
    }
  }

  async function loadDetail() {
    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await fetch(
          `/api/abastecimiento-logistica/compras/detalle?id=${encodeURIComponent(
            params.id,
          )}`,
          {
            headers: {
              Authorization:
                `Bearer ${session?.access_token ?? ""}`,
            },
            cache: "no-store",
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo cargar la orden.",
        );
      }

      setOrder(result.order);
      setSupplier(
        result.supplier,
      );
      setItems(
        result.items ?? [],
      );

      if (
        result.order?.purchase_order_number
      ) {
        setDynamicBreadcrumbLabel(
          `/abastecimiento-logistica/compras/${params.id}`,
          result.order.clap_request_number ||
            result.order.purchase_order_number,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la orden.",
      );
    } finally {
      setLoading(false);
    }
  }

  const supplierName =
    useMemo(() => {
      if (!supplier) {
        return "—";
      }

      const personName = [
        supplier.first_name,
        supplier.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      return (
        supplier.business_name ||
        supplier.commercial_name ||
        personName ||
        supplier.identification_number
      );
    }, [supplier]);

  if (loading) {
    return (
      <div className="p-8 text-sm text-gray-500">
        Cargando orden de compra...
      </div>
    );
  }

  if (
    errorMessage ||
    !order
  ) {
    return (
      <div className="space-y-5 p-8">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage ||
            "No se encontró la orden."}
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/abastecimiento-logistica/compras",
            )
          }
          className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700"
        >
          Volver a Compras
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Abastecimiento · Compras
        </p>

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
              {
                order.clap_request_number ||
                order.purchase_order_number
              }
            </h1>

            <p className="mt-3 text-base text-gray-600">
              Preparación y seguimiento de la compra antes de su ejecución contable en SIIGO.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/abastecimiento-logistica/compras",
              )
            }
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Volver
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Proveedor
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {supplierName}
            </p>

            {supplier && (
              <p className="mt-1 text-sm text-gray-500">
                {
                  supplier.identification_number
                }
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Fecha orden
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {formatDate(
                order.order_date,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Entrega esperada
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {formatDate(
                order.expected_delivery_date,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Estado
            </p>

            <span className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              {order.status}
            </span>
          </div>
        </div>

        {supplier?.supplier_knowledge_status ===
          "Pendiente" && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              ⚠ Conocimiento de proveedor pendiente.
            </p>

            <p className="mt-1 text-sm text-amber-700">
              La orden puede continuar, pero el proveedor mantiene documentación pendiente.
            </p>
          </div>
        )}

        {order.observations && (
          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Observaciones
            </p>

            <p className="mt-2 text-sm text-gray-700">
              {
                order.observations
              }
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
              Integración contable
            </p>

            <h2 className="mt-2 text-xl font-bold text-[#07076b]">
              SIIGO
            </h2>
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              order.siigo_sync_status === "Sincronizada" ||
              order.siigo_sync_status === "Importada"
                ? "bg-emerald-50 text-emerald-700"
                : order.siigo_sync_status === "Error"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {order.siigo_sync_status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Solicitud CLAP
            </p>

            <p className="mt-2 font-bold text-[#07076b]">
              {order.clap_request_number || "—"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              OC oficial SIIGO
            </p>

            <p className="mt-2 font-bold text-gray-900">
              {order.siigo_order_number || "Pendiente"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Origen
            </p>

            <p className="mt-2 font-bold text-gray-900">
              {order.source_system}
            </p>
          </div>
        </div>

        {!order.siigo_order_number &&
          hasPermission(
            "ABASTECIMIENTO_COMPRAS_MANAGE",
          ) && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Preparación para emitir en SIIGO
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    CLAP valida automáticamente proveedor y productos antes de crear la OC.
                  </p>
                </div>

                {loadingSiigoPreparation ? (
                  <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                    Validando...
                  </span>
                ) : siigoPreparationError ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Error de validación
                  </span>
                ) : siigoPreparation?.ready ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Lista para emitir
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Requiere sincronización
                  </span>
                )}
              </div>

              {siigoPreparationError && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">
                    No se pudo validar la preparación con SIIGO
                  </p>

                  <p className="mt-1 text-sm text-red-600">
                    {siigoPreparationError}
                  </p>
                </div>
              )}

              {siigoPreparation && (
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Proveedor
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {siigoPreparation.supplier?.name || "Sin proveedor"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        siigoPreparation.supplier?.ready
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {siigoPreparation.supplier?.synced
                        ? "Sincronizado"
                        : siigoPreparation.supplier?.ready
                          ? "Se sincronizará al emitir"
                          : "Requiere corrección"}
                    </span>
                  </div>

                  {siigoPreparation.items.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {item.product?.code || "Producto"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.product?.name || "Producto no disponible"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            item.ready
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {item.synced
                            ? "Sincronizado"
                            : item.ready
                              ? "Se sincronizará al emitir"
                              : "Requiere corrección"}
                        </span>
                      </div>
                    ),
                  )}

                  {siigoPreparation.ready &&
                    siigoPreparation.sync_tasks.length > 0 && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-800">
                          CLAP realizará automáticamente al emitir:
                        </p>

                        <ul className="mt-2 space-y-1 text-sm text-blue-700">
                          {siigoPreparation.sync_tasks.map(
                            (task, index) => (
                              <li
                                key={`${task}-${index}`}
                              >
                                • {task}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                  {!siigoPreparation.ready &&
                    siigoPreparation.issues.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-800">
                          Antes de emitir:
                        </p>

                        <ul className="mt-2 space-y-1 text-sm text-amber-700">
                          {siigoPreparation.issues.map(
                            (issue, index) => (
                              <li
                                key={`${issue}-${index}`}
                              >
                                • {issue}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {siigoEmitMessage && (
                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    {siigoEmitMessage}
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleEmitSiigo}
                  disabled={
                    loadingSiigoPreparation ||
                    emittingSiigo ||
                    !siigoPreparation?.ready
                  }
                  title={
                    siigoPreparation?.ready
                      ? "Crear la orden oficial en SIIGO."
                      : "Primero deben sincronizarse el proveedor y los productos con SIIGO."
                  }
                  className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    siigoPreparation?.ready
                      ? "bg-[#07076b] text-white hover:opacity-95"
                      : "cursor-not-allowed bg-gray-200 text-gray-500"
                  }`}
                >
                  {emittingSiigo
                    ? "Emitiendo..."
                    : "Emitir en SIIGO"}
                </button>
              </div>
            </div>
          )}

        {!order.siigo_order_number && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              ⚠ Pendiente de emitir la orden oficial en SIIGO.
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-700">
              Esta solicitud existe en CLAP para preparar y controlar la compra,
              pero todavía no representa una orden de compra contable oficial.
            </p>
          </div>
        )}

        {order.siigo_sync_error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Error de sincronización
            </p>

            <p className="mt-1 text-sm text-red-600">
              {order.siigo_sync_error}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Ítems de la solicitud
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Cantidades solicitadas y seguimiento de recepción una vez exista la OC oficial.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  Producto
                </th>

                <th className="px-4 py-3 text-right">
                  Ordenado
                </th>

                <th className="px-4 py-3 text-right">
                  Recibido
                </th>

                <th className="px-4 py-3 text-right">
                  Pendiente
                </th>

                <th className="px-4 py-3 text-right">
                  Precio unit.
                </th>

                <th className="px-4 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {items.map(
                (item) => {
                  const product =
                    getProduct(
                      item.products,
                    );

                  const unit =
                    product?.unit ||
                    "—";

                  const pending =
                    Math.max(
                      Number(
                        item.quantity_ordered ||
                          0,
                      ) -
                        Number(
                          item.quantity_received ||
                            0,
                        ),
                      0,
                    );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#07076b]">
                          {product?.final_code ||
                            product?.reference ||
                            "Sin código"}
                        </p>

                        <p className="mt-1 text-gray-700">
                          {product?.name ||
                            "Producto"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {
                          item.quantity_ordered
                        }{" "}
                        {unit}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {
                          item.quantity_received
                        }{" "}
                        {unit}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-amber-700">
                        {pending}{" "}
                        {unit}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatCurrency(
                          item.unit_price,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(
                          item.total,
                        )}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="min-w-64 rounded-xl bg-[#07076b]/5 p-5 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Total orden
            </p>

            <p className="mt-2 text-3xl font-bold text-[#07076b]">
              {formatCurrency(
                order.total,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-end gap-4">
        {order.siigo_order_number ? (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/abastecimiento-logistica/recepciones/nueva?purchaseOrderId=${encodeURIComponent(
                  order.id,
                )}`,
              )
            }
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Registrar recepción
          </button>
        ) : (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
              Para recibir desde OC primero debe existir una OC oficial de SIIGO.
            </div>

            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-500"
            >
              Registrar recepción
            </button>
          </>
        )}
      </section>
    </div>
  );
}
