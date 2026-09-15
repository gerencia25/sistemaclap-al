"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Category = {
  id: string;
  code: string;
  name: string;
  status: "Activo" | "Inactivo";
};

type MasterField = {
  id: string;
  category_code: string;
  field_key: string;
  field_label: string;
  field_type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "image"
    | "pdf";
  required: boolean;
  display_order: number;
  options: string[] | null;
  status: "Activo" | "Inactivo";
  created_at: string;
  updated_at: string;
  category: Category | null;
  products_count: number;
  used_values: string[];
  structure_locked: boolean;
};

const typeLabels: Record<
  MasterField["field_type"],
  string
> = {
  text: "Texto",
  textarea: "Texto largo",
  number: "Número",
  select: "Lista",
  image: "Imagen",
  pdf: "PDF",
};

type FormState = {
  category_code: string;
  field_key: string;
  field_label: string;
  field_type: MasterField["field_type"];
  required: boolean;
  display_order: number;
  options_text: string;
};

const emptyForm: FormState = {
  category_code: "",
  field_key: "",
  field_label: "",
  field_type: "text",
  required: false,
  display_order: 1,
  options_text: "",
};

export default function DatosMaestrosPage() {
  const { session } = useAuth();

  const [items, setItems] =
    useState<MasterField[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState<MasterField | null>(null);

  const [updatingItemId, setUpdatingItemId] =
    useState("");

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const apiUrl =
    "/api/configuracion/listas-parametros/codificacion/datos-maestros";

  const getHeaders = useCallback(() => {
    return {
      Authorization:
        `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    };
  }, [session?.access_token]);

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: getHeaders(),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudieron cargar los datos maestros.",
        );
      }

      setItems(result.data ?? []);
      setCategories(result.categories ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los datos maestros.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, session?.access_token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems =
    useMemo(() => {
      if (!selectedCategory) {
        return items;
      }

      return items.filter(
        (item) =>
          item.category_code ===
          selectedCategory,
      );
    }, [items, selectedCategory]);

  const protectedCount =
    filteredItems.filter(
      (item) => item.structure_locked,
    ).length;

  function formatOptions(
    options: string[] | null,
  ) {
    if (!options || options.length === 0) {
      return "—";
    }

    return options.join(" · ");
  }

  function getNextOrder(
    categoryCode: string,
  ) {
    const categoryItems =
      items.filter(
        (item) =>
          item.category_code ===
          categoryCode,
      );

    if (categoryItems.length === 0) {
      return 1;
    }

    return (
      Math.max(
        ...categoryItems.map(
          (item) => item.display_order,
        ),
      ) + 1
    );
  }

  function openNewForm() {
    setEditingItem(null);

    const selectedIsActive =
      categories.some(
        (category) =>
          category.code ===
            selectedCategory &&
          category.status === "Activo",
      );

    const defaultCategory =
      selectedIsActive
        ? selectedCategory
        : categories.find(
            (category) =>
              category.status === "Activo",
          )?.code ?? "";

    setForm({
      ...emptyForm,
      category_code:
        defaultCategory,
      display_order:
        getNextOrder(defaultCategory),
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (isSaving) return;

    setShowForm(false);
    setEditingItem(null);
    setForm(emptyForm);
  }

  function openEditForm(
    item: MasterField,
  ) {
    setEditingItem(item);

    setForm({
      category_code:
        item.category_code,
      field_key:
        item.field_key,
      field_label:
        item.field_label,
      field_type:
        item.field_type,
      required:
        item.required,
      display_order:
        item.display_order,
      options_text:
        Array.isArray(item.options)
          ? item.options.join("\n")
          : "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function handleFormCategoryChange(
    categoryCode: string,
  ) {
    setForm((current) => ({
      ...current,
      category_code:
        categoryCode,
      display_order:
        getNextOrder(categoryCode),
    }));
  }

  async function handleSave(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!session?.access_token) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const options =
        form.field_type === "select"
          ? form.options_text
              .split(/[\n,]+/)
              .map((value) =>
                value.trim(),
              )
              .filter(Boolean)
          : [];

      const response = await fetch(
        apiUrl,
        {
          method:
            editingItem
              ? "PATCH"
              : "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            ...(editingItem
              ? { id: editingItem.id }
              : {}),
            category_code:
              form.category_code,
            field_key:
              form.field_key,
            field_label:
              form.field_label,
            field_type:
              form.field_type,
            required:
              form.required,
            display_order:
              form.display_order,
            options,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            (editingItem
              ? "No se pudo actualizar el dato maestro."
              : "No se pudo crear el dato maestro."),
        );
      }

      setSuccessMessage(
        editingItem
          ? `Dato maestro "${form.field_label}" actualizado correctamente.`
          : `Dato maestro "${form.field_label}" creado correctamente.`,
      );

      setShowForm(false);
      setEditingItem(null);
      setForm(emptyForm);

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingItem
            ? "No se pudo actualizar el dato maestro."
            : "No se pudo crear el dato maestro.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(
    item: MasterField,
  ) {
    if (!session?.access_token) return;

    const nextStatus =
      item.status === "Activo"
        ? "Inactivo"
        : "Activo";

    const confirmed =
      window.confirm(
        nextStatus === "Inactivo"
          ? `¿Deseas inactivar "${item.field_label}"? Ya no estará disponible para nuevos productos, pero conservará la información histórica existente.`
          : `¿Deseas activar nuevamente "${item.field_label}"?`,
      );

    if (!confirmed) return;

    setUpdatingItemId(item.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        apiUrl,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            id: item.id,
            status: nextStatus,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo cambiar el estado del dato maestro.",
        );
      }

      setSuccessMessage(
        nextStatus === "Activo"
          ? `Dato maestro "${item.field_label}" activado correctamente.`
          : `Dato maestro "${item.field_label}" inactivado correctamente.`,
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del dato maestro.",
      );
    } finally {
      setUpdatingItemId("");
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Listas y parámetros ·
            Codificación
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Datos maestros
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Define la información adicional que debe
            registrar cada producto según su categoría,
            como descripción técnica, imagen, ficha
            técnica, proceso productivo y precio.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          + Nuevo dato maestro
        </button>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-700">
            {successMessage}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="max-w-xl">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Categoría
          </label>

          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(
                event.target.value,
              )
            }
            disabled={isLoading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#07076b]"
          >
            <option value="">
              Todas las categorías
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.code}
              >
                {category.code} ·{" "}
                {category.name}
                {category.status === "Inactivo"
                  ? " · Inactiva"
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Campos visibles
          </p>

          <p className="mt-2 text-3xl font-bold text-[#07076b]">
            {filteredItems.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Activos
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {
              filteredItems.filter(
                (item) =>
                  item.status === "Activo",
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Estructura protegida
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-700">
            {protectedCount}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Campos configurados
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {filteredItems.length} campo
            {filteredItems.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Cargando datos maestros...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-gray-900">
              No hay campos configurados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">
                    Categoría
                  </th>

                  <th className="px-5 py-3">
                    Orden
                  </th>

                  <th className="px-5 py-3">
                    Campo
                  </th>

                  <th className="px-5 py-3">
                    Clave técnica
                  </th>

                  <th className="px-5 py-3">
                    Tipo
                  </th>

                  <th className="px-5 py-3">
                    Opciones
                  </th>

                  <th className="px-5 py-3">
                    Uso
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
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#07076b]">
                        {item.category_code}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {item.category?.name ?? "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-gray-600">
                      {item.display_order}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {item.field_label}
                      </div>

                      {item.required && (
                        <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Obligatorio
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {item.field_key}
                      </code>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {typeLabels[item.field_type] ??
                        item.field_type}
                    </td>

                    <td className="max-w-[300px] px-5 py-4 text-sm leading-6 text-gray-600">
                      {formatOptions(item.options)}
                    </td>

                    <td className="px-5 py-4">
                      {item.structure_locked ? (
                        <div>
                          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Protegido
                          </span>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.products_count} producto
                            {item.products_count === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          Sin uso
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          item.status === "Activo"
                            ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                        }
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(item)
                          }
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleStatus(item)
                          }
                          disabled={
                            updatingItemId ===
                            item.id
                          }
                          className={
                            item.status === "Activo"
                              ? "rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                              : "rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                          }
                        >
                          {updatingItemId ===
                          item.id
                            ? "Guardando..."
                            : item.status ===
                                "Activo"
                              ? "Inactivar"
                              : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#07076b]">
                  Configuración · Codificación
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {editingItem
                    ? "Editar dato maestro"
                    : "Nuevo dato maestro"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Categoría
                </label>

                <select
                  value={form.category_code}
                  onChange={(event) =>
                    handleFormCategoryChange(
                      event.target.value,
                    )
                  }
                  disabled={
                    Boolean(
                      editingItem?.structure_locked,
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#07076b] disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">
                    Selecciona una categoría
                  </option>

                  {categories
                    .filter(
                      (category) =>
                        category.status === "Activo",
                    )
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.code}
                      >
                        {category.code} ·{" "}
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              {editingItem?.structure_locked && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Estructura protegida
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Este campo ya tiene información registrada en{" "}
                    {editingItem.products_count} producto
                    {editingItem.products_count === 1
                      ? ""
                      : "s"}
                    . Por seguridad no puedes cambiar su categoría,
                    clave técnica ni tipo. Sí puedes actualizar el
                    nombre visible, orden, obligatoriedad, estado y,
                    cuando corresponda, agregar opciones a la lista.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Clave técnica
                  </label>

                  <input
                    value={form.field_key}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        field_key:
                          event.target.value
                            .toLowerCase()
                            .replace(
                              /[^a-z0-9_]/g,
                              "_",
                            ),
                      }))
                    }
                    disabled={
                      Boolean(
                        editingItem?.structure_locked,
                      )
                    }
                    placeholder="ej. peso_neto"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#07076b] disabled:bg-gray-100 disabled:text-gray-500"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Identificador interno. Usa minúsculas y guion bajo.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Nombre visible
                  </label>

                  <input
                    value={form.field_label}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        field_label:
                          event.target.value,
                      }))
                    }
                    placeholder="Ej. Peso neto"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#07076b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Tipo
                  </label>

                  <select
                    value={form.field_type}
                    disabled={
                      Boolean(
                        editingItem?.structure_locked,
                      )
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        field_type:
                          event.target.value as MasterField["field_type"],
                        options_text:
                          event.target.value ===
                          "select"
                            ? current.options_text
                            : "",
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#07076b] disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="text">
                      Texto
                    </option>
                    <option value="textarea">
                      Texto largo
                    </option>
                    <option value="number">
                      Número
                    </option>
                    <option value="select">
                      Lista
                    </option>
                    <option value="image">
                      Imagen
                    </option>
                    <option value="pdf">
                      PDF
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Orden
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.display_order}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        display_order:
                          Number(
                            event.target.value,
                          ),
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#07076b]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      required:
                        event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Campo obligatorio
                  </p>

                  <p className="text-xs text-gray-500">
                    El producto deberá registrar este dato.
                  </p>
                </div>
              </label>

              {form.field_type === "select" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Opciones de la lista
                  </label>

                  <textarea
                    value={form.options_text}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        options_text:
                          event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder={"Inyección\nSoplado\nExtrusión"}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#07076b]"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Escribe una opción por línea. También puedes separarlas por coma.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  {editingItem
                    ? "Edición controlada"
                    : "Estado inicial: Activo"}
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-700">
                  {editingItem
                    ? "Los cambios conservarán la trazabilidad de los datos maestros existentes."
                    : "El nuevo campo quedará disponible para productos de la categoría seleccionada."}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !form.category_code ||
                    !form.field_key.trim() ||
                    !form.field_label.trim() ||
                    form.display_order < 1 ||
                    (form.field_type ===
                      "select" &&
                      !form.options_text.trim())
                  }
                  className="rounded-xl bg-[#07076b] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving
                    ? "Guardando..."
                    : editingItem
                      ? "Guardar cambios"
                      : "Crear dato maestro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
        <p className="text-sm font-semibold text-amber-800">
          Protección de datos históricos
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-800/80">
          Cuando un campo ya contiene información en
          productos, su categoría, clave técnica y tipo
          quedan protegidos para evitar perder la relación
          con los datos históricos almacenados.
        </p>
      </section>
    </div>
  );
}
