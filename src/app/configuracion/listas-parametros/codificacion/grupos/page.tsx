"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Category = {
  id: string;
  code: string;
  name: string;
  status: "Activo" | "Inactivo";
};

type Dependencies = {
  subgroups: number;
  templates: number;
  products: number;
  total: number;
};

type ItemGroup = {
  id: string;
  category_id: string;
  code: string;
  name: string;
  status: "Activo" | "Inactivo";
  created_at: string;
  category: Category;
  dependencies: Dependencies;
  structure_locked: boolean;
};

type FormState = {
  id: string | null;
  category_id: string;
  code: string;
  name: string;
  structure_locked: boolean;
  dependencies: Dependencies | null;
};

const emptyForm: FormState = {
  id: null,
  category_id: "",
  code: "",
  name: "",
  structure_locked: false,
  dependencies: null,
};

export default function GruposCodificacionPage() {
  const { session } = useAuth();

  const [items, setItems] = useState<ItemGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const apiUrl =
    "/api/configuracion/listas-parametros/codificacion/grupos";

  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.status === "Activo",
      ),
    [categories],
  );

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
            "No se pudieron cargar los grupos de codificación.",
        );
      }

      setItems(result.data ?? []);
      setCategories(result.categories ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los grupos de codificación.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, session?.access_token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function openNewForm() {
    setForm({
      ...emptyForm,
      category_id:
        activeCategories.length === 1
          ? activeCategories[0].id
          : "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function openEditForm(item: ItemGroup) {
    setForm({
      id: item.id,
      category_id: item.category_id,
      code: item.code,
      name: item.name,
      structure_locked: item.structure_locked,
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
      };

      if (!isEditing || !form.structure_locked) {
        payload.category_id = form.category_id;
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
            "No se pudo guardar el grupo.",
        );
      }

      setSuccessMessage(
        isEditing
          ? "Grupo actualizado correctamente."
          : "Grupo creado correctamente.",
      );

      setShowForm(false);
      setForm(emptyForm);

      await loadItems();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el grupo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(item: ItemGroup) {
    if (!session?.access_token) return;

    const nextStatus =
      item.status === "Activo"
        ? "Inactivo"
        : "Activo";

    const confirmed = window.confirm(
      nextStatus === "Inactivo"
        ? `¿Deseas inactivar "${item.name}"? Dejará de estar disponible para nuevas configuraciones, pero conservará su historial.`
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
          ? "Grupo activado correctamente."
          : "Grupo inactivado correctamente.",
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
            Grupos
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra los grupos pertenecientes a cada categoría de
            codificación y controla su estructura antes de crear productos.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          + Nuevo grupo
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
            Grupos configurados
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {items.length} grupo
            {items.length === 1 ? "" : "s"}
          </p>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Cargando grupos...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-gray-900">
              No hay grupos configurados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Categoría</th>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Dependencias</th>
                  <th className="px-5 py-3">Estado</th>
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
                      <div>
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                          {item.category.code}
                        </span>

                        <p className="mt-2 text-xs text-gray-500">
                          {item.category.name}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#07076b]/10 px-2.5 py-1 text-xs font-bold text-[#07076b]">
                          {item.code}
                        </span>

                        {item.structure_locked && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                            Protegido
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {item.name}
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
                          onClick={() => openEditForm(item)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStatus(item)}
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
          Protección de la estructura
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
          Cuando un grupo ya tenga subgrupos, plantillas o productos
          relacionados, su categoría padre y su código técnico quedarán
          protegidos. El nombre y el estado podrán seguir administrándose.
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
                    ? "Editar grupo"
                    : "Nuevo grupo"}
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
              <Field label="Categoría *">
                <select
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  disabled={
                    Boolean(form.id) &&
                    form.structure_locked
                  }
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                >
                  <option value="">
                    Selecciona una categoría
                  </option>

                  {categories
                    .filter(
                      (category) =>
                        category.status === "Activo" ||
                        category.id === form.category_id,
                    )
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.code} · {category.name}
                        {category.status === "Inactivo"
                          ? " · Inactiva"
                          : ""}
                      </option>
                    ))}
                </select>
              </Field>

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
                    form.structure_locked
                  }
                  maxLength={10}
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                  placeholder="Ej. FM"
                />
              </Field>

              {form.id && form.structure_locked && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Estructura protegida
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Este grupo ya tiene información relacionada. Su
                    categoría padre y código técnico no pueden modificarse.
                  </p>

                  {form.dependencies &&
                    form.dependencies.total > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {form.dependencies.subgroups > 0 && (
                          <DependencyBadge
                            label="Subgrupos"
                            value={form.dependencies.subgroups}
                          />
                        )}

                        {form.dependencies.templates > 0 && (
                          <DependencyBadge
                            label="Plantillas"
                            value={form.dependencies.templates}
                          />
                        )}

                        {form.dependencies.products > 0 && (
                          <DependencyBadge
                            label="Productos"
                            value={form.dependencies.products}
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
                  placeholder="Ej. FARMA"
                />
              </Field>

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
                    !form.category_id ||
                    !form.code.trim() ||
                    !form.name.trim()
                  }
                  className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isSaving
                    ? "Guardando..."
                    : form.id
                      ? "Guardar cambios"
                      : "Crear grupo"}
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
