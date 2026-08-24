"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type BusinessLine = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "Activo" | "Inactivo";
  display_order: number;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id: string | null;
  code: string;
  name: string;
  description: string;
  display_order: number;
};

const emptyForm: FormState = {
  id: null,
  code: "",
  name: "",
  description: "",
  display_order: 0,
};

export default function LineasNegocioPage() {
  const { session } = useAuth();

  const [items, setItems] = useState<BusinessLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const apiUrl =
    "/api/configuracion/listas-parametros/lineas-negocio";

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
          result.error || "No se pudieron cargar las líneas de negocio.",
        );
      }

      setItems(result.data ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las líneas de negocio.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, session?.access_token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function openNewForm() {
    const nextOrder =
      items.length === 0
        ? 1
        : Math.max(...items.map((item) => item.display_order)) + 1;

    setForm({
      ...emptyForm,
      display_order: nextOrder,
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function openEditForm(item: BusinessLine) {
    setForm({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      display_order: item.display_order,
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

      const response = await fetch(apiUrl, {
        method: isEditing ? "PATCH" : "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          ...(isEditing ? { id: form.id } : {}),
          code: form.code,
          name: form.name,
          description: form.description,
          display_order: form.display_order,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo guardar la línea de negocio.",
        );
      }

      setSuccessMessage(
        isEditing
          ? "Línea de negocio actualizada correctamente."
          : "Línea de negocio creada correctamente.",
      );

      setShowForm(false);
      setForm(emptyForm);

      await loadItems();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la línea de negocio.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(item: BusinessLine) {
    if (!session?.access_token) return;

    const nextStatus =
      item.status === "Activo" ? "Inactivo" : "Activo";

    const confirmed = window.confirm(
      nextStatus === "Inactivo"
        ? `¿Deseas inactivar "${item.name}"? Dejará de aparecer en nuevos formularios, pero conservará su historial.`
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
          result.error || "No se pudo cambiar el estado.",
        );
      }

      setSuccessMessage(
        nextStatus === "Activo"
          ? "Línea de negocio activada correctamente."
          : "Línea de negocio inactivada correctamente.",
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
            Configuración · Listas y parámetros
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Líneas de negocio
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra las líneas de negocio disponibles en los formularios de
            CLAP. Los cambios se reflejan automáticamente en los nuevos
            registros.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          + Nueva opción
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
            Opciones configuradas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {items.length} opción{items.length === 1 ? "" : "es"}
          </p>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Cargando líneas de negocio...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-gray-900">
              No hay líneas de negocio configuradas.
            </p>

            <button
              type="button"
              onClick={openNewForm}
              className="mt-4 rounded-xl bg-[#07076b] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Crear primera opción
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Orden</th>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4 font-medium text-gray-600">
                      {item.display_order}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-[#07076b]/10 px-2.5 py-1 text-xs font-bold text-[#07076b]">
                        {item.code}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {item.name}
                    </td>

                    <td className="max-w-md px-5 py-4 text-gray-500">
                      {item.description || "—"}
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
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#07076b]/30 hover:text-[#07076b]"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStatus(item)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            item.status === "Activo"
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
          Las opciones no se eliminan
        </p>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Si una línea deja de utilizarse, se marca como inactiva. Así deja de
          aparecer en nuevos formularios sin afectar cotizaciones históricas.
        </p>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Listas y parámetros
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {form.id
                    ? "Editar línea de negocio"
                    : "Nueva línea de negocio"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Código *">
                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={10}
                    className={inputClassName}
                    placeholder="Ej. CON"
                  />
                </Field>

                <Field label="Orden *">
                  <input
                    type="number"
                    min={0}
                    value={form.display_order}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        display_order: Number(event.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>

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
                  placeholder="Ej. Construcción"
                />
              </Field>

              <Field label="Descripción">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className={inputClassName}
                  placeholder="Descripción interna de la línea de negocio."
                />
              </Field>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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
                  className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving
                    ? "Guardando..."
                    : form.id
                      ? "Guardar cambios"
                      : "Crear opción"}
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