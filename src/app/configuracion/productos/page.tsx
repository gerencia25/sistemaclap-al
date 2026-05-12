"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const categories = [
  "Envases",
  "Tapas",
  "Complementos",
  "Servicios",
  "Materia prima",
  "Otra",
];

type Product = {
  id: string;
  reference: string;
  name: string;
  category: string;
  color: string | null;
  unit: string;
  suggested_price: number;
  status: "Activo" | "Inactivo";
};

const emptyProduct: Omit<Product, "id"> = {
  reference: "",
  name: "",
  category: "Envases",
  color: "",
  unit: "Unidad",
  suggested_price: 0,
  status: "Activo",
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

  const fetchProducts = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando productos: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setProducts((data ?? []) as Product[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return products;

    return products.filter((product) =>
      [
        product.reference,
        product.name,
        product.category,
        product.color ?? "",
        product.unit,
        product.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const updateNewProduct = (
    field: keyof Omit<Product, "id">,
    value: string | number
  ) => {
    setNewProduct((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateProduct = async () => {
    if (!newProduct.reference || !newProduct.name) {
      alert("Debes ingresar al menos la referencia y el nombre del producto.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("products").insert({
      reference: newProduct.reference,
      name: newProduct.name,
      category: newProduct.category,
      color: newProduct.color || null,
      unit: newProduct.unit,
      suggested_price: newProduct.suggested_price,
      status: newProduct.status,
    });

    if (error) {
      alert(`Error creando producto: ${error.message}`);
      setIsSaving(false);
      return;
    }

    await fetchProducts();

    setNewProduct(emptyProduct);
    setIsModalOpen(false);
    setIsSaving(false);

    alert("Producto creado correctamente");
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Productos
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Productos
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra referencias, precios sugeridos y características
            comerciales de los productos de A&L Multiformas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nuevo producto
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Base de productos
          </h2>

          <input
            type="text"
            placeholder="Buscar producto, referencia o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClassName} md:max-w-sm`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Precio sugerido</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando productos...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredProducts.map((product) => (
                  <tr key={product.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-[#07076b]">
                      {product.reference}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {product.name}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.category}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.color || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.unit}
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-900">
                      ${Number(product.suggested_price).toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          product.status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron productos con ese criterio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Configuración · Productos
                </p>

                <h2 className="text-2xl font-bold text-[#07076b]">
                  Nuevo producto
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registra la información comercial básica del producto.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-3 py-1 text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Referencia *
                </label>

                <input
                  value={newProduct.reference}
                  onChange={(e) =>
                    updateNewProduct("reference", e.target.value)
                  }
                  placeholder="Ej: ENV-B38-200"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Categoría
                </label>

                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    updateNewProduct("category", e.target.value)
                  }
                  className={inputClassName}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nombre del producto *
                </label>

                <input
                  value={newProduct.name}
                  onChange={(e) => updateNewProduct("name", e.target.value)}
                  placeholder="Nombre comercial del producto"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Color
                </label>

                <input
                  value={newProduct.color ?? ""}
                  onChange={(e) => updateNewProduct("color", e.target.value)}
                  placeholder="Ej: Blanco"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Unidad
                </label>

                <input
                  value={newProduct.unit}
                  onChange={(e) => updateNewProduct("unit", e.target.value)}
                  placeholder="Ej: Unidad"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Precio sugerido
                </label>

                <input
                  type="number"
                  value={newProduct.suggested_price}
                  onChange={(e) =>
                    updateNewProduct("suggested_price", Number(e.target.value))
                  }
                  placeholder="0"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Estado
                </label>

                <select
                  value={newProduct.status}
                  onChange={(e) =>
                    updateNewProduct(
                      "status",
                      e.target.value as Product["status"]
                    )
                  }
                  className={inputClassName}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setNewProduct(emptyProduct);
                  setIsModalOpen(false);
                }}
                disabled={isSaving}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleCreateProduct}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}