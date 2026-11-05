"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Dependencies = {
  groups: number;
  templates: number;
  master_fields: number;
  products: number;
  requests: number;
  total: number;
};

type ItemCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "Activo" | "Inactivo";

  can_be_sold: boolean;
  can_be_purchased: boolean;
  can_be_manufactured: boolean;
  tracks_inventory: boolean;
  tracks_lots: boolean;
  tracks_serials: boolean;

  created_at: string;
  dependencies: Dependencies;
  code_locked: boolean;
};

type FormState = {
  id: string | null;
  code: string;
  name: string;
  description: string;

  can_be_sold: boolean;
  can_be_purchased: boolean;
  can_be_manufactured: boolean;
  tracks_inventory: boolean;
  tracks_lots: boolean;
  tracks_serials: boolean;

  code_locked: boolean;
  dependencies: Dependencies | null;
};

const emptyForm: FormState = {
  id: null,
  code: "",
  name: "",
  description: "",

  can_be_sold: false,
  can_be_purchased: false,
  can_be_manufactured: false,
  tracks_inventory: false,
  tracks_lots: false,
  tracks_serials: false,

  code_locked: false,
  dependencies: null,
};

export default function CategoriasCodificacionPage() {
  const { session } = useAuth();

  const [items, setItems] = useState<ItemCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const apiUrl =
    "/api/configuracion/listas-parametros/codificacion/categorias";

  const getHeaders = useCallback(() => {
    return {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    };
  }, [session?.access_token]);

  const loadItems = useCallback(async () => {
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
            "No se pudieron cargar las categorías de codificación.",
        );
      }

      setItems(result.data ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las categorías de codificación.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, session?.access_token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function openNewForm() {
    setForm(emptyForm);
    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function openEditForm(item: ItemCategory) {
    setForm({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description ?? "",

      can_be_sold: item.can_be_sold,
      can_be_purchased: item.can_be_purchased,
      can_be_manufactured: item.can_be_manufactured,
      tracks_inventory: item.tracks_inventory,
      tracks_lots: item.tracks_lots,
      tracks_serials: item.tracks_serials,

      code_locked: item.code_locked,
      dependencies: item.dependencies,
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (isSaving) return;

    setShowForm(false);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!session?.access_token) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const isEditing = Boolean(form.id);

      const payload: Record<string, unknown> = {
        ...(isEditing ? { id: form.id } : {}),
        name: form.name,
        description: form.description,

        can_be_sold: form.can_be_sold,
        can_be_purchased: form.can_be_purchased,
        can_be_manufactured: form.can_be_manufactured,
        tracks_inventory: form.tracks_inventory,
        tracks_lots: form.tracks_lots,
        tracks_serials: form.tracks_serials,
      };

      if (!isEditing || !form.code_locked) {
        payload.code = form.code;
      }

      const response = await fetch(apiUrl, {
        method: isEditing ? "PATCH" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo guardar la categoría.",
        );
      }

      setSuccessMessage(
        isEditing
          ? "Categoría actualizada correctamente."
          : "Categoría creada correctamente.",
      );

      setShowForm(false);
      setForm(emptyForm);

      await loadItems();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la categoría.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(item: ItemCategory) {
    if (!session?.access_token) return;

    const nextStatus =
      item.status === "Activo"
        ? "Inactivo"
        : "Activo";

    const confirmed = window.confirm(
      nextStatus === "Inactivo"
        ? `¿Deseas inactivar "${item.name}"? Dejará de estar disponible para nuevas configuraciones y operaciones, pero conservará su historial.`
        : `¿Deseas activar nuevamente "${item.name}"?`,
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          id: item.id,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo cambiar el estado.",
        );
      }

      setSuccessMessage(
        nextStatus === "Activo"
          ? "Categoría activada correctamente."
          : "Categoría inactivada correctamente.",
      );

      await loadItems();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Listas y parámetros · Codificación
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Categorías
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra las categorías principales utilizadas para
            clasificar items y construir sus códigos dentro de CLAP.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          + Nueva categoría
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

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Categorías configuradas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {items.length} categoría
            {items.length === 1 ? "" : "s"}
          </p>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Cargando categorías...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-gray-900">
              No hay categorías configuradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">
                    Código
                  </th>

                  <th className="px-5 py-3">
                    Nombre
                  </th>

                  <th className="px-5 py-3">
                    Descripción
                  </th>

                  <th className="px-5 py-3">
                    Dependencias
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
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#07076b]/10 px-2.5 py-1 text-xs font-bold text-[#07076b]">
                          {item.code}
                        </span>

                        {item.code_locked && (
                          <span
                            title="El código técnico está protegido porque tiene información relacionada."
                            className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700"
                          >
                            Protegido
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {item.name}
                    </td>

                    <td className="max-w-[320px] px-5 py-4 text-gray-600">
                      {item.description || (
                        <span className="text-gray-400">
                          Sin descripción
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {item.dependencies.total > 0 ? (
                        <div>
                          <span className="font-semibold text-gray-900">
                            {item.dependencies.total}
                          </span>

                          <p className="mt-1 text-xs text-gray-500">
                            registro
                            {item.dependencies.total === 1
                              ? ""
                              : "s"}{" "}
                            relacionado
                            {item.dependencies.total === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          Sin dependencias
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
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
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleStatus(item)
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            item.status === "Activo"
                              ? "border-amber-200 text-amber-700"
                              : "border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {item.status === "Activo"
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

      <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <p className="text-sm font-semibold text-[#07076b]">
          Protección de códigos técnicos
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
          Cuando una categoría ya tenga grupos, plantillas,
          datos maestros, productos o información histórica
          relacionada, su código técnico quedará protegido.
          Podrás seguir modificando el nombre, descripción y
          estado sin afectar la trazabilidad.
        </p>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Codificación
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {form.id
                    ? "Editar categoría"
                    : "Nueva categoría"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <Field label="Código técnico *">
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  disabled={
                    Boolean(form.id) &&
                    form.code_locked
                  }
                  maxLength={10}
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                  placeholder="Ej. PTF"
                />
              </Field>

              {form.id && form.code_locked && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Código técnico protegido
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Este código ya tiene información relacionada
                    y no puede modificarse desde esta pantalla.
                  </p>

                  {form.dependencies &&
                    form.dependencies.total > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {form.dependencies.groups > 0 && (
                          <DependencyBadge
                            label="Grupos"
                            value={
                              form.dependencies.groups
                            }
                          />
                        )}

                        {form.dependencies.templates >
                          0 && (
                          <DependencyBadge
                            label="Plantillas"
                            value={
                              form.dependencies.templates
                            }
                          />
                        )}

                        {form.dependencies.master_fields >
                          0 && (
                          <DependencyBadge
                            label="Datos maestros"
                            value={
                              form.dependencies
                                .master_fields
                            }
                          />
                        )}

                        {form.dependencies.products > 0 && (
                          <DependencyBadge
                            label="Productos"
                            value={
                              form.dependencies.products
                            }
                          />
                        )}

                        {form.dependencies.requests > 0 && (
                          <DependencyBadge
                            label="Solicitudes"
                            value={
                              form.dependencies.requests
                            }
                          />
                        )}
                      </div>
                    )}
                </div>
              )}

              <Field label="Nombre *">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={inputClassName}
                  placeholder="Ej. Producto terminado farmacéutico"
                />
              </Field>

              <Field label="Descripción">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }))
                  }
                  rows={3}
                  className={inputClassName}
                  placeholder="Describe el uso de esta categoría."
                />
              </Field>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Comportamiento operativo
                  </p>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Define cómo se comportarán por defecto los productos
                    creados dentro de esta categoría.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <OperationalCheck
                    label="Se puede vender"
                    description="Disponible para procesos comerciales."
                    checked={form.can_be_sold}
                    onChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        can_be_sold: checked,
                      }))
                    }
                  />

                  <OperationalCheck
                    label="Se puede comprar"
                    description="Puede adquirirse a proveedores."
                    checked={form.can_be_purchased}
                    onChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        can_be_purchased: checked,
                      }))
                    }
                  />

                  <OperationalCheck
                    label="Se puede fabricar"
                    description="Puede producirse internamente."
                    checked={form.can_be_manufactured}
                    onChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        can_be_manufactured: checked,
                      }))
                    }
                  />

                  <OperationalCheck
                    label="Controla inventario"
                    description="Genera existencias y movimientos de almacén."
                    checked={form.tracks_inventory}
                    onChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        tracks_inventory: checked,

                        /*
                         * Si deja de controlar inventario,
                         * tampoco tiene sentido controlar
                         * lotes o seriales.
                         */
                        tracks_lots: checked
                          ? current.tracks_lots
                          : false,

                        tracks_serials: checked
                          ? current.tracks_serials
                          : false,
                      }))
                    }
                  />

                  <OperationalCheck
                    label="Controla lotes"
                    description="Permite trazabilidad por número de lote."
                    checked={form.tracks_lots}
                    disabled={!form.tracks_inventory}
                    onChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        tracks_lots: checked,
                      }))
                    }
                  />

                  <OperationalCheck
                    label="Controla seriales"
                    description="Permite trazabilidad individual por serial."
                    checked={form.tracks_serials}
                    disabled={!form.tracks_inventory}
                    onChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        tracks_serials: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !form.code.trim() ||
                    !form.name.trim()
                  }
                  className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isSaving
                    ? "Guardando..."
                    : form.id
                      ? "Guardar cambios"
                      : "Crear categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function OperationalCheck({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
        checked
          ? "border-[#07076b]/20 bg-white"
          : "border-gray-200 bg-white"
      } ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-[#07076b]/30"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 h-4 w-4 accent-[#07076b]"
      />

      <span>
        <span className="block text-sm font-semibold text-gray-900">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function DependencyBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 font-medium text-amber-800 shadow-sm">
      {label}: {value}
    </span>
  );
}
