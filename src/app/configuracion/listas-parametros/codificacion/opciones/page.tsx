"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type ClassificationOption = {
  id: string;
  template_id: string;
  field_key: string;
  code: string;
  name: string;
  status: "Activo" | "Inactivo";
  created_at: string;
};

type TemplateField = {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  required: boolean;
  display_order: number;
  code_length: number;
  contributes_to_code: boolean;
  contributes_to_name: boolean;
  allow_new_options: boolean;
  option_catalog_id: string | null;
  status: "Activo" | "Inactivo";
  options: ClassificationOption[];
  options_count: number;
  active_options_count: number;
};

type ClassificationTemplate = {
  id: string;
  full_code: string;
  name: string;
  status: "Activo" | "Inactivo";
  numeric_code_length: number;
  fields: TemplateField[];
  fields_count: number;
  options_count: number;
};

export default function OpcionesClasificacionPage() {
  const { session } = useAuth();

  const [templates, setTemplates] =
    useState<ClassificationTemplate[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] =
    useState("");

  const [selectedFieldKey, setSelectedFieldKey] =
    useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [updatingOptionId, setUpdatingOptionId] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [showNewOption, setShowNewOption] =
    useState(false);

  const [newOptionName, setNewOptionName] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    editingOption,
    setEditingOption,
  ] =
    useState<ClassificationOption | null>(
      null,
    );

  const [
    editOptionName,
    setEditOptionName,
  ] =
    useState("");

  const apiUrl =
    "/api/configuracion/listas-parametros/codificacion/opciones";

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
            "No se pudieron cargar las opciones de clasificación.",
        );
      }

      setTemplates(result.data ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las opciones de clasificación.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, session?.access_token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedTemplate =
    useMemo(() => {
      return (
        templates.find(
          (template) =>
            template.id === selectedTemplateId,
        ) ?? null
      );
    }, [templates, selectedTemplateId]);

  const selectedField =
    useMemo(() => {
      if (!selectedTemplate) return null;

      return (
        selectedTemplate.fields.find(
          (field) =>
            field.field_key === selectedFieldKey,
        ) ?? null
      );
    }, [selectedTemplate, selectedFieldKey]);

  const filteredOptions =
    useMemo(() => {
      if (!selectedField) {
        return [];
      }

      const query =
        searchTerm
          .trim()
          .toUpperCase();

      if (!query) {
        return selectedField.options;
      }

      return selectedField.options.filter(
        (option) =>
          option.code
            .toUpperCase()
            .includes(query) ||
          option.name
            .toUpperCase()
            .includes(query),
      );
    }, [
      selectedField,
      searchTerm,
    ]);

  function handleTemplateChange(
    templateId: string,
  ) {
    setSelectedTemplateId(templateId);
    setSelectedFieldKey("");
    setShowNewOption(false);
    setNewOptionName("");
    setSearchTerm("");
    setEditingOption(null);
    setEditOptionName("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleFieldChange(fieldKey: string) {
    setSelectedFieldKey(fieldKey);
    setShowNewOption(false);
    setNewOptionName("");
    setSearchTerm("");
    setEditingOption(null);
    setEditOptionName("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openNewOption() {
    setNewOptionName("");
    setErrorMessage("");
    setSuccessMessage("");
    setShowNewOption(true);
  }

  function closeNewOption() {
    if (isSaving) return;

    setShowNewOption(false);
    setNewOptionName("");
  }

  async function handleCreateOption(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !session?.access_token ||
      !selectedTemplate ||
      !selectedField
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          field_key: selectedField.field_key,
          name: newOptionName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo crear la opción.",
        );
      }

      setSuccessMessage(
        `Opción "${result.data?.name ?? newOptionName}" creada correctamente con código ${result.data?.code ?? ""}.`,
      );

      setShowNewOption(false);
      setNewOptionName("");

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la opción.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openEditOption(
    option: ClassificationOption,
  ) {
    setEditingOption(option);
    setEditOptionName(option.name);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeEditOption() {
    if (isSaving) return;

    setEditingOption(null);
    setEditOptionName("");
  }

  async function handleEditOption(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !session?.access_token ||
      !editingOption ||
      !selectedField
    ) {
      return;
    }

    const normalizedName =
      editOptionName
        .trim()
        .toUpperCase();

    if (!normalizedName) {
      setErrorMessage(
        "El nombre no puede quedar vacío.",
      );
      return;
    }

    if (
      selectedField.option_catalog_id
    ) {
      const confirmed =
        window.confirm(
          "Esta opción pertenece a un catálogo TRANSVERSAL.\n\n" +
          "El cambio de nombre se reflejará en todas las clasificaciones vinculadas a este catálogo.\n\n" +
          "Los productos ya creados no cambiarán automáticamente de nombre ni se modificarán en SIIGO.\n\n" +
          "¿Deseas continuar?",
        );

      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        apiUrl,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            id: editingOption.id,
            name: normalizedName,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo editar la opción.",
        );
      }

      setSuccessMessage(
        result.scope === "Transversal"
          ? `Opción transversal "${normalizedName}" actualizada en todas las clasificaciones vinculadas.`
          : `Opción "${normalizedName}" actualizada correctamente.`,
      );

      setEditingOption(null);
      setEditOptionName("");

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo editar la opción.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleOptionStatus(
    option: ClassificationOption,
  ) {
    if (!session?.access_token) return;

    const nextStatus =
      option.status === "Activo"
        ? "Inactivo"
        : "Activo";

    const scopeWarning =
      selectedField?.option_catalog_id
        ? "\n\n⚠️ Esta opción es TRANSVERSAL. El cambio aplicará a todas las clasificaciones vinculadas."
        : "";

    const confirmed = window.confirm(
      (
        nextStatus === "Inactivo"
          ? `¿Deseas inactivar "${option.name}"? Ya no estará disponible para nuevas codificaciones, pero conservará su historial y su código ${option.code}.`
          : `¿Deseas activar nuevamente "${option.name}"?`
      ) + scopeWarning,
    );

    if (!confirmed) return;

    setUpdatingOptionId(option.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          id: option.id,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo cambiar el estado de la opción.",
        );
      }

      setSuccessMessage(
        nextStatus === "Activo"
          ? `Opción "${option.name}" activada correctamente.`
          : `Opción "${option.name}" inactivada correctamente.`,
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado de la opción.",
      );
    } finally {
      setUpdatingOptionId("");
    }
  }

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          Configuración · Listas y parámetros ·
          Codificación
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
          Opciones de clasificación
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Administra los valores codificados utilizados
          por las plantillas, como tipo, boca,
          capacidad, color y material.
        </p>
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Plantilla
            </label>

            <select
              value={selectedTemplateId}
              onChange={(event) =>
                handleTemplateChange(
                  event.target.value,
                )
              }
              disabled={isLoading}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#07076b]"
            >
              <option value="">
                Selecciona una plantilla
              </option>

              {templates.map((template) => (
                <option
                  key={template.id}
                  value={template.id}
                >
                  {template.full_code} ·{" "}
                  {template.name}
                  {template.status === "Inactivo"
                    ? " · Inactiva"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Campo
            </label>

            <select
              value={selectedFieldKey}
              onChange={(event) =>
                handleFieldChange(
                  event.target.value,
                )
              }
              disabled={
                !selectedTemplate ||
                selectedTemplate.fields.length === 0
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#07076b] disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                Selecciona un campo
              </option>

              {selectedTemplate?.fields.map(
                (field) => (
                  <option
                    key={field.id}
                    value={field.field_key}
                  >
                    {field.field_label} ·{" "}
                    {field.code_length} dígito
                    {field.code_length === 1
                      ? ""
                      : "s"}
                    {field.status === "Inactivo"
                      ? " · Inactivo"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {selectedTemplate &&
          selectedTemplate.fields.length === 0 && (
            <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                Esta plantilla no tiene campos de tipo
                lista configurados.
              </p>
            </div>
          )}
      </section>

      {selectedTemplate && selectedField && (
        <>
          <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selectedTemplate.full_code} ·{" "}
                {selectedField.field_label}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={
                    selectedField.option_catalog_id
                      ? "inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                      : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                  }
                >
                  {selectedField.option_catalog_id
                    ? "TRANSVERSAL"
                    : "LOCAL"}
                </span>

                <span className="text-xs text-gray-500">
                  {selectedField.option_catalog_id
                    ? "Los cambios aplican a todas las clasificaciones vinculadas."
                    : "Los cambios aplican únicamente a esta clasificación."}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                {selectedField.options_count} opción
                {selectedField.options_count === 1
                  ? ""
                  : "es"}{" "}
                configurada
                {selectedField.options_count === 1
                  ? ""
                  : "s"}{" "}
                · Código de{" "}
                {selectedField.code_length} dígito
                {selectedField.code_length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={openNewOption}
              disabled={
                selectedField.status !== "Activo" ||
                !selectedField.allow_new_options
              }
              className="inline-flex items-center justify-center rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              + Nueva opción
            </button>
          </section>

          {!selectedField.allow_new_options && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                Este campo está configurado para no
                permitir nuevas opciones.
              </p>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Opciones configuradas
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {selectedField.active_options_count}{" "}
                activa
                {selectedField.active_options_count === 1
                  ? ""
                  : "s"}{" "}
                de {selectedField.options_count}
              </p>

              <div className="mt-4 max-w-md">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Buscar por código o nombre
                </label>

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                  placeholder="Ej. PL-GL0361, DORADO, 0004..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#07076b]"
                />
              </div>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold text-gray-900">
                  {searchTerm
                    ? "No hay coincidencias."
                    : "No hay opciones configuradas."}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm
                    ? "Prueba con otro código o nombre."
                    : "Puedes crear la primera opción para este campo."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3">
                        Código
                      </th>

                      <th className="px-5 py-3">
                        Nombre
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
                    {filteredOptions.map(
                      (option) => (
                        <tr
                          key={option.id}
                          className="hover:bg-gray-50/70"
                        >
                          <td className="px-5 py-4">
                            <span className="font-mono font-semibold text-[#07076b]">
                              {option.code}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-medium text-gray-900">
                                {option.name}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditOption(
                                    option,
                                  )
                                }
                                className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                              >
                                Editar
                              </button>

                              <span
                                className={
                                  selectedField.option_catalog_id
                                    ? "rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700"
                                    : "rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500"
                                }
                              >
                                {selectedField.option_catalog_id
                                  ? "Transversal"
                                  : "Local"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={
                                option.status ===
                                "Activo"
                                  ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                                  : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                              }
                            >
                              {option.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                toggleOptionStatus(
                                  option,
                                )
                              }
                              disabled={
                                updatingOptionId ===
                                option.id
                              }
                              className={
                                option.status ===
                                "Activo"
                                  ? "rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  : "rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                              }
                            >
                              {updatingOptionId ===
                              option.id
                                ? "Guardando..."
                                : option.status ===
                                    "Activo"
                                  ? "Inactivar"
                                  : "Activar"}
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {!isLoading &&
        (!selectedTemplate || !selectedField) && (
          <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
            <p className="font-semibold text-gray-900">
              Selecciona una plantilla y un campo.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Allí podrás consultar y administrar sus
              opciones codificadas.
            </p>
          </section>
        )}

      {editingOption &&
        selectedTemplate &&
        selectedField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#07076b]">
                    {selectedTemplate.full_code} ·{" "}
                    {selectedField.field_label}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-gray-900">
                    Editar opción
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeEditOption}
                  disabled={isSaving}
                  className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>

              <form
                onSubmit={handleEditOption}
                className="mt-6 space-y-5"
              >
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Código
                  </p>

                  <p className="mt-1 font-mono text-lg font-bold text-[#07076b]">
                    {editingOption.code}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    El código no se puede editar. Así se protege la trazabilidad de productos y codificaciones históricas.
                  </p>
                </div>

                {selectedField.option_catalog_id ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-800">
                      Alcance transversal
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-700">
                      Este nombre se utiliza en todas las clasificaciones vinculadas al mismo catálogo.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-bold text-gray-700">
                      Alcance local
                    </p>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Este cambio aplica únicamente a {selectedTemplate.full_code}.
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Nombre
                  </label>

                  <input
                    value={editOptionName}
                    onChange={(event) =>
                      setEditOptionName(
                        event.target.value,
                      )
                    }
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#07076b]"
                  />
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs leading-5 text-amber-800">
                    Esta corrección afecta futuras codificaciones. Los productos que ya fueron creados conservan el nombre con el que fueron registrados y no se renombran automáticamente en SIIGO.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeEditOption}
                    disabled={isSaving}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-[#07076b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isSaving
                      ? "Guardando..."
                      : "Guardar corrección"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {showNewOption &&
        selectedTemplate &&
        selectedField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#07076b]">
                    {selectedTemplate.full_code} ·{" "}
                    {selectedField.field_label}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-gray-900">
                    Nueva opción
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeNewOption}
                  disabled={isSaving}
                  className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>

              <form
                onSubmit={handleCreateOption}
                className="mt-6 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Nombre de la opción
                  </label>

                  <input
                    value={newOptionName}
                    onChange={(event) =>
                      setNewOptionName(
                        event.target.value,
                      )
                    }
                    autoFocus
                    placeholder="Ej. Azul"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#07076b]"
                  />
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-sm font-semibold text-blue-800">
                    Código automático
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    CLAP asignará automáticamente el
                    siguiente código disponible de{" "}
                    {selectedField.code_length} dígito
                    {selectedField.code_length === 1
                      ? ""
                      : "s"}{" "}
                    y no reutilizará códigos históricos.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeNewOption}
                    disabled={isSaving}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSaving ||
                      !newOptionName.trim()
                    }
                    className="rounded-xl bg-[#07076b] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {isSaving
                      ? "Creando..."
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
