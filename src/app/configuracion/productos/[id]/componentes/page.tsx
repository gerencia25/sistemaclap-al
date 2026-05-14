"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  reference: string;
  name: string;
  product_type: string;
  unit: string;
};

type ProductComponent = {
  id: string;
  quantity: number;
  notes: string | null;
  component_product_id: string;
  products: Product | Product[] | null;
};

export default function ProductComponentsPage() {
  const params = useParams<{ id: string }>();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [parentProduct, setParentProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [components, setComponents] = useState<ProductComponent[]>([]);

  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  const availableComponents = useMemo(() => {
    return products.filter((product) => product.id !== productId);
  }, [products, productId]);

  const getComponentProduct = (component: ProductComponent) => {
    if (!component.products) return null;

    if (Array.isArray(component.products)) {
      return component.products[0] ?? null;
    }

    return component.products;
  };

  const fetchData = async () => {
    setIsLoading(true);

    const [{ data: parentData }, { data: productsData }, { data: componentsData }] =
      await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),

        supabase
          .from("products")
          .select("id, reference, name, product_type, unit")
          .eq("status", "Activo")
          .order("name"),

        supabase
          .from("product_components")
          .select(
            `
            id,
            quantity,
            notes,
            component_product_id,
            products:component_product_id (
              id,
              reference,
              name,
              product_type,
              unit
            )
          `
          )
          .eq("parent_product_id", productId),
      ]);

    setParentProduct(parentData as Product);
    setProducts((productsData ?? []) as Product[]);
    setComponents((componentsData ?? []) as ProductComponent[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddComponent = async () => {
    if (!selectedComponentId) {
      alert("Debes seleccionar un componente.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("product_components").insert({
      parent_product_id: productId,
      component_product_id: selectedComponentId,
      quantity,
      notes: notes || null,
    });

    if (error) {
      alert(`Error agregando componente: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setSelectedComponentId("");
    setQuantity(1);
    setNotes("");

    await fetchData();

    setIsSaving(false);
  };

  const handleDeleteComponent = async (componentId: string) => {
    const confirmDelete = confirm("¿Eliminar este componente del producto?");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("product_components")
      .delete()
      .eq("id", componentId);

    if (error) {
      alert(`Error eliminando componente: ${error.message}`);
      return;
    }

    await fetchData();
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-gray-500">
        Cargando componentes...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Productos · Componentes
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            {parentProduct?.name ?? "Producto"}
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Define los componentes productivos que se deben fabricar o consumir
            cuando este producto sea vendido.
          </p>
        </div>

        <Link
          href="/configuracion/productos"
          className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Volver a productos
        </Link>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Agregar componente
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Componente
            </label>

            <select
              value={selectedComponentId}
              onChange={(e) => setSelectedComponentId(e.target.value)}
              className={inputClassName}
            >
              <option value="">Seleccionar componente</option>

              {availableComponents.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.reference} · {product.name} · {product.product_type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Cantidad por unidad
            </label>

            <input
              type="number"
              value={quantity}
              min={0}
              step="0.01"
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notas
            </label>

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              className={inputClassName}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleAddComponent}
            disabled={isSaving}
            className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Agregar componente"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Composición del producto
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Estos elementos se usarán después para planeación, producción,
            inventarios y compras.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Componente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {components.map((component) => {
                const product = getComponentProduct(component);

                return (
                  <tr key={component.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-[#07076b]">
                      {product?.reference ?? "—"}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {product?.name ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product?.product_type ?? "—"}
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-900">
                      {component.quantity}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product?.unit ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {component.notes || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDeleteComponent(component.id)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}

              {components.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Este producto todavía no tiene componentes configurados.
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