"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth/AuthProvider";

type RequestType =
  | "Creación"
  | "Desactivación";

type Category = {
  id: string;
  code: string;
  name: string;
};

type Group = {
  id: string;
  category_id: string;
  code: string;
  name: string;
};

type Subgroup = {
  id: string;
  group_id: string;
  code: string;
  name: string;
};

type Template = {
  id: string;
  category_code: string;
  group_code: string;
  subgroup_code: string;
  full_code: string;
  name: string | null;
  code_pattern: string | null;
  name_pattern: string | null;
  numeric_code_length: number;
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
};

type ClassificationOption = {
  id: string;
  template_id: string;
  field_key: string;
  code: string;
  name: string;
};

type OptionCatalogValue = {
  id: string;
  catalog_id: string;
  code: string;
  name: string;
};

type ConfigurationPayload = {
  categories: Category[];
  groups: Group[];
  subgroups: Subgroup[];
  templates: Template[];
  template_fields: TemplateField[];
  options: ClassificationOption[];
  option_catalog_values: OptionCatalogValue[];
};

type Props = {
  requesterArea: string;
  contextLabel: string;
  description: string;
};

const inputClassName =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

export default function SolicitudCodigoForm({
  requesterArea,
  contextLabel,
  description,
}: Props) {
  const {
    session,
    hasPermission,
    systemUser,
  } = useAuth();

  const canRequest =
    Boolean(systemUser?.is_super_admin) ||
    hasPermission("CODIFICACION_REQUEST");

  const [
    configuration,
    setConfiguration,
  ] =
    useState<ConfigurationPayload | null>(
      null,
    );

  const [requestType, setRequestType] =
    useState<RequestType>("Creación");

  const [categoryCode, setCategoryCode] =
    useState("");

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] = useState("");

  const [
    detailedDescription,
    setDetailedDescription,
  ] = useState("");

  const [
    productCodeToDeactivate,
    setProductCodeToDeactivate,
  ] = useState("");

  const [
    productNameToDeactivate,
    setProductNameToDeactivate,
  ] = useState("");

  const [attachment, setAttachment] =
    useState<File | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadConfiguration =
    useCallback(async () => {
      if (!session?.access_token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/sistema-gestion-calidad/codificacion/solicitudes/clasificaciones",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "No se pudo cargar la estructura de codificación.",
          );
        }

        setConfiguration(
          result as ConfigurationPayload,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la estructura de codificación.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [session?.access_token]);

  useEffect(() => {
    if (canRequest) {
      loadConfiguration();
    } else {
      setIsLoading(false);
    }
  }, [
    canRequest,
    loadConfiguration,
  ]);

  const categories =
    configuration?.categories ?? [];

  const templatesForCategory =
    useMemo(() => {
      if (
        !configuration ||
        !categoryCode
      ) {
        return [];
      }

      return configuration.templates
        .filter(
          (template) =>
            template.category_code ===
            categoryCode,
        )
        .sort((a, b) =>
          a.full_code.localeCompare(
            b.full_code,
          ),
        );
    }, [
      configuration,
      categoryCode,
    ]);

  const selectedTemplate =
    configuration?.templates.find(
      (template) =>
        template.id ===
        selectedTemplateId,
    ) ?? null;

  const selectedFields =
    useMemo(() => {
      if (
        !configuration ||
        !selectedTemplate
      ) {
        return [];
      }

      return configuration.template_fields
        .filter(
          (field) =>
            field.template_id ===
            selectedTemplate.id,
        )
        .sort(
          (a, b) =>
            a.display_order -
            b.display_order,
        );
    }, [
      configuration,
      selectedTemplate,
    ]);

  function getFieldOptions(
    field: TemplateField,
  ) {
    if (
      !configuration ||
      !selectedTemplate
    ) {
      return [];
    }

    const legacyOptions =
      configuration.options
        .filter(
          (option) =>
            option.template_id ===
              selectedTemplate.id &&
            option.field_key ===
              field.field_key,
        )
        .map((option) => ({
          id: option.id,
          code: option.code,
          name: option.name,
        }));

    if (!field.option_catalog_id) {
      return legacyOptions;
    }

    const sharedOptions =
      configuration.option_catalog_values
        .filter(
          (option) =>
            option.catalog_id ===
            field.option_catalog_id,
        )
        .map((option) => ({
          id: option.id,
          code: option.code,
          name: option.name,
        }));

    /*
     * El catálogo transversal es la fuente preferida.
     * Si todavía no tiene valores, conservamos
     * compatibilidad con las opciones históricas.
     */
    return sharedOptions.length > 0
      ? sharedOptions
      : legacyOptions;
  }

  function getGroupName(
    template: Template,
  ) {
    if (!configuration) {
      return template.group_code;
    }

    const category =
      configuration.categories.find(
        (item) =>
          item.code ===
          template.category_code,
      );

    const group =
      configuration.groups.find(
        (item) =>
          item.category_id ===
            category?.id &&
          item.code ===
            template.group_code,
      );

    return group
      ? `${group.code} · ${group.name}`
      : template.group_code;
  }

  function getSubgroupName(
    template: Template,
  ) {
    if (!configuration) {
      return template.subgroup_code;
    }

    const category =
      configuration.categories.find(
        (item) =>
          item.code ===
          template.category_code,
      );

    const group =
      configuration.groups.find(
        (item) =>
          item.category_id ===
            category?.id &&
          item.code ===
            template.group_code,
      );

    const subgroup =
      configuration.subgroups.find(
        (item) =>
          item.group_id ===
            group?.id &&
          item.code ===
            template.subgroup_code,
      );

    return subgroup
      ? `${subgroup.code} · ${subgroup.name}`
      : template.subgroup_code;
  }

  function resetForm() {
    setRequestType("Creación");
    setCategoryCode("");
    setSelectedTemplateId("");
    setDetailedDescription("");
    setProductCodeToDeactivate("");
    setProductNameToDeactivate("");
    setAttachment(null);

    const input =
      document.getElementById(
        "code-request-attachment",
      ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!session?.access_token) {
      setErrorMessage(
        "No se encontró una sesión activa.",
      );
      return;
    }

    if (!categoryCode) {
      setErrorMessage(
        "Debes seleccionar una categoría de codificación.",
      );
      return;
    }

    if (
      requestType === "Creación" &&
      !selectedTemplate
    ) {
      setErrorMessage(
        "Debes seleccionar la clasificación específica.",
      );
      return;
    }

    if (!detailedDescription.trim()) {
      setErrorMessage(
        "Debes ingresar la descripción detallada.",
      );
      return;
    }

    if (
      requestType === "Desactivación" &&
      !productCodeToDeactivate.trim()
    ) {
      setErrorMessage(
        "Debes indicar el código que deseas desactivar.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData =
        new FormData();

      formData.append(
        "requester_area",
        requesterArea,
      );

      formData.append(
        "request_type",
        requestType,
      );

      formData.append(
        "request_category",
        "Producto",
      );

      /*
       * Conservamos por ahora el código de
       * categoría para mantener compatibilidad
       * con el API actual.
       */
      formData.append(
        "classification_code",
        categoryCode,
      );

      let finalDescription =
        detailedDescription.trim();

      if (
        requestType === "Creación" &&
        selectedTemplate
      ) {
        finalDescription = [
          `CLASIFICACIÓN ESPECÍFICA: ${selectedTemplate.full_code} · ${selectedTemplate.name ?? ""}`,
          "",
          "INFORMACIÓN SUMINISTRADA POR EL SOLICITANTE:",
          finalDescription,
        ].join("\n");
      }

      formData.append(
        "detailed_description",
        finalDescription,
      );

      if (
        requestType ===
        "Desactivación"
      ) {
        formData.append(
          "product_code_to_deactivate",
          productCodeToDeactivate.trim(),
        );

        formData.append(
          "product_name_to_deactivate",
          productNameToDeactivate.trim(),
        );
      }

      if (attachment) {
        formData.append(
          "attachment",
          attachment,
        );
      }

      const response = await fetch(
        "/api/sistema-gestion-calidad/codificacion/solicitudes",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: formData,
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo crear la solicitud.",
        );
      }

      const requestNumber =
        result.request
          ?.request_number ?? "";

      setSuccessMessage(
        requestNumber
          ? `Solicitud ${requestNumber} creada correctamente.`
          : "Solicitud creada correctamente.",
      );

      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la solicitud.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!canRequest) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
        No tienes permiso para solicitar códigos.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
          {contextLabel}
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#07076b]">
          Solicitud de código
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          {description}
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-700">
            {successMessage}
          </p>

          <p className="mt-1 text-sm text-emerald-700">
            Quedó pendiente para gestión por Sistema de Gestión de la Calidad.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-5xl space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Información de la solicitud
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Los datos del solicitante se toman automáticamente del usuario autenticado.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Proceso solicitante">
            <input
              value={requesterArea}
              disabled
              className={`${inputClassName} cursor-not-allowed bg-gray-50`}
            />
          </Field>

          <Field label="Tipo de solicitud *">
            <select
              value={requestType}
              onChange={(event) => {
                const value =
                  event.target
                    .value as RequestType;

                setRequestType(value);
                setErrorMessage("");
              }}
              className={inputClassName}
            >
              <option value="Creación">
                Creación
              </option>

              <option value="Desactivación">
                Desactivación
              </option>
            </select>
          </Field>
        </div>

        <Field label="Categoría *">
          <select
            value={categoryCode}
            onChange={(event) => {
              setCategoryCode(
                event.target.value,
              );

              setSelectedTemplateId("");
            }}
            disabled={isLoading}
            className={inputClassName}
          >
            <option value="">
              {isLoading
                ? "Cargando..."
                : "Seleccionar categoría"}
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.code}
                >
                  {category.code} ·{" "}
                  {category.name}
                </option>
              ),
            )}
          </select>
        </Field>

        {requestType === "Creación" &&
          categoryCode && (
            <Field label="Clasificación específica *">
              <select
                value={
                  selectedTemplateId
                }
                onChange={(event) =>
                  setSelectedTemplateId(
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
              >
                <option value="">
                  Selecciona dónde pertenece el producto
                </option>

                {templatesForCategory.map(
                  (template) => (
                    <option
                      key={template.id}
                      value={template.id}
                    >
                      {template.full_code} ·{" "}
                      {template.name}
                    </option>
                  ),
                )}
              </select>
            </Field>
          )}

        {requestType === "Creación" &&
          selectedTemplate && (
            <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white">
              <div className="border-b border-indigo-100 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">
                      Guía para la solicitud
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-[#07076b]">
                      Información necesaria para crear este código
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Usa esta guía para entregar a SC todos los datos necesarios.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#07076b] px-4 py-3 text-white">
                    <p className="text-xs uppercase tracking-wide text-white/70">
                      Clasificación
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {
                        selectedTemplate.full_code
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <MiniInfo
                    label="Grupo"
                    value={getGroupName(
                      selectedTemplate,
                    )}
                  />

                  <MiniInfo
                    label="Subgrupo"
                    value={getSubgroupName(
                      selectedTemplate,
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 p-6">
                {selectedFields.map(
                  (field, index) => {
                    const options =
                      getFieldOptions(
                        field,
                      );

                    return (
                      <div
                        key={field.id}
                        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07076b] text-xs font-bold text-white">
                              {index + 1}
                            </div>

                            <div>
                              <p className="font-semibold text-gray-900">
                                {
                                  field.field_label
                                }
                                {field.required
                                  ? " *"
                                  : ""}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                {field.contributes_to_code
                                  ? `${field.code_length} dígito${field.code_length === 1 ? "" : "s"} en el código`
                                  : "Dato descriptivo"}
                              </p>
                            </div>
                          </div>

                          {field.allow_new_options && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Admite nuevos valores
                            </span>
                          )}
                        </div>

                        {options.length >
                        0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {options.map(
                              (option) => (
                                <span
                                  key={
                                    option.id
                                  }
                                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
                                >
                                  <strong className="text-[#07076b]">
                                    {
                                      option.code
                                    }
                                  </strong>
                                  {" · "}
                                  {
                                    option.name
                                  }
                                </span>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No existen valores actualmente. Indica claramente el nuevo valor requerido.
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          )}

        {requestType ===
          "Desactivación" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Código a desactivar *">
              <input
                value={
                  productCodeToDeactivate
                }
                onChange={(event) =>
                  setProductCodeToDeactivate(
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Nombre del producto">
              <input
                value={
                  productNameToDeactivate
                }
                onChange={(event) =>
                  setProductNameToDeactivate(
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>
          </div>
        )}

        <Field label="Descripción detallada *">
          <textarea
            value={detailedDescription}
            onChange={(event) =>
              setDetailedDescription(
                event.target.value,
              )
            }
            rows={6}
            className={inputClassName}
            placeholder={
              requestType ===
                "Creación" &&
              selectedTemplate
                ? `Indica ${selectedFields
                    .map(
                      (field) =>
                        field.field_label,
                    )
                    .join(", ")}...`
                : "Describe detalladamente la solicitud..."
            }
          />
        </Field>

        <Field label="Adjunto">
          <input
            id="code-request-attachment"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) =>
              setAttachment(
                event.target.files?.[0] ??
                  null,
              )
            }
            className={inputClassName}
          />
        </Field>

        <div className="flex justify-end border-t border-gray-100 pt-5">
          <button
            type="submit"
            disabled={
              isSaving ||
              isLoading
            }
            className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving
              ? "Enviando..."
              : "Enviar solicitud"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
}
