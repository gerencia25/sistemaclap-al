"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Supplier = {
  id: string;
  name: string;
  payment_terms_days: number | null;
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
};

type Item = {
  id: string;
  reference: string;
  name: string;
  item_type: string;
};

type PurchaseOrder = {
  id: string;
  purchase_order_number: string;
  supplier_id: string;
  total: number;
  suppliers:
    | {
        name: string;
        payment_terms_days: number | null;
      }
    | {
        name: string;
        payment_terms_days: number | null;
      }[]
    | null;
};

type PurchaseOrderItem = {
  id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  products:
    | {
        reference: string;
        name: string;
        item_type: string;
      }
    | {
        reference: string;
        name: string;
        item_type: string;
      }[]
    | null;
};

type ReceiptItem = {
  purchase_order_item_id: string | null;
  item_id: string;
  item_name: string;
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
  quantity_ordered: 0,
  quantity_received: 0,
  supplier_lot: "",
  internal_lot: "",
  expiration_date: "",
  warehouse_id: "",
  unit_cost: 0,
  difference_reason: "",
};

export default function NuevaRecepcionPage() {
  const [receiptMode, setReceiptMode] = useState<"Desde OC" | "Directa">(
    "Desde OC"
  );

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<
    PurchaseOrderItem[]
  >([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [supplierRemission, setSupplierRemission] = useState("");
  const [authorizationReference, setAuthorizationReference] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [observations, setObservations] = useState("");

  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { ...emptyReceiptItem },
  ]);

  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (receiptMode === "Directa") {
      setPurchaseOrderId("");
      setPurchaseOrderItems([]);
      setSupplierId("");
      setReceiptItems([{ ...emptyReceiptItem }]);
    }
  }, [receiptMode]);

  useEffect(() => {
    if (purchaseOrderId) {
      loadPurchaseOrderItems(purchaseOrderId);
    }
  }, [purchaseOrderId]);

  async function loadInitialData() {
    const [
      { data: ordersData },
      { data: suppliersData },
      { data: warehousesData },
      { data: itemsData },
    ] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          `
          id,
          purchase_order_number,
          supplier_id,
          total,
          suppliers:supplier_id (
            name,
            payment_terms_days
          )
        `
        )
        .in("status", ["Abierta", "Parcial"])
        .order("created_at", { ascending: false }),

      supabase
        .from("suppliers")
        .select("id, name, payment_terms_days")
        .eq("status", "Activo")
        .order("name"),

      supabase
        .from("warehouses")
        .select("id, code, name")
        .eq("status", "Activo")
        .order("code"),

      supabase
        .from("products")
        .select("id, reference, name, item_type")
        .eq("status", "Activo")
        .eq("can_be_purchased", true)
        .order("name"),
    ]);

    setPurchaseOrders((ordersData ?? []) as PurchaseOrder[]);
    setSuppliers((suppliersData ?? []) as Supplier[]);
    setWarehouses((warehousesData ?? []) as Warehouse[]);
    setItems((itemsData ?? []) as Item[]);
  }

  async function loadPurchaseOrderItems(orderId: string) {
    const selectedOrder = purchaseOrders.find((order) => order.id === orderId);

    if (selectedOrder) {
      setSupplierId(selectedOrder.supplier_id);
    }

    const { data, error } = await supabase
      .from("purchase_order_items")
      .select(
        `
        id,
        item_id,
        quantity_ordered,
        quantity_received,
        unit_price,
        products:item_id (
          reference,
          name,
          item_type
        )
      `
      )
      .eq("purchase_order_id", orderId);

    if (error) {
      alert(`Error cargando items de OC: ${error.message}`);
      return;
    }

    const loadedItems = (data ?? []) as PurchaseOrderItem[];

    setPurchaseOrderItems(loadedItems);

    const mappedItems = loadedItems.map((orderItem) => {
      const product = Array.isArray(orderItem.products)
        ? orderItem.products[0]
        : orderItem.products;

      const pending =
        Number(orderItem.quantity_ordered || 0) -
        Number(orderItem.quantity_received || 0);

      return {
        purchase_order_item_id: orderItem.id,
        item_id: orderItem.item_id,
        item_name: product
          ? `${product.reference} · ${product.name}`
          : "Item sin nombre",
        quantity_ordered: pending,
        quantity_received: pending > 0 ? pending : 0,
        supplier_lot: "",
        internal_lot: "",
        expiration_date: "",
        warehouse_id: "",
        unit_cost: Number(orderItem.unit_price || 0),
        difference_reason: "",
      };
    });

    setReceiptItems(mappedItems.length > 0 ? mappedItems : [{ ...emptyReceiptItem }]);
  }

  function addItem() {
    setReceiptItems((current) => [...current, { ...emptyReceiptItem }]);
  }

  function removeItem(index: number) {
    if (receiptItems.length === 1) return;
    setReceiptItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function updateReceiptItem(
    index: number,
    field: keyof ReceiptItem,
    value: string | number | null
  ) {
    const updated = [...receiptItems];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "item_id") {
      const selectedItem = items.find((item) => item.id === value);

      if (selectedItem) {
        updated[index].item_name = `${selectedItem.reference} · ${selectedItem.name}`;
      }
    }

    setReceiptItems(updated);
  }

  const total = useMemo(() => {
    return receiptItems.reduce(
      (acc, item) =>
        acc + Number(item.quantity_received || 0) * Number(item.unit_cost || 0),
      0
    );
  }, [receiptItems]);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);

  const paymentDueDate = useMemo(() => {
    if (!receiptDate) return "";

    const terms = Number(selectedSupplier?.payment_terms_days || 0);
    const date = new Date(`${receiptDate}T00:00:00`);
    date.setDate(date.getDate() + terms);

    return date.toISOString().slice(0, 10);
  }, [receiptDate, selectedSupplier]);

  function validateForm() {
    if (receiptMode === "Desde OC" && !purchaseOrderId) {
      alert("Debes seleccionar una orden de compra.");
      return false;
    }

    if (!supplierId) {
      alert("Debes seleccionar un proveedor.");
      return false;
    }

    if (!receiptDate) {
      alert("Debes seleccionar la fecha de recepción.");
      return false;
    }

    if (!supplierInvoice.trim()) {
      alert("Debes ingresar la factura del proveedor.");
      return false;
    }

    if (!receivedBy.trim()) {
      alert("Debes indicar quién recibió el material.");
      return false;
    }

    const validItems = receiptItems.filter((item) => item.item_id);

    if (validItems.length === 0) {
      alert("Debes recibir al menos un item.");
      return false;
    }

    for (const item of validItems) {
      if (Number(item.quantity_received) <= 0) {
        alert("Todas las cantidades recibidas deben ser mayores a 0.");
        return false;
      }

      if (!item.warehouse_id) {
        alert(`Debes seleccionar bodega para ${item.item_name}.`);
        return false;
      }

      if (!item.internal_lot.trim()) {
        alert(`Debes ingresar lote interno para ${item.item_name}.`);
        return false;
      }

      if (Number(item.unit_cost) <= 0) {
        alert(`Debes ingresar costo unitario para ${item.item_name}.`);
        return false;
      }

      const difference =
        Number(item.quantity_received) - Number(item.quantity_ordered);

      if (receiptMode === "Desde OC" && difference > 0 && !item.difference_reason.trim()) {
        alert(
          `Hay sobre-recepción en ${item.item_name}. Debes ingresar motivo de diferencia.`
        );
        return false;
      }
    }

    return true;
  }

  async function getNextReceiptNumber() {
    const year = Number(new Date().getFullYear().toString().slice(-2));

    const { data, error } = await supabase
      .from("document_sequences")
      .select("*")
      .eq("document_type", "REC")
      .eq("year", year)
      .single();

    if (error || !data) {
      throw new Error("No se encontró consecutivo de recepciones.");
    }

    const nextNumber = Number(data.current_number) + 1;

    const { error: updateError } = await supabase
      .from("document_sequences")
      .update({
        current_number: nextNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateError) {
      throw new Error("No se pudo actualizar el consecutivo de recepción.");
    }

    return `REC-${year}${String(nextNumber).padStart(3, "0")}`;
  }

  async function handleSaveReception() {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const receiptNumber = await getNextReceiptNumber();

      const { data: createdReceipt, error: receiptError } = await supabase
        .from("purchase_receipts")
        .insert({
          receipt_number: receiptNumber,
          purchase_order_id: receiptMode === "Desde OC" ? purchaseOrderId : null,
          supplier_id: supplierId,
          warehouse_id: null,
          receipt_mode: receiptMode,
          reception_date: receiptDate,
          receipt_date: receiptDate,
          supplier_invoice: supplierInvoice,
          supplier_invoice_number: supplierInvoice,
          supplier_remission: supplierRemission || null,
          supplier_remission_number: supplierRemission || null,
          authorization_reference: authorizationReference || null,
          received_by: receivedBy,
          payment_due_date: paymentDueDate || null,
          payment_terms_days: Number(selectedSupplier?.payment_terms_days || 0),
          observations,
          total,
          status: "Recibido",
        })
        .select()
        .single();

      if (receiptError) {
        throw new Error(receiptError.message);
      }

      const validItems = receiptItems.filter((item) => item.item_id);

      for (const item of validItems) {
        const difference =
          Number(item.quantity_received) - Number(item.quantity_ordered);

        const { data: lotData, error: lotError } = await supabase
          .from("inventory_lots")
          .insert({
            lot_number: item.internal_lot,
            item_id: item.item_id,
            warehouse_id: item.warehouse_id,
            origin_type: receiptMode === "Desde OC" ? "Compra OC" : "Entrada directa",
            origin_reference: receiptNumber,
            supplier_name: selectedSupplier?.name ?? null,
            expiration_date: item.expiration_date || null,
            status: "Activo",
            notes: item.supplier_lot
              ? `Lote proveedor: ${item.supplier_lot}`
              : null,
          })
          .select()
          .single();

        if (lotError) {
          throw new Error(lotError.message);
        }

        const lineTotal =
          Number(item.quantity_received) * Number(item.unit_cost);

        const { error: receiptItemError } = await supabase
          .from("purchase_receipt_items")
          .insert({
            purchase_receipt_id: createdReceipt.id,
            purchase_order_item_id: item.purchase_order_item_id,
            item_id: item.item_id,
            warehouse_id: item.warehouse_id,
            supplier_lot: item.supplier_lot || null,
            supplier_lot_number: item.supplier_lot || null,
            internal_lot: item.internal_lot,
            internal_lot_id: lotData.id,
            expiration_date: item.expiration_date || null,
            quantity_ordered: item.quantity_ordered,
            quantity_received: item.quantity_received,
            quantity_difference: difference,
            difference_reason: item.difference_reason || null,
            unit_cost: item.unit_cost,
            unit_price: item.unit_cost,
            total: lineTotal,
          });

        if (receiptItemError) {
          throw new Error(receiptItemError.message);
        }

        const { data: existingBalance } = await supabase
          .from("inventory_balances")
          .select("*")
          .eq("item_id", item.item_id)
          .eq("warehouse_id", item.warehouse_id)
          .eq("lot_id", lotData.id)
          .maybeSingle();

        const previousBalance = Number(existingBalance?.quantity_total || 0);
        const newBalance = previousBalance + Number(item.quantity_received);

        if (existingBalance) {
          const { error: balanceUpdateError } = await supabase
            .from("inventory_balances")
            .update({
              quantity_total: newBalance,
              quantity_available:
                newBalance - Number(existingBalance.quantity_reserved || 0),
              unit_cost: item.unit_cost,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingBalance.id);

          if (balanceUpdateError) {
            throw new Error(balanceUpdateError.message);
          }
        } else {
          const { error: balanceInsertError } = await supabase
            .from("inventory_balances")
            .insert({
              item_id: item.item_id,
              warehouse_id: item.warehouse_id,
              lot_id: lotData.id,
              quantity_total: item.quantity_received,
              quantity_reserved: 0,
              quantity_available: item.quantity_received,
              unit_cost: item.unit_cost,
            });

          if (balanceInsertError) {
            throw new Error(balanceInsertError.message);
          }
        }

        const { error: movementError } = await supabase
          .from("inventory_movements")
          .insert({
            movement_type:
              receiptMode === "Desde OC" ? "Entrada compra OC" : "Entrada directa",
            item_id: item.item_id,
            warehouse_id: item.warehouse_id,
            lot_id: lotData.id,
            quantity: item.quantity_received,
            previous_balance: previousBalance,
            new_balance: newBalance,
            reference_type: "Recepción compra",
            reference_id: createdReceipt.id,
            reference_number: receiptNumber,
            notes: item.difference_reason || null,
            created_by: receivedBy,
          });

        if (movementError) {
          throw new Error(movementError.message);
        }

        if (item.purchase_order_item_id) {
          const original = purchaseOrderItems.find(
            (poItem) => poItem.id === item.purchase_order_item_id
          );

          const newReceived =
            Number(original?.quantity_received || 0) +
            Number(item.quantity_received);

          const { error: updatePOItemError } = await supabase
            .from("purchase_order_items")
            .update({
              quantity_received: newReceived,
            })
            .eq("id", item.purchase_order_item_id);

          if (updatePOItemError) {
            throw new Error(updatePOItemError.message);
          }
        }
      }

      if (receiptMode === "Desde OC" && purchaseOrderId) {
        const { data: poItemsAfter } = await supabase
          .from("purchase_order_items")
          .select("quantity_ordered, quantity_received")
          .eq("purchase_order_id", purchaseOrderId);

        const allReceived = (poItemsAfter ?? []).every(
          (poItem) =>
            Number(poItem.quantity_received || 0) >=
            Number(poItem.quantity_ordered || 0)
        );

        const someReceived = (poItemsAfter ?? []).some(
          (poItem) => Number(poItem.quantity_received || 0) > 0
        );

        const newStatus = allReceived
          ? "Recibida"
          : someReceived
          ? "Parcial"
          : "Abierta";

        await supabase
          .from("purchase_orders")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", purchaseOrderId);
      }

      if (supplierInvoice.trim()) {
        const { error: payableError } = await supabase
          .from("accounts_payable")
          .insert({
            supplier_id: supplierId,
            purchase_receipt_id: createdReceipt.id,
            invoice_number: supplierInvoice,
            invoice_date: receiptDate,
            due_date: paymentDueDate || null,
            total_amount: total,
            paid_amount: 0,
            balance_amount: total,
            status: "Pendiente",
            observations,
          });

        if (payableError) {
          throw new Error(payableError.message);
        }
      }

      alert(`Recepción ${receiptNumber} registrada correctamente.`);
      window.location.href = "/abastecimiento-logistica/recepciones";
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Error registrando recepción."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Abastecimiento · Recepciones
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Nueva Recepción
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Registra entradas desde orden de compra o entradas directas, creando
            lotes, kardex, saldos y cuentas por pagar.
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
              onChange={(e) =>
                setReceiptMode(e.target.value as "Desde OC" | "Directa")
              }
              className={inputClass}
            >
              <option value="Desde OC">Desde OC</option>
              <option value="Directa">Entrada directa</option>
            </select>
          </div>

          {receiptMode === "Desde OC" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Orden de compra *
              </label>

              <select
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                className={inputClass}
              >
                <option value="">Seleccionar OC</option>

                {purchaseOrders.map((order) => {
                  const supplier = Array.isArray(order.suppliers)
                    ? order.suppliers[0]
                    : order.suppliers;

                  return (
                    <option key={order.id} value={order.id}>
                      {order.purchase_order_number} · {supplier?.name ?? "Sin proveedor"}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Proveedor *
            </label>

            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputClass}
              disabled={receiptMode === "Desde OC"}
            >
              <option value="">Seleccionar proveedor</option>

              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha recepción *
            </label>

            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Factura proveedor *
            </label>

            <input
              value={supplierInvoice}
              onChange={(e) => setSupplierInvoice(e.target.value)}
              placeholder="FV-10293"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Remisión proveedor
            </label>

            <input
              value={supplierRemission}
              onChange={(e) => setSupplierRemission(e.target.value)}
              placeholder="REM-882"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha vencimiento pago
            </label>

            <input value={paymentDueDate} readOnly className={`${inputClass} bg-gray-50`} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Recibido por *
            </label>

            <input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Nombre responsable"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Autorización / soporte diferencia
            </label>

            <input
              value={authorizationReference}
              onChange={(e) => setAuthorizationReference(e.target.value)}
              placeholder="WhatsApp, correo, llamada..."
              className={inputClass}
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Observaciones
            </label>

            <textarea
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas de recepción, calidad, diferencias o condiciones..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Items recibidos
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Registra cantidades, lotes, bodegas, costos y diferencias.
            </p>
          </div>

          {receiptMode === "Directa" && (
            <button
              onClick={addItem}
              className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
            >
              Agregar item
            </button>
          )}
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1600px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Ordenado / pendiente</th>
                <th className="px-4 py-3">Recibido *</th>
                <th className="px-4 py-3">Diferencia</th>
                <th className="px-4 py-3">Motivo diferencia</th>
                <th className="px-4 py-3">Bodega *</th>
                <th className="px-4 py-3">Lote proveedor</th>
                <th className="px-4 py-3">Lote interno *</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-4 py-3">Costo unitario *</th>
                <th className="px-4 py-3">Total</th>
                {receiptMode === "Directa" && (
                  <th className="px-4 py-3">Acción</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {receiptItems.map((item, index) => {
                const difference =
                  Number(item.quantity_received || 0) -
                  Number(item.quantity_ordered || 0);

                const lineTotal =
                  Number(item.quantity_received || 0) *
                  Number(item.unit_cost || 0);

                return (
                  <tr key={index} className="align-top transition hover:bg-gray-50">
                    <td className="px-4 py-4">
                      {receiptMode === "Desde OC" ? (
                        <div className="font-medium text-gray-900">
                          {item.item_name}
                        </div>
                      ) : (
                        <select
                          value={item.item_id}
                          onChange={(e) =>
                            updateReceiptItem(index, "item_id", e.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Seleccionar item</option>

                          {items.map((availableItem) => (
                            <option key={availableItem.id} value={availableItem.id}>
                              {availableItem.reference} · {availableItem.name} ·{" "}
                              {availableItem.item_type}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {Number(item.quantity_ordered || 0).toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={item.quantity_received}
                        onChange={(e) =>
                          updateReceiptItem(
                            index,
                            "quantity_received",
                            Number(e.target.value)
                          )
                        }
                        className="w-32 rounded-xl border border-gray-300 px-3 py-2"
                      />
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
                      {difference.toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4">
                      <input
                        value={item.difference_reason}
                        onChange={(e) =>
                          updateReceiptItem(
                            index,
                            "difference_reason",
                            e.target.value
                          )
                        }
                        placeholder="Motivo si aplica"
                        className="w-56 rounded-xl border border-gray-300 px-3 py-2"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={item.warehouse_id}
                        onChange={(e) =>
                          updateReceiptItem(index, "warehouse_id", e.target.value)
                        }
                        className="w-56 rounded-xl border border-gray-300 px-3 py-2"
                      >
                        <option value="">Seleccionar</option>

                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.code} · {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-4">
                      <input
                        value={item.supplier_lot}
                        onChange={(e) =>
                          updateReceiptItem(index, "supplier_lot", e.target.value)
                        }
                        className="w-40 rounded-xl border border-gray-300 px-3 py-2"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        value={item.internal_lot}
                        onChange={(e) =>
                          updateReceiptItem(index, "internal_lot", e.target.value)
                        }
                        placeholder="Lote interno"
                        className="w-40 rounded-xl border border-gray-300 px-3 py-2"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="date"
                        value={item.expiration_date}
                        onChange={(e) =>
                          updateReceiptItem(
                            index,
                            "expiration_date",
                            e.target.value
                          )
                        }
                        className="rounded-xl border border-gray-300 px-3 py-2"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) =>
                          updateReceiptItem(
                            index,
                            "unit_cost",
                            Number(e.target.value)
                          )
                        }
                        className="w-36 rounded-xl border border-gray-300 px-3 py-2"
                      />
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      ${lineTotal.toLocaleString("es-CO")}
                    </td>

                    {receiptMode === "Directa" && (
                      <td className="px-4 py-4">
                        <button
                          onClick={() => removeItem(index)}
                          disabled={receiptItems.length === 1}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Total recepción
            </p>

            <h2 className="mt-1 text-4xl font-bold text-[#07076b]">
              ${total.toLocaleString("es-CO")}
            </h2>
          </div>

          <button
            onClick={handleSaveReception}
            disabled={saving}
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar recepción"}
          </button>
        </div>
      </section>
    </div>
  );
}