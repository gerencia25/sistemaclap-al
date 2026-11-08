"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

type Supplier = {
  id: string;
  name: string;
  supplier_knowledge_status:
    | "Pendiente"
    | "Completo"
    | "No aplica";
};

type Item = {
  id: string;
  final_code: string | null;
  reference: string | null;
  name: string;
  item_type: string;
  unit: string | null;
  can_be_purchased: boolean;
};

type PurchaseItem = {
  item_id: string;
  item_name: string;
  quantity_ordered: number;
  unit_price: number;
};

const emptyItem: PurchaseItem = {
  item_id: "",
  item_name: "",
  quantity_ordered: 1,
  unit_price: 0,
};

export default function NuevaCompraPage() {
  const { session } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(() => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [observations, setObservations] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { ...emptyItem },
  ]);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    loadData();
  }, [session?.access_token]);

  async function loadData() {
    try {
      const response = await fetch(
        "/api/abastecimiento-logistica/compras/catalogos",
        {
          headers: {
            Authorization:
              `Bearer ${session?.access_token ?? ""}`,
          },
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudieron cargar los catálogos de compras.",
        );
      }

      setSuppliers(result.suppliers ?? []);
      setItems(result.items ?? []);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los catálogos de compras.",
      );
    }
  }

  function addItem() {
    setPurchaseItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    if (purchaseItems.length === 1) return;
    setPurchaseItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function updateItem(
    index: number,
    field: keyof PurchaseItem,
    value: string | number
  ) {
    const updated = [...purchaseItems];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "item_id") {
      const selectedItem = items.find((item) => item.id === value);

      if (selectedItem) {
        updated[index].item_name = selectedItem.name;
      }
    }

    setPurchaseItems(updated);
  }

  function getItemUnit(itemId: string) {
    if (!itemId) {
      return "—";
    }

    const selectedItem = items.find(
      (availableItem) =>
        availableItem.id === itemId,
    );

    return (
      selectedItem?.unit?.trim() ||
      "Sin unidad"
    );
  }

  const total = useMemo(() => {
    return purchaseItems.reduce(
      (acc, item) =>
        acc + Number(item.quantity_ordered) * Number(item.unit_price),
      0
    );
  }, [purchaseItems]);

  function validateForm() {
    if (!supplierId) {
      alert("Debes seleccionar un proveedor.");
      return false;
    }

    if (!orderDate) {
      alert("Debes seleccionar la fecha de la orden.");
      return false;
    }

    const validItems = purchaseItems.filter((item) => item.item_id);

    if (validItems.length === 0) {
      alert("Debes agregar al menos un item.");
      return false;
    }

    for (const item of validItems) {
      if (Number(item.quantity_ordered) <= 0) {
        alert("Todas las cantidades deben ser mayores a 0.");
        return false;
      }

      if (Number(item.unit_price) <= 0) {
        alert("Todos los precios unitarios deben ser mayores a 0.");
        return false;
      }
    }

    return true;
  }

  async function getNextPurchaseRequestNumber() {
    const { data, error } = await supabase.rpc(
      "next_purchase_request_number",
      {
        p_request_date: orderDate,
      },
    );

    if (error) {
      throw new Error(
        `No se pudo generar el consecutivo de la orden de compra: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error(
        "No se pudo generar el consecutivo de la orden de compra.",
      );
    }

    return String(data);
  }

  async function handleSavePurchaseOrder() {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const purchaseRequestNumber = await getNextPurchaseRequestNumber();

      const validItems = purchaseItems.filter((item) => item.item_id);

      const { data: createdOrder, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          purchase_order_number: purchaseRequestNumber,
          clap_request_number: purchaseRequestNumber,
          siigo_sync_status: "Pendiente",
          source_system: "CLAP",
          supplier_id: supplierId,
          order_date: orderDate,
          expected_delivery_date: expectedDeliveryDate || null,
          observations,
          total,
          status: "Abierta",
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(orderError.message);
      }

      const itemsPayload = validItems.map((item) => ({
        purchase_order_id: createdOrder.id,
        item_id: item.item_id,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        total: Number(item.quantity_ordered) * Number(item.unit_price),
        quantity_received: 0,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsPayload);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      alert(`Solicitud de compra ${purchaseRequestNumber} creada correctamente.`);
      window.location.href = "/abastecimiento-logistica/compras";
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Error creando orden de compra."
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
            Abastecimiento · Compras
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Nueva Orden de Compra
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Registra compras a proveedores de materias primas, insumos,
            repuestos y materiales necesarios para la operación.
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
              Proveedor *
            </label>

            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputClass}
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
              Fecha orden *
            </label>

            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Entrega esperada
            </label>

            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
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
              placeholder="Condiciones, notas de entrega, forma de pago, etc."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Items de compra
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Selecciona items comprables, cantidades y precios unitarios.
            </p>
          </div>

          <button
            onClick={addItem}
            className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
          >
            Agregar item
          </button>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Item *</th>
                <th className="px-4 py-3">Cantidad *</th>
                <th className="px-4 py-3">Precio unitario *</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {purchaseItems.map((item, index) => {
                const itemTotal =
                  Number(item.quantity_ordered) * Number(item.unit_price);

                return (
                  <tr key={index} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <select
                        value={item.item_id}
                        onChange={(e) =>
                          updateItem(index, "item_id", e.target.value)
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
                    </td>

                    <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity_ordered}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity_ordered",
                          Number(e.target.value),
                        )
                      }
                      className="w-32 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10"
                    />

                    <span className="min-w-14 rounded-lg bg-indigo-50 px-3 py-3 text-center text-sm font-bold text-[#07076b]">
                      {getItemUnit(item.item_id)}
                    </span>
                  </div>
                </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unit_price",
                            Number(e.target.value)
                          )
                        }
                        className={inputClass}
                      />
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      ${itemTotal.toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => removeItem(index)}
                        disabled={purchaseItems.length === 1}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </td>
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
              Total orden
            </p>

            <h2 className="mt-1 text-4xl font-bold text-[#07076b]">
              ${total.toLocaleString("es-CO")}
            </h2>
          </div>

          <button
            onClick={handleSavePurchaseOrder}
            disabled={saving}
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar orden de compra"}
          </button>
        </div>
      </section>
    </div>
  );
}