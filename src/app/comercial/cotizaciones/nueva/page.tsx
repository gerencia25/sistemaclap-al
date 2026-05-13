"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const categories = [
  "Alimentos",
  "Farmacéutica",
  "Cosmética",
  "Industrial",
  "Aseo",
  "Veterinaria",
  "Otra",
];

type Customer = {
  id: string;
  name: string;
  nit: string;
  category: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: string;
};

type Product = {
  id: string;
  reference: string;
  name: string;
  category: string;
  color: string | null;
  unit: string;
  suggested_price: number;
  status: string;
};

type QuoteItem = {
  product_id: string;
  product_name: string;
  color: string;
  suggested_price: number;
  unit_price: number;
  quantity: number;
};

const emptyItem: QuoteItem = {
  product_id: "",
  product_name: "",
  color: "",
  suggested_price: 0,
  unit_price: 0,
  quantity: 1,
};

export default function NuevaCotizacionPage() {
  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");

  const [paymentTerms, setPaymentTerms] = useState("30 días");
  const [deliveryTime, setDeliveryTime] = useState("25 días hábiles");
  const [validity, setValidity] = useState("15 días");
  const [taxCondition, setTaxCondition] = useState("NO INCLUYE IVA");

  const [sellerName, setSellerName] = useState("Elbert Alfonso");
  const [sellerRole, setSellerRole] = useState("Director");
  const [sellerPhone, setSellerPhone] = useState("1111");

  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([emptyItem]);

  const [quoteNumber, setQuoteNumber] = useState("COT-000000");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId
  );

  const subtotal = useMemo(() => {
    return items.reduce(
      (acc, item) => acc + Number(item.unit_price) * Number(item.quantity),
      0
    );
  }, [items]);

  useEffect(() => {
    setQuoteNumber(`COT-${Date.now().toString().slice(-6)}`);
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const [{ data: customersData }, { data: productsData }] =
        await Promise.all([
          supabase
            .from("customers")
            .select("*")
            .eq("status", "Activo")
            .order("name"),
          supabase
            .from("products")
            .select("*")
            .eq("status", "Activo")
            .order("name"),
        ]);

      const loadedCustomers = (customersData ?? []) as Customer[];
      const loadedProducts = (productsData ?? []) as Product[];

      setCustomers(loadedCustomers);
      setProducts(loadedProducts);

      if (loadedCustomers.length > 0) {
        setSelectedCustomerId(loadedCustomers[0].id);
        setCategory(loadedCustomers[0].category);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((item) => item.id === customerId);

    setSelectedCustomerId(customerId);
    setCategory(customer?.category ?? "");
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId);

    if (!product) return;

    const updatedItems = [...items];

    updatedItems[index] = {
      product_id: product.id,
      product_name: product.name,
      color: product.color ?? "",
      suggested_price: Number(product.suggested_price),
      unit_price: Number(product.suggested_price),
      quantity: updatedItems[index].quantity || 1,
    };

    setItems(updatedItems);
  };

  const updateItem = (
    index: number,
    field: keyof QuoteItem,
    value: string | number
  ) => {
    const updatedItems = [...items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setItems(updatedItems);
  };

  const addProduct = () => {
    setItems((current) => [...current, emptyItem]);
  };

  const removeProduct = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

const handleGenerateQuote = async () => {
  if (!selectedCustomerId) {
    alert("Debes seleccionar un cliente.");
    return;
  }

  if (!selectedCustomer) {
    alert("No se encontró la información del cliente seleccionado.");
    return;
  }

  const validItems = items.filter((item) => item.product_id);

  if (validItems.length === 0) {
    alert("Debes agregar al menos un producto.");
    return;
  }

  const quoteNumberResponse = await fetch("/api/cotizaciones/next-number");

if (!quoteNumberResponse.ok) {
  alert("No se pudo generar el consecutivo de la cotización.");
  setIsSaving(false);
  return;
}

const quoteNumberData = await quoteNumberResponse.json();
const generatedQuoteNumber = quoteNumberData.quoteNumber;
  setQuoteNumber(generatedQuoteNumber);
  setIsSaving(true);

  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .insert({
      quote_number: generatedQuoteNumber,
      customer_id: selectedCustomerId,
      category,
      seller_name: sellerName,
      seller_role: sellerRole,
      seller_phone: sellerPhone,
      quote_date: date || null,
      payment_terms: paymentTerms,
      delivery_time: deliveryTime,
      validity,
      tax_condition: taxCondition,
      observations,
      subtotal,
      total: subtotal,
      status: "Generada",
    })
    .select()
    .single();

  if (quotationError) {
    alert(`Error creando cotización: ${quotationError.message}`);
    setIsSaving(false);
    return;
  }

  const quotationItems = validItems.map((item) => ({
    quotation_id: quotation.id,
    product_id: item.product_id,
    product_name: item.product_name,
    color: item.color,
    suggested_price: item.suggested_price,
    unit_price: item.unit_price,
    quantity: item.quantity,
    total: item.unit_price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("quotation_items")
    .insert(quotationItems);

  if (itemsError) {
    alert(`Error guardando productos: ${itemsError.message}`);
    setIsSaving(false);
    return;
  }

  const sheetResponse = await fetch("/api/cotizaciones/generar-sheet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quotationId: quotation.id,
sheetData: {
  quoteNumber: generatedQuoteNumber,

  customer: {
    category,
    name: selectedCustomer.name ?? "",
    nit: selectedCustomer.nit ?? "",
    contact: selectedCustomer.contact ?? "",
    email: selectedCustomer.email ?? "",
    phone: selectedCustomer.phone ?? "",
    address: selectedCustomer.address ?? "",
    city: selectedCustomer.city ?? "",
  },

  commercial: {
    date,
    paymentTerms,
    deliveryTime,
    validity,
    taxCondition,
  },

  observations,

  items: validItems.map((item) => ({
    product: item.product_name,
    color: item.color,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    total: item.unit_price * item.quantity,
  })),
},
    }),
  });

  if (!sheetResponse.ok) {
    alert("La cotización se guardó, pero hubo un error creando el Sheet.");
    setIsSaving(false);
    return;
  }

  setIsSaving(false);
  window.location.href = `/comercial/cotizaciones/${quotation.id}`;
};

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Comercial · Cotizaciones
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Nueva Cotización
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Genera cotizaciones comerciales usando clientes y productos reales del
          sistema.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Información general
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Selecciona cliente, vendedor y condiciones comerciales.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Cargando información...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cliente
              </label>

              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={inputClassName}
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Categoría
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClassName}
              >
                {categories.map((categoryItem) => (
                  <option key={categoryItem} value={categoryItem}>
                    {categoryItem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fecha
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                NIT
              </label>

              <input
                value={selectedCustomer?.nit ?? ""}
                readOnly
                className={`${inputClassName} bg-gray-50`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Contacto
              </label>

              <input
                value={selectedCustomer?.contact ?? ""}
                readOnly
                className={`${inputClassName} bg-gray-50`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                value={selectedCustomer?.email ?? ""}
                readOnly
                className={`${inputClassName} bg-gray-50`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Teléfono
              </label>

              <input
                value={selectedCustomer?.phone ?? ""}
                readOnly
                className={`${inputClassName} bg-gray-50`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ciudad
              </label>

              <input
                value={selectedCustomer?.city ?? ""}
                readOnly
                className={`${inputClassName} bg-gray-50`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Dirección
              </label>

              <input
                value={selectedCustomer?.address ?? ""}
                readOnly
                className={`${inputClassName} bg-gray-50`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Forma de pago
              </label>

              <input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tiempo de entrega
              </label>

              <input
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Vigencia
              </label>

              <input
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Precios + IVA
              </label>

              <input
                value={taxCondition}
                onChange={(e) => setTaxCondition(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombre elaboró
              </label>

              <input
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cargo elaboró
              </label>

              <input
                value={sellerRole}
                onChange={(e) => setSellerRole(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Teléfono elaboró
              </label>

              <input
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Observaciones
              </label>

              <textarea
                rows={4}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones adicionales para la cotización..."
                className={inputClassName}
              />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Productos de la cotización
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Selecciona productos, revisa precio sugerido y ajusta el precio
              unitario si aplica.
            </p>
          </div>

          <button
            onClick={addProduct}
            className="rounded-xl bg-[#07076b] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Agregar producto
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Precio sugerido</th>
                <th className="px-4 py-3">Precio unitario</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">{index + 1}</td>

                  <td className="px-4 py-3">
                    <select
                      value={item.product_id}
                      onChange={(e) =>
                        handleProductChange(index, e.target.value)
                      }
                      className={inputClassName}
                    >
                      <option value="">Seleccionar producto</option>

                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.reference} · {product.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      value={item.color}
                      onChange={(e) =>
                        updateItem(index, "color", e.target.value)
                      }
                      className={inputClassName}
                    />
                  </td>

                  <td className="px-4 py-3 font-semibold text-[#07076b]">
                    ${Number(item.suggested_price).toLocaleString("es-CO")}
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(index, "unit_price", Number(e.target.value))
                      }
                      className={inputClassName}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", Number(e.target.value))
                      }
                      className={inputClassName}
                    />
                  </td>

                  <td className="px-4 py-3 font-semibold text-gray-900">
                    $
                    {Number(item.unit_price * item.quantity).toLocaleString(
                      "es-CO"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeProduct(index)}
                      disabled={items.length === 1}
                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-gray-900">Resumen</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Subtotal
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              ${subtotal.toLocaleString("es-CO")}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Total cotización
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              ${subtotal.toLocaleString("es-CO")}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Consecutivo provisional
            </p>

            <p className="mt-2 text-2xl font-bold text-[#07076b]">
              {quoteNumber}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleGenerateQuote}
            disabled={isSaving}
            className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Generando..." : "Generar cotización"}
          </button>
        </div>
      </section>
    </div>
  );
}