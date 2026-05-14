"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const categories = [
  "Envases",
  "Tapas",
  "Perfiles",
  "Especiales",
  "Servicios",
  "Materia prima",
  "Complememtos",
  "Otra",
];

const productTypes = ["Simple", "Compuesto", "Servicio", "Materia prima"];

const supplyTypes = ["Fabricado", "Comprado", "Mixto", "Servicio"];

const productionProcesses = [
  "Inyección",
  "Soplado",
  "Extrusión",
  "Comprado",
  "Servicio",
];

type Product = {
  id: string;
  reference: string;
  name: string;
  category: string;
  product_type: string;
  supply_type: string;
  production_process: string | null;
  color: string | null;
  unit: string;
  material: string | null;
  mouth_size: string | null;
  capacity_ml: number | null;
  width_cm: number | null;
  length_m: number | null;
  finish: string | null;
  technical_description: string | null;
  suggested_price: number;
  image_url: string | null;
  status: "Activo" | "Inactivo";
};

const emptyProduct: Omit<Product, "id"> = {
  reference: "",
  name: "",
  category: "Envases",
  product_type: "Simple",
  supply_type: "Fabricado",
  production_process: "Inyección",
  color: "",
  unit: "Unidad",
  material: "",
  mouth_size: "",
  capacity_ml: null,
  width_cm: null,
  length_m: null,
  finish: "",
  technical_description: "",
  suggested_price: 0,
  image_url: "",
  status: "Activo",
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const isEditing = editingProductId !== null;

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
        product.product_type,
        product.supply_type,
        product.production_process ?? "",
        product.color ?? "",
        product.material ?? "",
        product.finish ?? "",
        product.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const updateNewProduct = (
    field: keyof Omit<Product, "id">,
    value: string | number | null
  ) => {
    setNewProduct((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);

    setNewProduct({
      reference: product.reference,
      name: product.name,
      category: product.category,
      product_type: product.product_type ?? "Simple",
      supply_type: product.supply_type ?? "Fabricado",
      production_process: product.production_process ?? "Inyección",
      color: product.color ?? "",
      unit: product.unit,
      material: product.material ?? "",
      mouth_size: product.mouth_size ?? "",
      capacity_ml: product.capacity_ml,
      width_cm: product.width_cm,
      length_m: product.length_m,
      finish: product.finish ?? "",
      technical_description: product.technical_description ?? "",
      suggested_price: Number(product.suggested_price),
      image_url: product.image_url ?? "",
      status: product.status,
    });

    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.reference || !newProduct.name) {
      alert("Debes ingresar al menos la referencia y el nombre del producto.");
      return;
    }

    setIsSaving(true);

    const productData = {
      reference: newProduct.reference,
      name: newProduct.name,
      category: newProduct.category,
      product_type: newProduct.product_type,
      supply_type: newProduct.supply_type,
      production_process: newProduct.production_process || null,
      color: newProduct.color || null,
      unit: newProduct.unit,
      material: newProduct.material || null,
      mouth_size: newProduct.mouth_size || null,
      capacity_ml: newProduct.capacity_ml,
      width_cm: newProduct.width_cm,
      length_m: newProduct.length_m,
      finish: newProduct.finish || null,
      technical_description: newProduct.technical_description || null,
      suggested_price: newProduct.suggested_price,
      image_url: newProduct.image_url || null,
      status: newProduct.status,
    };

    if (isEditing) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProductId);

      if (error) {
        alert(`Error actualizando producto: ${error.message}`);
        setIsSaving(false);
        return;
      }

      alert("Producto actualizado correctamente");
    } else {
      const { error } = await supabase.from("products").insert(productData);

      if (error) {
        alert(`Error creando producto: ${error.message}`);
        setIsSaving(false);
        return;
      }

      alert("Producto creado correctamente");
    }

    await fetchProducts();

    setNewProduct(emptyProduct);
    setEditingProductId(null);
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProductId(null);
    setNewProduct(emptyProduct);
  };

  const showInjectionFields = newProduct.production_process === "Inyección";
  const showBlowingFields = newProduct.production_process === "Soplado";
  const showExtrusionFields = newProduct.production_process === "Extrusión";

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
            Administra productos comerciales, compuestos, servicios, compras y
            fichas técnicas por proceso productivo.
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
            placeholder="Buscar producto, referencia, proceso o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClassName} md:max-w-sm`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1400px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Proceso</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Precio sugerido</th>
                <th className="px-4 py-3">Imagen</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={12}
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
                      {product.product_type}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.supply_type}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.production_process || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.category}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.color || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.material || "—"}
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-900">
                      ${Number(product.suggested_price).toLocaleString("es-CO")}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {product.image_url ? "Sí" : "—"}
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

                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                      >
                        Editar
                      </button>

                      {product.product_type === "Compuesto" && (
                        <Link
                          href={`/configuracion/productos/${product.id}/componentes`}
                          className="ml-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                        >
                          Componentes
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
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
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Configuración · Productos
                </p>

                <h2 className="text-2xl font-bold text-[#07076b]">
                  {isEditing ? "Editar producto" : "Nuevo producto"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registra la información comercial y técnica del producto.
                </p>
              </div>

              <button
                onClick={closeModal}
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
                  Tipo de producto
                </label>

                <select
                  value={newProduct.product_type}
                  onChange={(e) =>
                    updateNewProduct("product_type", e.target.value)
                  }
                  className={inputClassName}
                >
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Origen / abastecimiento
                </label>

                <select
                  value={newProduct.supply_type}
                  onChange={(e) =>
                    updateNewProduct("supply_type", e.target.value)
                  }
                  className={inputClassName}
                >
                  {supplyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Proceso
                </label>

                <select
                  value={newProduct.production_process ?? ""}
                  onChange={(e) =>
                    updateNewProduct("production_process", e.target.value)
                  }
                  className={inputClassName}
                >
                  {productionProcesses.map((process) => (
                    <option key={process} value={process}>
                      {process}
                    </option>
                  ))}
                </select>
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
                  placeholder="Ej: Blanco, Natural, Rojo"
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

              {(showInjectionFields || showBlowingFields) && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Material
                  </label>

                  <input
                    value={newProduct.material ?? ""}
                    onChange={(e) =>
                      updateNewProduct("material", e.target.value)
                    }
                    placeholder="Ej: PP, PET, PEAD"
                    className={inputClassName}
                  />
                </div>
              )}

              {showBlowingFields && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Boca
                    </label>

                    <input
                      value={newProduct.mouth_size ?? ""}
                      onChange={(e) =>
                        updateNewProduct("mouth_size", e.target.value)
                      }
                      placeholder="Ej: 20, 24, 120"
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Capacidad ml
                    </label>

                    <input
                      type="number"
                      value={newProduct.capacity_ml ?? ""}
                      onChange={(e) =>
                        updateNewProduct(
                          "capacity_ml",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="Ej: 1000"
                      className={inputClassName}
                    />
                  </div>
                </>
              )}

              {showExtrusionFields && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Ancho cm
                    </label>

                    <input
                      type="number"
                      value={newProduct.width_cm ?? ""}
                      onChange={(e) =>
                        updateNewProduct(
                          "width_cm",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="Ej: 4"
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Largo m
                    </label>

                    <input
                      type="number"
                      value={newProduct.length_m ?? ""}
                      onChange={(e) =>
                        updateNewProduct(
                          "length_m",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="Ej: 1.2"
                      className={inputClassName}
                    />
                  </div>
                </>
              )}

              {(showInjectionFields || showBlowingFields || showExtrusionFields) && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Acabado
                  </label>

                  <input
                    value={newProduct.finish ?? ""}
                    onChange={(e) => updateNewProduct("finish", e.target.value)}
                    placeholder='Ej: N/A, Marca, Adhesivo 1/2"'
                    className={inputClassName}
                  />
                </div>
              )}

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
                  URL imagen
                </label>

                <input
                  value={newProduct.image_url ?? ""}
                  onChange={(e) =>
                    updateNewProduct("image_url", e.target.value)
                  }
                  placeholder="https://..."
                  className={inputClassName}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Descripción técnica
                </label>

                <textarea
                  rows={3}
                  value={newProduct.technical_description ?? ""}
                  onChange={(e) =>
                    updateNewProduct("technical_description", e.target.value)
                  }
                  placeholder="Notas técnicas adicionales del producto..."
                  className={inputClassName}
                />
              </div>
            </div>

            {newProduct.product_type === "Compuesto" && (
              <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
                Este producto se venderá como un conjunto. Después de guardarlo,
                podrás configurar sus componentes desde el botón Componentes.
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar producto"
                  : "Guardar producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}