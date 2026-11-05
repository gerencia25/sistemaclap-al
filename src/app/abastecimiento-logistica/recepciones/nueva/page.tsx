"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type AuthorizationReferenceOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type Supplier = {
  id: string;
  name: string;
  nit: string | null;
  payment_terms_days: number | null;
  status: string;
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
};

type Item = {
  id: string;
  final_code: string | null;
  reference: string;
  name: string;
  item_type: string | null;
  unit: string | null;
  tracks_lots: boolean | null;
  tracks_serials: boolean | null;
  can_be_purchased: boolean | null;
  tracks_inventory: boolean | null;
  status: string;
};

type PurchaseOrder = {
  id: string;
  purchase_order_number: string;
  supplier_id: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  total: number;
  observations: string | null;
  created_at: string | null;
};

type PurchaseOrderProduct = {
  id: string;
  final_code: string | null;
  reference: string;
  name: string;
  item_type: string | null;
  unit: string | null;
  tracks_lots: boolean | null;
  tracks_serials: boolean | null;
  status: string;
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
    | PurchaseOrderProduct
    | PurchaseOrderProduct[]
    | null;
};

type ReceiptItem = {
  purchase_order_item_id: string | null;
  item_id: string;
  item_name: string;
  unit: string;
  tracks_lots: boolean;

  quantity_ordered: number;
  quantity_received: number;

  supplier_lot: string;
  internal_lot: string;
  expiration_date: string;

  warehouse_id: string;

  unit_cost: number;
  difference_reason: string;
};

const emptyReceiptItem: ReceiptItem = {
  purchase_order_item_id: null,
  item_id: "",
  item_name: "",
  unit: "",
  tracks_lots: false,
  quantity_ordered: 0,
  quantity_received: 0,
  supplier_lot: "",
  internal_lot: "",
  expiration_date: "",
  warehouse_id: "",
  unit_cost: 0,
  difference_reason: "",
};

function getLocalDate() {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000,
  );

  return localDate
    .toISOString()
    .slice(0, 10);
}

export default function NuevaRecepcionPage() {
  const {
    session,
    systemUser,
  } = useAuth();

  const [receiptMode, setReceiptMode] =
    useState<"Desde OC" | "Directa">(
      "Desde OC",
    );

  const [
    purchaseOrders,
    setPurchaseOrders,
  ] = useState<PurchaseOrder[]>([]);

  const [
    suppliers,
    setSuppliers,
  ] = useState<Supplier[]>([]);

  const [
    warehouses,
    setWarehouses,
  ] = useState<Warehouse[]>([]);

  const [
    items,
    setItems,
  ] = useState<Item[]>([]);

  const [
    authorizationReferences,
    setAuthorizationReferences,
  ] = useState<AuthorizationReferenceOption[]>([]);

  const [
    purchaseOrderId,
    setPurchaseOrderId,
  ] = useState("");

  const [
    supplierId,
    setSupplierId,
  ] = useState("");

  const [
    receiptDate,
    setReceiptDate,
  ] = useState(
    getLocalDate(),
  );

  const [
    supplierInvoice,
    setSupplierInvoice,
  ] = useState("");

  const [
    supplierRemission,
    setSupplierRemission,
  ] = useState("");

  const [
    authorizationReference,
    setAuthorizationReference,
  ] = useState("");

  const [
    observations,
    setObservations,
  ] = useState("");

  const [
    receiptItems,
    setReceiptItems,
  ] = useState<ReceiptItem[]>([
    {
      ...emptyReceiptItem,
    },
  ]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  const loadAuthorizationReferences =
    useCallback(async () => {
      if (!session?.access_token) {
        return;
      }

      try {
        const response = await fetch(
          "/api/abastecimiento-logistica/inventarios/recepciones/referencias",
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
              "No se pudieron cargar las referencias de entrada.",
          );
        }

        setAuthorizationReferences(
          payload.data ?? [],
        );
      } catch (error) {
        console.error(
          "Error cargando referencias de entrada:",
          error,
        );

        setAuthorizationReferences([]);
      }
    }, [session?.access_token]);

  useEffect(() => {
    void loadAuthorizationReferences();
  }, [loadAuthorizationReferences]);

  // =======================================================
  // CATÁLOGOS
  // =======================================================

  const loadInitialData =
    useCallback(
      async () => {
        if (!session?.access_token) {
          return;
        }

        setIsLoading(true);
        setErrorMessage("");

        try {
          const response =
            await fetch(
              "/api/abastecimiento-logistica/inventarios/recepciones",
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
                "No se pudo cargar la información de recepción.",
            );
          }

          setPurchaseOrders(
            payload.purchaseOrders ??
              [],
          );

          setSuppliers(
            payload.suppliers ??
              [],
          );

          setWarehouses(
            payload.warehouses ??
              [],
          );

          setItems(
            payload.products ??
              [],
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la información de recepción.",
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        session?.access_token,
      ],
    );

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // =======================================================
  // CAMBIO DE MODO
  // =======================================================

  useEffect(() => {
    if (
      receiptMode ===
      "Directa"
    ) {
      setPurchaseOrderId("");
      setSupplierId("");

      setReceiptItems([
        {
          ...emptyReceiptItem,
        },
      ]);
    }
  }, [receiptMode]);

  // =======================================================
  // CARGAR ÍTEMS DE OC
  // =======================================================

  const loadPurchaseOrderItems =
    useCallback(
      async (
        orderId: string,
      ) => {
        if (
          !session?.access_token ||
          !orderId
        ) {
          return;
        }

        const selectedOrder =
          purchaseOrders.find(
            (order) =>
              order.id ===
              orderId,
          );

        if (
          selectedOrder?.supplier_id
        ) {
          setSupplierId(
            selectedOrder.supplier_id,
          );
        }

        try {
          const response =
            await fetch(
              `/api/abastecimiento-logistica/inventarios/recepciones?purchaseOrderId=${encodeURIComponent(
                orderId,
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
                "No se pudieron cargar los ítems de la orden de compra.",
            );
          }

          const loadedItems =
            (
              payload.purchaseOrderItems ??
              []
            ) as PurchaseOrderItem[];

          const mappedItems =
            loadedItems
              .map(
                (
                  orderItem,
                ) => {
                  const product =
                    Array.isArray(
                      orderItem.products,
                    )
                      ? orderItem
                          .products[0]
                      : orderItem.products;

                  const pending =
                    Number(
                      orderItem.quantity_ordered ||
                        0,
                    ) -
                    Number(
                      orderItem.quantity_received ||
                        0,
                    );

                  return {
                    purchase_order_item_id:
                      orderItem.id,

                    item_id:
                      orderItem.item_id,

                    item_name:
                      product
                        ? `${
                            product.final_code ||
                            product.reference
                          } · ${
                            product.name
                          }`
                        : "Producto sin nombre",

                    unit:
                      product?.unit ?? "",

                    tracks_lots:
                      product?.tracks_lots ?? false,

                    quantity_ordered:
                      Math.max(
                        pending,
                        0,
                      ),

                    quantity_received:
                      pending > 0
                        ? pending
                        : 0,

                    supplier_lot:
                      "",

                    internal_lot:
                      "",

                    expiration_date:
                      "",

                    warehouse_id:
                      "",

                    unit_cost:
                      Number(
                        orderItem.unit_price ||
                          0,
                      ),

                    difference_reason:
                      "",
                  };
                },
              )
              .filter(
                (item) =>
                  item.quantity_ordered >
                  0,
              );

          setReceiptItems(
            mappedItems.length >
              0
              ? mappedItems
              : [
                  {
                    ...emptyReceiptItem,
                  },
                ],
          );
        } catch (error) {
          alert(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los ítems de la orden de compra.",
          );
        }
      },
      [
        purchaseOrders,
        session?.access_token,
      ],
    );

  useEffect(() => {
    if (
      receiptMode ===
        "Desde OC" &&
      purchaseOrderId
    ) {
      void loadPurchaseOrderItems(
        purchaseOrderId,
      );
    }
  }, [
    receiptMode,
    purchaseOrderId,
    loadPurchaseOrderItems,
  ]);

  // =======================================================
  // ÍTEMS
  // =======================================================

  function addItem() {
    setReceiptItems(
      (current) => [
        ...current,
        {
          ...emptyReceiptItem,
        },
      ],
    );
  }

  function removeItem(
    index: number,
  ) {
    if (
      receiptItems.length ===
      1
    ) {
      return;
    }

    setReceiptItems(
      (current) =>
        current.filter(
          (
            _,
            itemIndex,
          ) =>
            itemIndex !==
            index,
        ),
    );
  }

  function updateReceiptItem(
    index: number,
    field: keyof ReceiptItem,
    value:
      | string
      | number
      | null,
  ) {
    const updated = [
      ...receiptItems,
    ];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (
      field === "item_id"
    ) {
      const selectedItem =
        items.find(
          (item) =>
            item.id === value,
        );

      updated[index].unit =
        selectedItem?.unit ?? "";

      updated[index].tracks_lots =
        selectedItem?.tracks_lots ?? false;

      if (!selectedItem?.tracks_lots) {
        updated[index].internal_lot = "";
        updated[index].expiration_date = "";
      }

      if (selectedItem) {
        updated[
          index
        ].item_name =
          `${
            selectedItem.final_code ||
            selectedItem.reference
          } · ${
            selectedItem.name
          }`;
      }
    }

    setReceiptItems(
      updated,
    );
  }

  // =======================================================
  // TOTALES
  // =======================================================

  const total =
    useMemo(() => {
      return receiptItems.reduce(
        (
          accumulator,
          item,
        ) =>
          accumulator +
          Number(
            item.quantity_received ||
              0,
          ) *
            Number(
              item.unit_cost ||
                0,
            ),
        0,
      );
    }, [receiptItems]);

  const selectedSupplier =
    suppliers.find(
      (supplier) =>
        supplier.id ===
        supplierId,
    );

  const paymentDueDate =
    useMemo(() => {
      if (!receiptDate) {
        return "";
      }

      const terms =
        Number(
          selectedSupplier?.payment_terms_days ||
            0,
        );

      const date =
        new Date(
          `${receiptDate}T00:00:00`,
        );

      date.setDate(
        date.getDate() +
          terms,
      );

      return date
        .toISOString()
        .slice(0, 10);
    }, [
      receiptDate,
      selectedSupplier,
    ]);

  // =======================================================
  // VALIDACIÓN
  // =======================================================

  function validateForm() {
    if (
      receiptMode ===
        "Desde OC" &&
      !purchaseOrderId
    ) {
      alert(
        "Debes seleccionar una orden de compra.",
      );

      return false;
    }

    if (!supplierId) {
      alert(
        "Debes seleccionar un proveedor.",
      );

      return false;
    }

    if (!receiptDate) {
      alert(
        "Debes seleccionar la fecha de recepción.",
      );

      return false;
    }

    if (
      receiptMode ===
        "Directa" &&
      !authorizationReference.trim()
    ) {
      alert(
        "Las entradas directas requieren una referencia o autorización.",
      );

      return false;
    }

    const validItems =
      receiptItems.filter(
        (item) =>
          item.item_id,
      );

    if (
      validItems.length ===
      0
    ) {
      alert(
        "Debes recibir al menos un producto.",
      );

      return false;
    }

    for (
      const item of validItems
    ) {
      if (
        Number(
          item.quantity_received,
        ) <= 0
      ) {
        alert(
          `La cantidad recibida de ${item.item_name} debe ser mayor a 0.`,
        );

        return false;
      }

      if (
        !item.warehouse_id
      ) {
        alert(
          `Debes seleccionar almacén para ${item.item_name}.`,
        );

        return false;
      }

      if (
        item.tracks_lots &&
        !item.internal_lot.trim()
      ) {
        alert(
          `El producto ${item.item_name} maneja lotes. Debes ingresar lote interno.`,
        );

        return false;
      }

      if (
        Number(
          item.unit_cost,
        ) < 0
      ) {
        alert(
          `El costo unitario de ${item.item_name} no puede ser negativo.`,
        );

        return false;
      }

      if (
        receiptMode ===
        "Desde OC"
      ) {
        const difference =
          Number(
            item.quantity_received ||
              0,
          ) -
          Number(
            item.quantity_ordered ||
              0,
          );

        if (
          difference > 0 &&
          !item.difference_reason.trim()
        ) {
          alert(
            `Hay una sobre-recepción en ${item.item_name}. Debes indicar el motivo.`,
          );

          return false;
        }
      }
    }

    return true;
  }

  // =======================================================
  // GUARDAR
  // =======================================================

  async function handleSaveReception() {
    if (
      !validateForm()
    ) {
      return;
    }

    if (
      !session?.access_token
    ) {
      alert(
        "No se encontró una sesión válida.",
      );

      return;
    }

    setSaving(true);

    try {
      const validItems =
        receiptItems.filter(
          (item) =>
            item.item_id,
        );

      const response =
        await fetch(
          "/api/abastecimiento-logistica/inventarios/recepciones",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                receipt_mode:
                  receiptMode,

                purchase_order_id:
                  receiptMode ===
                  "Desde OC"
                    ? purchaseOrderId
                    : null,

                supplier_id:
                  supplierId,

                receipt_date:
                  receiptDate,

                supplier_invoice_number:
                  supplierInvoice.trim() ||
                  null,

                supplier_remission_number:
                  supplierRemission.trim() ||
                  null,

                authorization_reference:
                  authorizationReference.trim() ||
                  null,

                observations:
                  observations.trim() ||
                  null,

                items:
                  validItems.map(
                    (item) => ({
                      purchase_order_item_id:
                        item.purchase_order_item_id,

                      item_id:
                        item.item_id,

                      warehouse_id:
                        item.warehouse_id,

                      quantity_received:
                        Number(
                          item.quantity_received,
                        ),

                      unit_price:
                        Number(
                          item.unit_cost,
                        ),

                      supplier_lot_number:
                        item.supplier_lot.trim() ||
                        null,

                                            internal_lot:
                        null,

                      expiration_date:
                        item.tracks_lots
                          ? item.expiration_date ||
                            null
                          : null,

                      difference_reason:
                        item.difference_reason.trim() ||
                        null,
                    }),
                  ),
              }),
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "No se pudo registrar la recepción.",
        );
      }

      const receiptNumber =
        payload?.receipt
          ?.receipt_number ||
        "registrada";

      alert(
        `Recepción ${receiptNumber} registrada correctamente.`,
      );

      window.location.href =
        "/abastecimiento-logistica/recepciones";
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la recepción.",
      );
    } finally {
      setSaving(false);
    }
  }

  // =======================================================
  // PANTALLA
  // =======================================================

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Almacenes e Inventarios · Entradas / recepción
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
            Nueva recepción
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Registra entradas desde órdenes de compra o entradas directas,
            generando lote, existencias y movimiento de Kardex.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Consecutivo
          </p>

          <p className="mt-1 text-lg font-semibold text-gray-500">
            Se asignará al guardar
          </p>
        </div>
      </section>

      {errorMessage && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </section>
      )}

      {isLoading ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Cargando información de recepción...
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Información general
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Modo recepción *
                </label>

                <select
                  value={receiptMode}
                  onChange={(event) =>
                    setReceiptMode(
                      event.target.value as
                        | "Desde OC"
                        | "Directa",
                    )
                  }
                  className={inputClass}
                >
                  <option value="Desde OC">
                    Desde OC
                  </option>

                  <option value="Directa">
                    Entrada directa
                  </option>
                </select>
              </div>

              {receiptMode ===
                "Desde OC" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Orden de compra *
                  </label>

                  <select
                    value={
                      purchaseOrderId
                    }
                    onChange={(
                      event,
                    ) =>
                      setPurchaseOrderId(
                        event.target
                          .value,
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Seleccionar OC
                    </option>

                    {purchaseOrders.map(
                      (order) => {
                        const supplier =
                          suppliers.find(
                            (
                              item,
                            ) =>
                              item.id ===
                              order.supplier_id,
                          );

                        return (
                          <option
                            key={
                              order.id
                            }
                            value={
                              order.id
                            }
                          >
                            {
                              order.purchase_order_number
                            }{" "}
                            ·{" "}
                            {supplier?.name ||
                              "Sin proveedor"}
                          </option>
                        );
                      },
                    )}
                  </select>

                  {purchaseOrders.length ===
                    0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No hay órdenes de compra abiertas o parciales.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Proveedor *
                </label>

                <select
                  value={supplierId}
                  onChange={(
                    event,
                  ) =>
                    setSupplierId(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    receiptMode ===
                    "Desde OC"
                  }
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
                >
                  <option value="">
                    Seleccionar proveedor
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={
                          supplier.id
                        }
                        value={
                          supplier.id
                        }
                      >
                        {supplier.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Fecha recepción *
                </label>

                <input
                  type="date"
                  value={receiptDate}
                  onChange={(
                    event,
                  ) =>
                    setReceiptDate(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Factura proveedor
                </label>

                <input
                  value={
                    supplierInvoice
                  }
                  onChange={(
                    event,
                  ) =>
                    setSupplierInvoice(
                      event.target
                        .value,
                    )
                  }
                  placeholder="FV-10293"
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Remisión proveedor
                </label>

                <input
                  value={
                    supplierRemission
                  }
                  onChange={(
                    event,
                  ) =>
                    setSupplierRemission(
                      event.target
                        .value,
                    )
                  }
                  placeholder="REM-882"
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Fecha vencimiento informativa
                </label>

                <input
                  value={
                    paymentDueDate
                  }
                  readOnly
                  className={`${inputClass} bg-gray-50`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Recibido por
                </label>

                <input
                  value={
                    systemUser?.full_name ||
                    systemUser?.email ||
                    "Usuario autenticado"
                  }
                  readOnly
                  className={`${inputClass} bg-gray-50`}
                />

                <p className="mt-2 text-xs text-gray-500">
                  El responsable se toma automáticamente de la sesión de CLAP.
                </p>
              </div>

              {receiptMode ===
                "Directa" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Autorización / referencia *
                  </label>

                  <select
                    value={
                      authorizationReference
                    }
                    onChange={(
                      event,
                    ) =>
                      setAuthorizationReference(
                        event.target.value,
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Seleccionar referencia
                    </option>

                    {authorizationReferences.map(
                      (reference) => (
                        <option
                          key={reference.id}
                          value={reference.name}
                        >
                          {reference.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Observaciones
                </label>

                <textarea
                  rows={3}
                  value={
                    observations
                  }
                  onChange={(
                    event,
                  ) =>
                    setObservations(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Notas de recepción, calidad, diferencias o condiciones..."
                  className={
                    inputClass
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Productos recibidos
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registra cantidades, almacén, lote, costo y diferencias.
                </p>
              </div>

              {receiptMode ===
                "Directa" && (
                <button
                  type="button"
                  onClick={
                    addItem
                  }
                  className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
                >
                  Agregar producto
                </button>
              )}
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[1550px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">
                      Producto
                    </th>

                    <th className="px-4 py-3">
                      Pendiente
                    </th>

                    <th className="px-4 py-3">
                      Recibido *
                    </th>

                    <th className="px-4 py-3">
                      Diferencia
                    </th>

                    <th className="px-4 py-3">
                      Motivo
                    </th>

                    <th className="px-4 py-3">
                      Almacén *
                    </th>

                    <th className="px-4 py-3">
                      Lote proveedor
                    </th>

                    <th className="px-4 py-3">
                      Lote interno
                    </th>

                    <th className="px-4 py-3">
                      Vencimiento
                    </th>

                    <th className="px-4 py-3">
                      Costo unitario
                    </th>

                    <th className="px-4 py-3">
                      Total
                    </th>

                    {receiptMode ===
                      "Directa" && (
                      <th className="px-4 py-3">
                        Acción
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {receiptItems.map(
                    (
                      item,
                      index,
                    ) => {
                      const difference =
                        receiptMode ===
                        "Desde OC"
                          ? Number(
                              item.quantity_received ||
                                0,
                            ) -
                            Number(
                              item.quantity_ordered ||
                                0,
                            )
                          : 0;

                      const lineTotal =
                        Number(
                          item.quantity_received ||
                            0,
                        ) *
                        Number(
                          item.unit_cost ||
                            0,
                        );

                      return (
                        <tr
                          key={
                            `${index}-${item.purchase_order_item_id || "direct"}`
                          }
                          className="align-top transition hover:bg-gray-50"
                        >
                          <td className="px-4 py-4">
                            {receiptMode ===
                            "Desde OC" ? (
                              <div className="min-w-64 font-medium text-gray-900">
                                {
                                  item.item_name
                                }
                              </div>
                            ) : (
                              <select
                                value={
                                  item.item_id
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateReceiptItem(
                                    index,
                                    "item_id",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className="w-80 rounded-xl border border-gray-300 px-3 py-2"
                              >
                                <option value="">
                                  Seleccionar producto
                                </option>

                                {items.map(
                                  (
                                    availableItem,
                                  ) => (
                                    <option
                                      key={
                                        availableItem.id
                                      }
                                      value={
                                        availableItem.id
                                      }
                                    >
                                      {availableItem.final_code ||
                                        availableItem.reference}{" "}
                                      ·{" "}
                                      {
                                        availableItem.name
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            )}
                          </td>

                          <td className="px-4 py-4 text-gray-600">
                            {receiptMode ===
                            "Desde OC" ? (
                              <div className="whitespace-nowrap">
                                <span>
                                  {Number(
                                    item.quantity_ordered ||
                                      0,
                                  ).toLocaleString(
                                    "es-CO",
                                  )}
                                </span>

                                {item.unit && (
                                  <span className="ml-1 font-semibold text-gray-700">
                                    {item.unit}
                                  </span>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  item.quantity_received
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateReceiptItem(
                                    index,
                                    "quantity_received",
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                  )
                                }
                                className="w-32 rounded-xl border border-gray-300 px-3 py-2"
                              />

                              {item.unit && (
                                <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-[#07076b]/10 px-2.5 py-2 text-xs font-bold text-[#07076b]">
                                  {item.unit}
                                </span>
                              )}
                            </div>
                          </td>

                          <td
                            className={`px-4 py-4 font-semibold ${
                              difference > 0
                                ? "text-amber-700"
                                : difference < 0
                                  ? "text-blue-700"
                                  : "text-gray-600"
                            }`}
                          >
                            {receiptMode ===
                            "Desde OC" ? (
                              <div className="whitespace-nowrap">
                                <span>
                                  {difference.toLocaleString(
                                    "es-CO",
                                  )}
                                </span>

                                {item.unit && (
                                  <span className="ml-1">
                                    {item.unit}
                                  </span>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <input
                              value={
                                item.difference_reason
                              }
                              onChange={(
                                event,
                              ) =>
                                updateReceiptItem(
                                  index,
                                  "difference_reason",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="Si aplica"
                              className="w-52 rounded-xl border border-gray-300 px-3 py-2"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <select
                              value={
                                item.warehouse_id
                              }
                              onChange={(
                                event,
                              ) =>
                                updateReceiptItem(
                                  index,
                                  "warehouse_id",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              className="w-56 rounded-xl border border-gray-300 px-3 py-2"
                            >
                              <option value="">
                                Seleccionar
                              </option>

                              {warehouses.map(
                                (
                                  warehouse,
                                ) => (
                                  <option
                                    key={
                                      warehouse.id
                                    }
                                    value={
                                      warehouse.id
                                    }
                                  >
                                    {
                                      warehouse.code
                                    }{" "}
                                    ·{" "}
                                    {
                                      warehouse.name
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </td>

                          <td className="px-4 py-4">
                            <input
                              value={
                                item.supplier_lot
                              }
                              onChange={(
                                event,
                              ) =>
                                updateReceiptItem(
                                  index,
                                  "supplier_lot",
                                  event.target.value,
                                )
                              }
                              placeholder="Opcional"
                              className="w-40 rounded-xl border border-gray-300 px-3 py-2"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-36">
                              <span className="inline-flex rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-bold text-[#07076b]">
                                Automático
                              </span>

                              <p className="mt-1 text-[11px] leading-4 text-gray-400">
                                Se genera al guardar
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            {item.tracks_lots ? (
                              <input
                                type="date"
                                value={
                                  item.expiration_date
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateReceiptItem(
                                    index,
                                    "expiration_date",
                                    event.target.value,
                                  )
                                }
                                className="w-40 rounded-xl border border-gray-300 px-3 py-2"
                              />
                            ) : (
                              <span className="inline-flex rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">
                                No aplica
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                item.unit_cost
                              }
                              onChange={(
                                event,
                              ) =>
                                updateReceiptItem(
                                  index,
                                  "unit_cost",
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                )
                              }
                              className="w-36 rounded-xl border border-gray-300 px-3 py-2"
                            />
                          </td>

                          <td className="px-4 py-4 font-semibold text-[#07076b]">
                            $
                            {lineTotal.toLocaleString(
                              "es-CO",
                            )}
                          </td>

                          {receiptMode ===
                            "Directa" && (
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index,
                                  )
                                }
                                disabled={
                                  receiptItems.length ===
                                  1
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Eliminar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            {warehouses.length ===
              0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No existen almacenes activos. Debes crear al menos uno antes de registrar una entrada.
              </div>
            )}

            {receiptMode ===
              "Directa" &&
              items.length ===
                0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No existen productos activos configurados como comprables y con control de inventario.
                </div>
              )}

            <div className="mt-6 flex flex-col gap-4 border-t border-gray-200 pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total recepción
                </p>

                <p className="mt-1 text-2xl font-bold text-[#07076b]">
                  $
                  {total.toLocaleString(
                    "es-CO",
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleSaveReception
                }
                disabled={
                  saving ||
                  warehouses.length ===
                    0
                }
                className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Registrando..."
                  : "Registrar recepción"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
