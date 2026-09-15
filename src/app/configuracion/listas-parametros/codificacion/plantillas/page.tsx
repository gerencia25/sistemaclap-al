"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type HierarchyItem = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type Category = HierarchyItem;

type Group = HierarchyItem & {
  category_id: string;
};

type Subgroup = HierarchyItem & {
  group_id: string;
};

type Hierarchy = {
  categories: Category[];
  groups: Group[];
  subgroups: Subgroup[];
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
  status: string;
  created_at: string | null;
  options_count: number;
};

type Template = {
  id: string;
  category_code: string;
  group_code: string;
  subgroup_code: string;
  full_code: string | null;
  name: string | null;
  code_pattern: string | null;
  name_pattern: string | null;
  numeric_code_length: number;
  status: "Activo" | "Inactivo";
  created_at: string | null;
  updated_at: string | null;

  category: HierarchyItem | null;
  group: HierarchyItem | null;
  subgroup: HierarchyItem | null;

  fields: TemplateField[];
  fields_count: number;
  products_count: number;
  structure_locked: boolean;
  calculated_numeric_code_length: number;
  length_is_consistent: boolean;
};

type NewField = {
  local_id: string;
  field_key: string;
  field_label: string;
  field_type: "select" | "number";
  required: boolean;
  code_length: number;
  contributes_to_code: boolean;
  contributes_to_name: boolean;
  allow_new_options: boolean;
};

type NewTemplateForm = {
  category_id: string;
  group_id: string;
  subgroup_id: string;
  fields: NewField[];
};

function createEmptyField(): NewField {
  return {
    local_id: crypto.randomUUID(),
    field_key: "",
    field_label: "",
    field_type: "select",
    required: true,
    code_length: 2,
    contributes_to_code: true,
    contributes_to_name: true,
    allow_new_options: true,
  };
}

function createEmptyForm(): NewTemplateForm {
  return {
    category_id: "",
    group_id: "",
    subgroup_id: "",
    fields: [createEmptyField()],
  };
}

export default function PlantillasCodificacionPage() {
  const { session } = useAuth();

  const [items, setItems] = useState<Template[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy>({
    categories: [],
    groups: [],
    subgroups: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedTemplate, setSelectedTemplate] =
    useState<Template | null>(null);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [form, setForm] =
    useState<NewTemplateForm>(
      createEmptyForm(),
    );

  const apiUrl =
    "/api/configuracion/listas-parametros/codificacion/plantillas";

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
            "No se pudieron cargar las plantillas de codificación.",
        );
      }

      setItems(result.data ?? []);

      setHierarchy({
        categories:
          result.hierarchy?.categories ?? [],
        groups:
          result.hierarchy?.groups ?? [],
        subgroups:
          result.hierarchy?.subgroups ?? [],
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las plantillas de codificación.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, session?.access_token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const activeCategories = useMemo(
    () =>
      hierarchy.categories.filter(
        (item) => item.status === "Activo",
      ),
    [hierarchy.categories],
  );

  const availableGroups = useMemo(
    () =>
      hierarchy.groups.filter(
        (item) =>
          item.status === "Activo" &&
          item.category_id === form.category_id,
      ),
    [hierarchy.groups, form.category_id],
  );

  const availableSubgroups = useMemo(
    () =>
      hierarchy.subgroups.filter(
        (item) =>
          item.status === "Activo" &&
          item.group_id === form.group_id,
      ),
    [hierarchy.subgroups, form.group_id],
  );

  const selectedCategory =
    hierarchy.categories.find(
      (item) => item.id === form.category_id,
    ) ?? null;

  const selectedGroup =
    hierarchy.groups.find(
      (item) => item.id === form.group_id,
    ) ?? null;

  const selectedSubgroup =
    hierarchy.subgroups.find(
      (item) => item.id === form.subgroup_id,
    ) ?? null;

  const previewFullCode =
    selectedCategory &&
    selectedGroup &&
    selectedSubgroup
      ? `${selectedCategory.code}-${selectedGroup.code}-${selectedSubgroup.code}`
      : "";

  const templateAlreadyExists =
    previewFullCode !== "" &&
    items.some(
      (item) =>
        item.full_code === previewFullCode,
    );

  const numericLength =
    form.fields
      .filter(
        (field) =>
          field.contributes_to_code,
      )
      .reduce(
        (total, field) =>
          total +
          Number(field.code_length || 0),
        0,
      );

  const codePattern =
    form.fields
      .filter(
        (field) =>
          field.contributes_to_code &&
          field.field_key.trim(),
      )
      .map(
        (field) =>
          `{${field.field_key
            .trim()
            .toLowerCase()}}`,
      )
      .join("");

  const namePattern =
    form.fields
      .filter(
        (field) =>
          field.contributes_to_name &&
          field.field_key.trim(),
      )
      .map((field) => {
        const key =
          field.field_key
            .trim()
            .toLowerCase();

        return field.field_type === "select"
          ? `{${key}_name}`
          : `{${key}}`;
      })
      .join(" ");

  function openCreateForm() {
    setForm(createEmptyForm());
    setErrorMessage("");
    setSuccessMessage("");
    setShowCreateForm(true);
  }

  function closeCreateForm() {
    if (isSaving) return;

    setShowCreateForm(false);
    setForm(createEmptyForm());
  }

  function updateField(
    localId: string,
    updates: Partial<NewField>,
  ) {
    setForm((current) => ({
      ...current,
      fields: current.fields.map(
        (field) =>
          field.local_id === localId
            ? {
                ...field,
                ...updates,
              }
            : field,
      ),
    }));
  }

  function addField() {
    setForm((current) => ({
      ...current,
      fields: [
        ...current.fields,
        createEmptyField(),
      ],
    }));
  }

  function removeField(localId: string) {
    setForm((current) => ({
      ...current,
      fields:
        current.fields.length === 1
          ? current.fields
          : current.fields.filter(
              (field) =>
                field.local_id !== localId,
            ),
    }));
  }

  function moveField(
    index: number,
    direction: -1 | 1,
  ) {
    setForm((current) => {
      const targetIndex =
        index + direction;

      if (
        targetIndex < 0 ||
        targetIndex >=
          current.fields.length
      ) {
        return current;
      }

      const fields = [
        ...current.fields,
      ];

      const currentField =
        fields[index];

      fields[index] =
        fields[targetIndex];

      fields[targetIndex] =
        currentField;

      return {
        ...current,
        fields,
      };
    });
  }

  async function handleCreate(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!session?.access_token) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          category_id:
            form.category_id,
          group_id:
            form.group_id,
          subgroup_id:
            form.subgroup_id,
          fields: form.fields.map(
            (field, index) => ({
              field_key:
                field.field_key,
              field_label:
                field.field_label,
              field_type:
                field.field_type,
              required:
                field.required,
              display_order:
                index + 1,
              code_length:
                field.code_length,
              contributes_to_code:
                field.contributes_to_code,
              contributes_to_name:
                field.contributes_to_name,
              allow_new_options:
                field.field_type ===
                "select"
                  ? field.allow_new_options
                  : false,
            }),
          ),
        }),
      });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo crear la plantilla.",
        );
      }

      setSuccessMessage(
        `Plantilla ${result.data?.full_code ?? ""} creada correctamente en estado Inactivo.`,
      );

      setShowCreateForm(false);
      setForm(createEmptyForm());

      await loadItems();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la plantilla.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const formIsValid =
    Boolean(form.category_id) &&
    Boolean(form.group_id) &&
    Boolean(form.subgroup_id) &&
    !templateAlreadyExists &&
    form.fields.length > 0 &&
    form.fields.every(
      (field) =>
        field.field_key.trim() &&
        field.field_label.trim() &&
        (!field.contributes_to_code ||
          field.code_length > 0),
    ) &&
    form.fields.some(
      (field) =>
        field.contributes_to_code,
    ) &&
    form.fields.some(
      (field) =>
        field.contributes_to_name,
    );

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Listas y parámetros · Codificación
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Plantillas de codificación
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra la estructura utilizada por CLAP para construir
            automáticamente el código y nombre de cada tipo de item.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          + Nueva plantilla
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
            Plantillas configuradas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {items.length} plantilla
            {items.length === 1 ? "" : "s"}
          </p>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Cargando plantillas...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-gray-900">
              No hay plantillas configuradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">
                    Clasificación
                  </th>

                  <th className="px-5 py-3">
                    Nombre
                  </th>

                  <th className="px-5 py-3">
                    Campos
                  </th>

                  <th className="px-5 py-3">
                    Longitud
                  </th>

                  <th className="px-5 py-3">
                    Productos
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
                          {item.full_code}
                        </span>

                        {item.structure_locked && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                            Protegida
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        {item.category?.name ??
                          item.category_code}
                        {" · "}
                        {item.group?.name ??
                          item.group_code}
                        {" · "}
                        {item.subgroup?.name ??
                          item.subgroup_code}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {item.name || "Sin nombre"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-900">
                        {item.fields_count}
                      </span>

                      <p className="mt-1 text-xs text-gray-500">
                        campos configurados
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {
                            item.calculated_numeric_code_length
                          }
                        </span>

                        {item.length_is_consistent ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                            Correcta
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700">
                            Revisar
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        registrada:{" "}
                        {item.numeric_code_length}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-900">
                        {item.products_count}
                      </span>

                      <p className="mt-1 text-xs text-gray-500">
                        producto
                        {item.products_count === 1
                          ? ""
                          : "s"}
                      </p>
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
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTemplate(item)
                          }
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
                        >
                          Ver estructura
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
          Estructura del código
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
          Las plantillas nuevas se crean inicialmente en estado Inactivo.
          Primero se configura su estructura y sus opciones; solo después
          podrán habilitarse para la creación de productos.
        </p>
      </section>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 px-4 py-6">
          <div className="mx-auto w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Codificación
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  Nueva plantilla
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Define la clasificación y los campos que compondrán
                  automáticamente el código.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="mt-6 space-y-6"
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Field label="Categoría *">
                  <select
                    value={form.category_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category_id:
                          event.target.value,
                        group_id: "",
                        subgroup_id: "",
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Selecciona una categoría
                    </option>

                    {activeCategories.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.code} · {item.name}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Grupo *">
                  <select
                    value={form.group_id}
                    disabled={!form.category_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        group_id:
                          event.target.value,
                        subgroup_id: "",
                      }))
                    }
                    className={`${inputClassName} disabled:bg-gray-100`}
                  >
                    <option value="">
                      Selecciona un grupo
                    </option>

                    {availableGroups.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.code} · {item.name}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Subgrupo *">
                  <select
                    value={form.subgroup_id}
                    disabled={!form.group_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        subgroup_id:
                          event.target.value,
                      }))
                    }
                    className={`${inputClassName} disabled:bg-gray-100`}
                  >
                    <option value="">
                      Selecciona un subgrupo
                    </option>

                    {availableSubgroups.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.code} · {item.name}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </div>

              {previewFullCode && (
                <div
                  className={`rounded-2xl border p-4 ${
                    templateAlreadyExists
                      ? "border-red-100 bg-red-50"
                      : "border-blue-100 bg-blue-50/50"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Clasificación
                  </p>

                  <p className="mt-2 text-lg font-bold text-[#07076b]">
                    {previewFullCode}
                  </p>

                  {templateAlreadyExists && (
                    <p className="mt-2 text-sm font-medium text-red-700">
                      Esta clasificación ya tiene una plantilla configurada.
                    </p>
                  )}
                </div>
              )}

              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Campos de la plantilla
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      El orden mostrado será el orden utilizado para construir
                      el código.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addField}
                    className="rounded-xl border border-[#07076b]/20 px-4 py-2.5 text-sm font-semibold text-[#07076b]"
                  >
                    + Agregar campo
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {form.fields.map(
                    (field, index) => (
                      <div
                        key={field.local_id}
                        className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5"
                      >
                        <div className="mb-5 flex items-center justify-between gap-3">
                          <p className="font-semibold text-gray-900">
                            {index + 1}.{" "}
                            {field.field_label ||
                              "Nuevo campo"}
                          </p>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() =>
                                moveField(index, -1)
                              }
                              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs disabled:opacity-30"
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              disabled={
                                index ===
                                form.fields.length - 1
                              }
                              onClick={() =>
                                moveField(index, 1)
                              }
                              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs disabled:opacity-30"
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              disabled={
                                form.fields.length === 1
                              }
                              onClick={() =>
                                removeField(
                                  field.local_id,
                                )
                              }
                              className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-30"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <Field label="Clave técnica *">
                            <input
                              value={field.field_key}
                              onChange={(event) =>
                                updateField(
                                  field.local_id,
                                  {
                                    field_key:
                                      event.target.value
                                        .toLowerCase()
                                        .replace(
                                          /\s+/g,
                                          "_",
                                        ),
                                  },
                                )
                              }
                              className={inputClassName}
                              placeholder="Ej. color"
                            />
                          </Field>

                          <Field label="Nombre visible *">
                            <input
                              value={
                                field.field_label
                              }
                              onChange={(event) =>
                                updateField(
                                  field.local_id,
                                  {
                                    field_label:
                                      event.target.value,
                                  },
                                )
                              }
                              className={inputClassName}
                              placeholder="Ej. Color"
                            />
                          </Field>

                          <Field label="Tipo *">
                            <select
                              value={field.field_type}
                              onChange={(event) =>
                                updateField(
                                  field.local_id,
                                  {
                                    field_type:
                                      event.target
                                        .value as
                                        | "select"
                                        | "number",
                                    allow_new_options:
                                      event.target
                                        .value ===
                                      "select",
                                  },
                                )
                              }
                              className={inputClassName}
                            >
                              <option value="select">
                                Lista de opciones
                              </option>

                              <option value="number">
                                Número
                              </option>
                            </select>
                          </Field>

                          <Field label="Longitud código *">
                            <input
                              type="number"
                              min={1}
                              disabled={
                                !field.contributes_to_code
                              }
                              value={field.code_length}
                              onChange={(event) =>
                                updateField(
                                  field.local_id,
                                  {
                                    code_length:
                                      Number(
                                        event.target
                                          .value || 0,
                                      ),
                                  },
                                )
                              }
                              className={`${inputClassName} disabled:bg-gray-100`}
                            />
                          </Field>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-5">
                          <Check
                            label="Obligatorio"
                            checked={field.required}
                            disabled={
                              field.contributes_to_code
                            }
                            onChange={(checked) =>
                              updateField(
                                field.local_id,
                                {
                                  required:
                                    checked,
                                },
                              )
                            }
                          />

                          <Check
                            label="Aporta al código"
                            checked={
                              field.contributes_to_code
                            }
                            onChange={(checked) =>
                              updateField(
                                field.local_id,
                                {
                                  contributes_to_code:
                                    checked,
                                  required: checked
                                    ? true
                                    : field.required,
                                  code_length: checked
                                    ? Math.max(
                                        1,
                                        field.code_length,
                                      )
                                    : 0,
                                },
                              )
                            }
                          />

                          <Check
                            label="Aporta al nombre"
                            checked={
                              field.contributes_to_name
                            }
                            onChange={(checked) =>
                              updateField(
                                field.local_id,
                                {
                                  contributes_to_name:
                                    checked,
                                },
                              )
                            }
                          />

                          {field.field_type ===
                            "select" && (
                            <Check
                              label="Permitir nuevas opciones"
                              checked={
                                field.allow_new_options
                              }
                              onChange={(checked) =>
                                updateField(
                                  field.local_id,
                                  {
                                    allow_new_options:
                                      checked,
                                  },
                                )
                              }
                            />
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">
                  Vista previa
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SummaryCard
                    label="Longitud numérica"
                    value={String(numericLength)}
                  />

                  <SummaryCard
                    label="Campos"
                    value={String(
                      form.fields.length,
                    )}
                  />

                  <SummaryCard
                    label="Estado inicial"
                    value="Inactivo"
                  />
                </div>

                <div className="mt-5 space-y-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-900">
                      Código:
                    </span>{" "}
                    {codePattern || "—"}
                  </p>

                  <p>
                    <span className="font-semibold text-gray-900">
                      Nombre:
                    </span>{" "}
                    {namePattern || "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  La plantilla se creará Inactiva
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                  Después configuraremos las opciones de sus campos. Hasta que
                  la plantilla esté completa no podrá utilizarse para generar
                  códigos de productos.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={isSaving}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !formIsValid
                  }
                  className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isSaving
                    ? "Creando..."
                    : "Crear plantilla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Plantilla
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#07076b]">
                  {selectedTemplate.full_code}
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  {selectedTemplate.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTemplate(null)
                }
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Campos"
                value={String(
                  selectedTemplate.fields_count,
                )}
              />

              <SummaryCard
                label="Longitud numérica"
                value={String(
                  selectedTemplate.calculated_numeric_code_length,
                )}
              />

              <SummaryCard
                label="Productos"
                value={String(
                  selectedTemplate.products_count,
                )}
              />
            </div>

            {selectedTemplate.structure_locked && (
              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  Estructura protegida
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                  Esta plantilla ya tiene productos asociados. Su estructura
                  no deberá modificarse porque podría alterar la lógica con la
                  que fueron generados sus códigos.
                </p>
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                <h3 className="font-semibold text-gray-900">
                  Campos de la plantilla
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3">
                        Orden
                      </th>

                      <th className="px-5 py-3">
                        Campo
                      </th>

                      <th className="px-5 py-3">
                        Tipo
                      </th>

                      <th className="px-5 py-3">
                        Longitud
                      </th>

                      <th className="px-5 py-3">
                        Opciones
                      </th>

                      <th className="px-5 py-3">
                        Aporta
                      </th>

                      <th className="px-5 py-3">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {selectedTemplate.fields.map(
                      (field) => (
                        <tr key={field.id}>
                          <td className="px-5 py-4 text-gray-600">
                            {field.display_order}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900">
                              {field.field_label}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {field.field_key}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {field.field_type}
                          </td>

                          <td className="px-5 py-4 font-semibold text-gray-900">
                            {field.code_length}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {field.options_count}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {field.contributes_to_code && (
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                                  Código
                                </span>
                              )}

                              {field.contributes_to_name && (
                                <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700">
                                  Nombre
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                field.status === "Activo"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {field.status}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Patrón actual
              </p>

              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-gray-900">
                    Código:
                  </span>{" "}
                  {selectedTemplate.code_pattern}
                </p>

                <p>
                  <span className="font-medium text-gray-900">
                    Nombre:
                  </span>{" "}
                  {selectedTemplate.name_pattern}
                </p>
              </div>
            </div>
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

function Check({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      {label}
    </label>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#07076b]">
        {value}
      </p>
    </div>
  );
}
