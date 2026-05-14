"use client";

import { uploadOrderSupportFile } from "@/lib/uploadOrderSupportFile";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
};

type SalesAdvisor = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  reference: string;
  name: string;
  suggested_price: number;
  production_process: string | null;
};

type ProductionFinish = {
  id: string;
  process: string;
  name: string;
};

type OrderItem = {
  product_id: string;
  product_name: string;
  production_process: string | null;
  quantity: number;
  unit_price: number;
  finishes: string[];
  observations: string;
};

const emptyItem: OrderItem = {
  product_id: "",
  product_name: "",
  production_process: null,
  quantity: 1,
  unit_price: 0,
  finishes: [],
  observations: "",
};

export default function NuevoPedidoPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesAdvisors, setSalesAdvisors] = useState<SalesAdvisor[]>([]);
  const [productionFinishes, setProductionFinishes] = useState<
    ProductionFinish[]
  >([]);

  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [salesAdvisor, setSalesAdvisor] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [customerOrderNumber, setCustomerOrderNumber] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [commercialObservations, setCommercialObservations] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ ...emptyItem }]);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const [
      { data: customersData },
      { data: productsData },
      { data: advisorsData },
      { data: finishesData },
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name")
        .eq("status", "Activo")
        .order("name"),

      supabase
        .from("products")
        .select("id, reference, name, suggested_price, production_process")
        .eq("status", "Activo")
        .order("name"),

      supabase
        .from("sales_advisors")
        .select("id, name")
        .eq("status", "Activo")
        .order("name"),

      supabase
        .from("production_finishes")
        .select("id, process, name")
        .eq("status", "Activo")
        .order("process")
        .order("name"),
    ]);

    setCustomers(customersData || []);
    setProducts(productsData || []);
    setSalesAdvisors(advisorsData || []);
    setProductionFinishes(finishesData || []);
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateItem(
    index: number,
    field: keyof OrderItem,
    value: string | number | string[] | null
  ) {
    const updated = [...items];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "product_id") {
      const product = products.find((item) => item.id === value);

      if (product) {
        updated[index] = {
          ...updated[index],
          product_id: product.id,
          product_name: product.name,
          production_process: product.production_process,
          unit_price: Number(product.suggested_price || 0),
          finishes: [],
        };
      }
    }

    setItems(updated);
  }

  function getAvailableFinishes(process: string | null) {
    if (!process) return [];
    return productionFinishes.filter((finish) => finish.process === process);
  }

  function toggleFinish(index: number, finishName: string) {
    const updated = [...items];
    const currentFinishes = updated[index].finishes || [];
    const exists = currentFinishes.includes(finishName);

    updated[index].finishes = exists
      ? currentFinishes.filter((item) => item !== finishName)
      : [...currentFinishes, finishName];

    setItems(updated);
  }

  function validateForm() {
    if (!entryDate) {
      alert("Debes seleccionar la fecha de ingreso.");
      return false;
    }

    if (!salesAdvisor) {
      alert("Debes seleccionar el asesor comercial.");
      return false;
    }

    if (!customerId) {
      alert("Debes seleccionar el cliente.");
      return false;
    }

    if (!shippingAddress.trim()) {
      alert("Debes ingresar la dirección de despacho.");
      return false;
    }

    if (!shippingCity.trim()) {
      alert("Debes ingresar la ciudad de despacho.");
      return false;
    }

    if (!requestedDate) {
      alert("Debes seleccionar la fecha requerida por el cliente.");
      return false;
    }

    if (!customerOrderNumber.trim()) {
      alert("Debes ingresar la orden de compra o cotización.");
      return false;
    }

    if (!supportFile) {
      alert("Debes adjuntar el PDF soporte del pedido.");
      return false;
    }

    for (const item of items) {
      if (!item.product_id) {
        alert("Todos los productos deben estar seleccionados.");
        return false;
      }

      if (Number(item.quantity) <= 0) {
        alert("Todas las cantidades deben ser mayores a 0.");
        return false;
      }

      if (Number(item.unit_price) <= 0) {
        alert("Todos los precios de venta deben ser mayores a 0.");
        return false;
      }

      const availableFinishes = getAvailableFinishes(item.production_process);

      if (availableFinishes.length > 0 && item.finishes.length === 0) {
        alert(
          `Debes seleccionar al menos un acabado para el producto: ${item.product_name}.`
        );
        return false;
      }
    }

    return true;
  }

async function handleRegisterOrder() {
  if (!validateForm()) return;

  setSaving(true);

  try {
    // 1. Generar consecutivo REAL
    const response = await fetch("/api/pedidos/next-number");
    const numberData = await response.json();

    const orderNumber = numberData.orderNumber;

    // 2. Subir PDF soporte
    let supportFileUrl = "";
    let supportFileName = "";

    if (supportFile) {
      const uploadResult = await uploadOrderSupportFile(supportFile);

      supportFileUrl = uploadResult.fileUrl;
      supportFileName = supportFile.name;
    }

    // 3. Crear pedido
    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        entry_date: entryDate,
        sales_advisor: salesAdvisor,
        customer_id: customerId,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        customer_order_number: customerOrderNumber,
        requested_delivery_date: requestedDate,
        commercial_observations: commercialObservations,
        support_file_url: supportFileUrl,
        support_file_name: supportFileName,
        total,
        status: "Pendiente",
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(orderError.message);
    }

    // 4. Crear items
    const itemsPayload = items.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      production_process: item.production_process,
      quantity: item.quantity,
      unit_price: item.unit_price,
      finishes: item.finishes,
      item_observations: item.observations,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsPayload);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    alert(`Pedido ${orderNumber} registrado correctamente`);

    window.location.reload();
  } catch (error: any) {
    console.error(error);

    alert(error.message || "Error registrando pedido");
  } finally {
    setSaving(false);
  }
}

  const total = items.reduce(
    (acc, item) => acc + Number(item.quantity) * Number(item.unit_price),
    0
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Comercial · Pedidos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Nuevo Pedido
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Registra pedidos comerciales con soporte documental, productos,
            acabados y condiciones de entrega.
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
              Fecha de ingreso *
            </label>

            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Asesor comercial *
            </label>

            <select
              value={salesAdvisor}
              onChange={(e) => setSalesAdvisor(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar asesor</option>

              {salesAdvisors.map((advisor) => (
                <option key={advisor.id} value={advisor.name}>
                  {advisor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Cliente *
            </label>

            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar cliente</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Dirección despacho *
            </label>

            <input
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Dirección"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Ciudad despacho *
            </label>

            <input
              value={shippingCity}
              onChange={(e) => setShippingCity(e.target.value)}
              placeholder="Ciudad"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha requerida cliente *
            </label>

            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Orden compra / Cotización *
            </label>

            <input
              value={customerOrderNumber}
              onChange={(e) => setCustomerOrderNumber(e.target.value)}
              placeholder="OC-0000 / COT-26001"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              PDF soporte pedido *
            </label>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setSupportFile(e.target.files?.[0] || null)}
              className={inputClass}
            />

            {supportFile && (
              <p className="mt-2 text-xs text-gray-500">
                Archivo seleccionado: {supportFile.name}
              </p>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Observaciones comerciales
            </label>

            <textarea
              value={commercialObservations}
              onChange={(e) => setCommercialObservations(e.target.value)}
              rows={3}
              placeholder="Notas comerciales relevantes para planeación..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Productos del pedido
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Selecciona productos, cantidades, precios, acabados y
              observaciones por ítem.
            </p>
          </div>

          <button
            onClick={addItem}
            className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
          >
            Agregar producto
          </button>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1350px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Producto *</th>
                <th className="px-4 py-3">Proceso</th>
                <th className="px-4 py-3">Cantidad *</th>
                <th className="px-4 py-3">Precio venta *</th>
                <th className="px-4 py-3">Acabados *</th>
                <th className="px-4 py-3">Observaciones</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => {
                const itemTotal =
                  Number(item.quantity) * Number(item.unit_price);

                const finishes = getAvailableFinishes(item.production_process);

                return (
                  <tr
                    key={index}
                    className="align-top transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <select
                        value={item.product_id}
                        onChange={(e) =>
                          updateItem(index, "product_id", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Seleccionar producto</option>

                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.reference} · {product.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {item.production_process || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value))
                        }
                        className={inputClass}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
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

                    <td className="px-4 py-4">
                      {finishes.length > 0 ? (
                        <div className="flex max-w-[280px] flex-wrap gap-2">
                          {finishes.map((finish) => (
                            <label
                              key={finish.id}
                              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                                item.finishes.includes(finish.name)
                                  ? "border-[#07076b] bg-[#07076b] text-white"
                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={item.finishes.includes(finish.name)}
                                onChange={() =>
                                  toggleFinish(index, finish.name)
                                }
                                className="sr-only"
                              />
                              {finish.name}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Selecciona producto
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <input
                        value={item.observations}
                        onChange={(e) =>
                          updateItem(index, "observations", e.target.value)
                        }
                        placeholder="Notas del producto"
                        className={inputClass}
                      />
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      ${itemTotal.toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
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
              Total pedido
            </p>

            <h2 className="mt-1 text-4xl font-bold text-[#07076b]">
              ${total.toLocaleString("es-CO")}
            </h2>
          </div>

          <button
            onClick={handleRegisterOrder}
            disabled={saving}
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar pedido"}
          </button>
        </div>
      </section>
    </div>
  );
}