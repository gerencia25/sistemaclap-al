"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import CodificacionSubnav from "@/components/sc/CodificacionSubnav";

type HierarchyItem = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type CodeAttribute = {
  field_key: string;
  field_label: string;
  field_type: string;
  contributes_to_code: boolean;
  contributes_to_name: boolean;
  value: unknown;
};

type MasterDataField = {
  field_key: string;
  field_label: string;
  field_type: string;
  required: boolean;
  status: string;
  options: string[];
  value: unknown;
  filename: unknown;
};

type LinkedRequest = {
  id: string;
  request_number: string;
  requester_area: string;
  requester_name: string;
  requester_position: string | null;
  request_type: string;
  status: string;
  requested_at: string | null;
  completed_at: string | null;
};

type Product = {
  id: string;
  reference: string | null;
  name: string;
  category: string | null;
  item_type: string | null;

  classification_code: string | null;
  final_code: string | null;
  generated_reference: string | null;

  product_type: string | null;
  supply_type: string | null;
  production_process: string | null;

  unit: string | null;
  dian_unit: string | null;

  status: "Activo" | "Inactivo";

  can_be_sold: boolean;
  can_be_purchased: boolean;
  can_be_manufactured: boolean;

  tracks_inventory: boolean;
  tracks_lots: boolean;
  tracks_serials: boolean;

  requires_formula: boolean;
  requires_components: boolean;
  requires_route: boolean;
  requires_maintenance: boolean;
  depreciable: boolean;

  technical_description: string | null;
  suggested_price: number | null;

  image_url: string | null;
  technical_sheet_url: string | null;
  technical_sheet_filename: string | null;

  created_at: string;

  hierarchy: {
    category: HierarchyItem | null;
    group: HierarchyItem | null;
    subgroup: HierarchyItem | null;
  };

  template: {
    id: string;
    full_code: string;
    name: string | null;
    status: string;
  } | null;

  code_attributes: CodeAttribute[];
  master_data_fields: MasterDataField[];
  linked_request: LinkedRequest | null;
};

type Summary = {
  total: number;
  active: number;
  inactive: number;
};

function getProductCode(product: Product) {
  return (
    product.final_code ||
    product.reference ||
    product.generated_reference ||
    product.classification_code ||
    "N/A"
  );
}

function formatValue(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Pendiente";
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  return String(value);
}

function formatCurrency(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Pendiente";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default function MaestroProductosPage() {
  const { session, hasPermission } = useAuth();

const canEditProduct =
  hasPermission("CODIFICACION_EDIT_PRODUCT");

  const [products, setProducts] =
    useState<Product[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      total: 0,
      active: 0,
      inactive: 0,
    });

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("Todos");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [editValues, setEditValues] =
    useState<Record<string, string>>({});

  const [isSavingProduct, setIsSavingProduct] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const fetchProducts = useCallback(
    async () => {
      if (!session?.access_token) return;

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/sistema-gestion-calidad/codificacion/productos",
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
              "No se pudo cargar el Maestro de productos.",
          );
        }

        setProducts(
          payload.products ?? [],
        );

        setSummary(
          payload.summary ?? {
            total: 0,
            active: 0,
            inactive: 0,
          },
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el Maestro de productos.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts =
    useMemo(() => {
      const term =
        search.toLowerCase().trim();

      return products.filter(
        (product) => {
          const matchesStatus =
            statusFilter === "Todos" ||
            product.status ===
              statusFilter;

          const matchesSearch =
            !term ||
            [
              getProductCode(product),
              product.name,
              product.classification_code ??
                "",
              product.hierarchy.category
                ?.code ?? "",
              product.hierarchy.category
                ?.name ?? "",
              product.hierarchy.group
                ?.code ?? "",
              product.hierarchy.group
                ?.name ?? "",
              product.hierarchy.subgroup
                ?.code ?? "",
              product.hierarchy.subgroup
                ?.name ?? "",
              product.status,
            ]
              .join(" ")
              .toLowerCase()
              .includes(term);

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    }, [
      products,
      search,
      statusFilter,
    ]);

  function getMasterField(
    product: Product,
    fieldKey: string,
  ) {
    return (
      product.master_data_fields.find(
        (field) =>
          field.field_key === fieldKey,
      ) ?? null
    );
  }

  function getProductionProcess(
    product: Product,
  ) {
    const field =
      getMasterField(
        product,
        "production_process",
      );

    return (
      formatValue(field?.value) !==
      "Pendiente"
        ? formatValue(field?.value)
        : product.production_process ||
          "Pendiente"
    );
  }

  function getSuggestedPrice(
    product: Product,
  ) {
    const field =
      getMasterField(
        product,
        "suggested_sale_price",
      );

    if (
      field?.value !== null &&
      field?.value !== undefined &&
      field?.value !== ""
    ) {
      return formatCurrency(
        field.value,
      );
    }

    if (
      product.suggested_price !== null &&
      product.suggested_price !==
        undefined
    ) {
      return formatCurrency(
        product.suggested_price,
      );
    }

    return "Pendiente";
  }

  function openEditProduct(product: Product) {
    const initialValues: Record<string, string> = {};

    for (const field of product.master_data_fields) {
      if (
        field.field_type === "image" ||
        field.field_type === "pdf"
      ) {
        continue;
      }

      initialValues[field.field_key] =
        field.value === null ||
        field.value === undefined
          ? ""
          : String(field.value);
    }

    setSelectedProduct(null);
    setEditingProduct(product);
    setEditValues(initialValues);
  }

  function closeEditProduct() {
    if (isSavingProduct) return;

    setEditingProduct(null);
    setEditValues({});
  }

  function updateEditValue(
    fieldKey: string,
    value: string,
  ) {
    setEditValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  async function saveProductMasterData() {
    if (
      !editingProduct ||
      !session?.access_token
    ) {
      return;
    }

    const editableFields =
      editingProduct.master_data_fields.filter(
        (field) =>
          field.field_type !== "image" &&
          field.field_type !== "pdf",
      );

    for (const field of editableFields) {
      const value =
        editValues[field.field_key] ?? "";

      if (
        field.required &&
        !value.trim()
      ) {
        alert(
          `Debes completar: ${field.field_label}.`,
        );
        return;
      }
    }

    setIsSavingProduct(true);

    try {
      const itemMasterData =
        Object.fromEntries(
          editableFields.map((field) => [
            field.field_key,
            editValues[field.field_key] ?? "",
          ]),
        );

      const response = await fetch(
        "/api/sistema-gestion-calidad/codificacion/productos",
        {
          method: "PATCH",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: editingProduct.id,
            item_master_data:
              itemMasterData,
          }),
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "No se pudieron actualizar los datos del producto.",
        );
      }

      setEditingProduct(null);
      setEditValues({});

      await fetchProducts();

      alert(
        "Datos del producto actualizados correctamente.",
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar los datos del producto.",
      );
    } finally {
      setIsSavingProduct(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Sistema de Gestión de la Calidad ·
          Codificación
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Maestro de productos
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
          Consulta los productos oficiales creados
          mediante el proceso de codificación. La
          identidad, clasificación y código generado
          se conservan como información protegida.
        </p>
      </section>

      <CodificacionSubnav />

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total productos"
          value={summary.total}
        />

        <SummaryCard
          title="Activos"
          value={summary.active}
          tone="green"
        />

        <SummaryCard
          title="Inactivos"
          value={summary.inactive}
          tone="gray"
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Buscar producto
            </label>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Código, nombre, categoría, grupo, subgrupo..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Estado
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
            >
              <option value="Todos">
                Todos
              </option>

              <option value="Activo">
                Activos
              </option>

              <option value="Inactivo">
                Inactivos
              </option>
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Productos oficiales
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {filteredProducts.length} producto
            {filteredProducts.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        {isLoading ? (
          <div className="px-6 py-14 text-center text-sm text-gray-500">
            Cargando productos...
          </div>
        ) : filteredProducts.length ===
          0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-gray-900">
              No hay productos para mostrar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">
                    Código
                  </th>

                  <th className="px-5 py-3">
                    Nombre
                  </th>

                  <th className="px-5 py-3">
                    Clasificación
                  </th>

                  <th className="px-5 py-3">
                    Proceso
                  </th>

                  <th className="px-5 py-3">
                    Precio sugerido
                  </th>

                  <th className="px-5 py-3">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(
                  (product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono font-semibold text-[#07076b]">
                          {getProductCode(
                            product,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-700">
                          {product.classification_code ||
                            "N/A"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {product.hierarchy
                            .category?.name ||
                            "N/A"}{" "}
                          ·{" "}
                          {product.hierarchy
                            .group?.name ||
                            "N/A"}{" "}
                          ·{" "}
                          {product.hierarchy
                            .subgroup?.name ||
                            "N/A"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {getProductionProcess(
                          product,
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {getSuggestedPrice(
                          product,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            product.status ===
                            "Activo"
                              ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                              : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                          }
                        >
                          {product.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
  <button
    type="button"
    onClick={() =>
      setSelectedProduct(product)
    }
    className="rounded-lg border border-[#07076b]/20 px-3 py-2 text-xs font-semibold text-[#07076b] transition hover:bg-[#07076b]/5"
  >
    Ver detalle
  </button>

  {canEditProduct && (
    <button
      type="button"
      onClick={() =>
        openEditProduct(product)
      }
      className="rounded-lg bg-[#07076b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#07076b]/90"
    >
      Editar datos
    </button>
  )}
</div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <p className="text-sm font-semibold text-blue-800">
          Creación controlada
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-700">
          Los productos nuevos no se crean directamente
          desde este maestro. Su creación se realiza
          desde una solicitud de codificación atendida
          por SC, utilizando la configuración aprobada
          de categorías, plantillas y opciones.
        </p>
      </section>

      {editingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#07076b]">
                  Editar datos maestros
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {editingProduct.name}
                </h2>

                <p className="mt-2 font-mono text-sm font-semibold text-[#07076b]">
                  {getProductCode(
                    editingProduct,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditProduct}
                disabled={isSavingProduct}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Identidad protegida
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                El código, nombre generado, categoría,
                grupo, subgrupo, clasificación, atributos
                del código y estado no se pueden modificar
                desde este formulario.
              </p>
            </div>

            <section className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-900">
                Identificación del producto
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Código
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-gray-700">
                    {getProductCode(
                      editingProduct,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Clasificación
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {editingProduct.classification_code ||
                      "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Categoría
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {editingProduct.hierarchy.category
                      ? `${editingProduct.hierarchy.category.code} · ${editingProduct.hierarchy.category.name}`
                      : "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Estado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {editingProduct.status}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Datos maestros editables
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Los campos disponibles dependen de la
                  configuración de la categoría del producto.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                {editingProduct.master_data_fields
                  .filter(
                    (field) =>
                      field.field_type !== "image" &&
                      field.field_type !== "pdf",
                  )
                  .map((field) => (
                    <div
                      key={field.field_key}
                      className={
                        field.field_type === "textarea"
                          ? "md:col-span-2"
                          : ""
                      }
                    >
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        {field.field_label}
                        {field.required && (
                          <span className="ml-1 text-red-500">
                            *
                          </span>
                        )}
                      </label>

                      {field.field_type === "textarea" ? (
                        <textarea
                          rows={4}
                          value={
                            editValues[
                              field.field_key
                            ] ?? ""
                          }
                          onChange={(event) =>
                            updateEditValue(
                              field.field_key,
                              event.target.value,
                            )
                          }
                          className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10"
                        />
                      ) : field.field_type === "select" ? (
                        <select
                          value={
                            editValues[
                              field.field_key
                            ] ?? ""
                          }
                          onChange={(event) =>
                            updateEditValue(
                              field.field_key,
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10"
                        >
                          <option value="">
                            Seleccionar...
                          </option>

                          {field.options.map(
                            (option) => (
                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <input
                          type={
                            field.field_type ===
                            "number"
                              ? "number"
                              : "text"
                          }
                          step={
                            field.field_type ===
                            "number"
                              ? "any"
                              : undefined
                          }
                          value={
                            editValues[
                              field.field_key
                            ] ?? ""
                          }
                          onChange={(event) =>
                            updateEditValue(
                              field.field_key,
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10"
                        />
                      )}
                    </div>
                  ))}
              </div>

              {editingProduct.master_data_fields.filter(
                (field) =>
                  field.field_type !== "image" &&
                  field.field_type !== "pdf",
              ).length === 0 && (
                <p className="mt-5 text-sm text-gray-500">
                  Esta categoría no tiene datos maestros
                  editables configurados.
                </p>
              )}
            </section>

            {editingProduct.master_data_fields.some(
              (field) =>
                field.field_type === "image" ||
                field.field_type === "pdf",
            ) && (
              <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <h3 className="font-semibold text-blue-800">
                  Archivos del producto
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-700">
                  La imagen y la ficha técnica se
                  gestionarán mediante carga segura de
                  archivos. En esta etapa no se modifican
                  desde el formulario de datos maestros.
                </p>
              </section>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditProduct}
                disabled={isSavingProduct}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveProductMasterData}
                disabled={isSavingProduct}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07076b]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingProduct
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#07076b]">
                  {
                    selectedProduct.classification_code
                  }
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {selectedProduct.name}
                </h2>

                <p className="mt-2 font-mono text-sm font-semibold text-[#07076b]">
                  {getProductCode(
                    selectedProduct,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedProduct(null)
                }
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <DetailCard title="Identidad y clasificación">
                <DetailRow
                  label="Categoría"
                  value={
                    selectedProduct.hierarchy
                      .category
                      ? `${selectedProduct.hierarchy.category.code} · ${selectedProduct.hierarchy.category.name}`
                      : "N/A"
                  }
                />

                <DetailRow
                  label="Grupo"
                  value={
                    selectedProduct.hierarchy
                      .group
                      ? `${selectedProduct.hierarchy.group.code} · ${selectedProduct.hierarchy.group.name}`
                      : "N/A"
                  }
                />

                <DetailRow
                  label="Subgrupo"
                  value={
                    selectedProduct.hierarchy
                      .subgroup
                      ? `${selectedProduct.hierarchy.subgroup.code} · ${selectedProduct.hierarchy.subgroup.name}`
                      : "N/A"
                  }
                />

                <DetailRow
                  label="Clasificación"
                  value={
                    selectedProduct.classification_code ||
                    "N/A"
                  }
                />

                <DetailRow
                  label="Estado"
                  value={
                    selectedProduct.status
                  }
                />
              </DetailCard>

              <DetailCard title="Origen">
                <DetailRow
                  label="Solicitud"
                  value={
                    selectedProduct.linked_request
                      ?.request_number ||
                    "Sin solicitud vinculada"
                  }
                />

                <DetailRow
                  label="Solicitante"
                  value={
                    selectedProduct.linked_request
                      ?.requester_name ||
                    "N/A"
                  }
                />

                <DetailRow
                  label="Área"
                  value={
                    selectedProduct.linked_request
                      ?.requester_area ||
                    "N/A"
                  }
                />

                <DetailRow
                  label="Tipo"
                  value={
                    selectedProduct.linked_request
                      ?.request_type ||
                    "N/A"
                  }
                />

                <DetailRow
                  label="Creado"
                  value={formatDate(
                    selectedProduct.created_at,
                  )}
                />
              </DetailCard>
            </div>

            <div className="mt-5">
              <DetailCard title="Atributos del código">
                {selectedProduct
                  .code_attributes.length ===
                0 ? (
                  <p className="text-sm text-gray-500">
                    No hay atributos dinámicos
                    registrados.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedProduct.code_attributes.map(
                      (field) => (
                        <div
                          key={
                            field.field_key
                          }
                          className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {
                              field.field_label
                            }
                          </p>

                          <p className="mt-2 font-medium text-gray-900">
                            {formatValue(
                              field.value,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </DetailCard>
            </div>

            <div className="mt-5">
              <DetailCard title="Datos maestros">
                {selectedProduct
                  .master_data_fields
                  .length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay datos maestros
                    configurados para esta categoría.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedProduct.master_data_fields.map(
                      (field) => (
                        <div
                          key={
                            field.field_key
                          }
                          className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {
                              field.field_label
                            }
                          </p>

                          <p className="mt-2 font-medium text-gray-900">
                            {field.field_key ===
                            "suggested_sale_price"
                              ? formatCurrency(
                                  field.value,
                                )
                              : formatValue(
                                  field.value,
                                )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </DetailCard>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <DetailCard title="Archivos">
                <DetailRow
                  label="Ficha técnica"
                  value={
                    selectedProduct.technical_sheet_url
                      ? selectedProduct
                          .technical_sheet_filename ||
                        "Disponible"
                      : "Pendiente"
                  }
                />

                <DetailRow
                  label="Imagen"
                  value={
                    selectedProduct.image_url
                      ? "Disponible"
                      : "Pendiente"
                  }
                />
              </DetailCard>

              <DetailCard title="Comportamiento">
                <DetailRow
                  label="Venta"
                  value={
                    selectedProduct.can_be_sold
                      ? "Sí"
                      : "No"
                  }
                />

                <DetailRow
                  label="Compra"
                  value={
                    selectedProduct.can_be_purchased
                      ? "Sí"
                      : "No"
                  }
                />

                <DetailRow
                  label="Fabricación"
                  value={
                    selectedProduct.can_be_manufactured
                      ? "Sí"
                      : "No"
                  }
                />

                <DetailRow
                  label="Control inventario"
                  value={
                    selectedProduct.tracks_inventory
                      ? "Sí"
                      : "No"
                  }
                />

                <DetailRow
                  label="Componentes"
                  value={
                    selectedProduct.requires_components
                      ? "Sí"
                      : "No"
                  }
                />
              </DetailCard>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Identidad protegida
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                El código, clasificación y atributos
                que originaron la identidad del
                producto no se modifican desde este
                maestro.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  tone = "blue",
}: {
  title: string;
  value: number;
  tone?: "blue" | "green" | "gray";
}) {
  const valueClassName =
    tone === "green"
      ? "text-emerald-700"
      : tone === "gray"
        ? "text-gray-600"
        : "text-[#07076b]";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900">
        {title}
      </h3>

      <div className="mt-4 space-y-3">
        {children}
      </div>
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-gray-900">
        {value}
      </span>
    </div>
  );
}
