"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type ItemCodeRequest = {
  id: string;
  request_number: string;
  requester_area: string;
  requester_name: string;
  requester_position: string;
  requester_email: string | null;
  request_type: string;
  request_category: string;
  classification_code: string;
  classification_name: string | null;
  detailed_description: string;
  status: string;
};

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
};

type ClassificationOption = {
  id: string;
  template_id: string;
  field_key: string;
  code: string;
  name: string;
};

type MasterField = {
  id: string;
  category_code: string;
  field_key: string;
  field_label: string;
  field_type: string;
  required: boolean;
  display_order: number;
  options: unknown;
};

type ConfigurationPayload = {
  categories: Category[];
  groups: Group[];
  subgroups: Subgroup[];
  templates: Template[];
  template_fields: TemplateField[];
  options: ClassificationOption[];
  master_fields: MasterField[];
};

const inputClassName =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

function padCode(value: string, length: number) {
  return String(value).padStart(length, "0");
}

function getMasterFieldOptions(field: MasterField) {
  if (Array.isArray(field.options)) {
    return field.options.map((item) => String(item));
  }

  if (typeof field.options === "string") {
    try {
      const parsed = JSON.parse(field.options);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return field.options
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export default function CrearCodigoPage() {
  const router = useRouter();
  const { session, hasPermission } = useAuth();

  const canCreateProduct =
    hasPermission("CODIFICACION_CREATE_PRODUCT");

  const [requestId, setRequestId] = useState("");
  const [codeRequest, setCodeRequest] =
    useState<ItemCodeRequest | null>(null);

  const [configuration, setConfiguration] =
    useState<ConfigurationPayload | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [subgroupId, setSubgroupId] = useState("");

  const [dynamicData, setDynamicData] =
    useState<Record<string, string>>({});

  const [masterData, setMasterData] =
    useState<Record<string, string>>({});

  const [masterFiles, setMasterFiles] =
    useState<Record<string, File | null>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params =
      new URLSearchParams(window.location.search);

    setRequestId(
      params.get("requestId")?.trim() ?? "",
    );
  }, []);

  useEffect(() => {
    if (
      !session?.access_token ||
      !requestId
    ) {
      return;
    }

    loadData();
  }, [session?.access_token, requestId]);

  async function loadData() {
    if (!session?.access_token) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const [
        requestsResponse,
        configurationResponse,
      ] = await Promise.all([
        fetch(
          "/api/sistema-gestion-calidad/codificacion/solicitudes",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          },
        ),

        fetch(
          "/api/sistema-gestion-calidad/codificacion/configuracion",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          },
        ),
      ]);

      const requestsPayload =
        await requestsResponse.json();

      const configurationPayload =
        await configurationResponse.json();

      if (!requestsResponse.ok) {
        throw new Error(
          requestsPayload?.error ||
            "No se pudo consultar la solicitud.",
        );
      }

      if (!configurationResponse.ok) {
        throw new Error(
          configurationPayload?.error ||
            "No se pudo cargar la configuración de codificación.",
        );
      }

      const currentRequest =
        (requestsPayload.requests ?? []).find(
          (item: ItemCodeRequest) =>
            item.id === requestId,
        ) ?? null;

      if (!currentRequest) {
        throw new Error(
          "No se encontró la solicitud indicada.",
        );
      }

      if (
        currentRequest.status !== "Pendiente"
      ) {
        throw new Error(
          `La solicitud ya fue gestionada. Estado actual: ${currentRequest.status}.`,
        );
      }

      if (
        currentRequest.request_type !== "Creación"
      ) {
        throw new Error(
          "Esta pantalla solo gestiona solicitudes de creación de código.",
        );
      }

      const config =
        configurationPayload as ConfigurationPayload;

      setCodeRequest(currentRequest);
      setConfiguration(config);

      const requestCategoryCode =
        currentRequest.classification_code
          .split("-")[0]
          .trim();

      const matchingCategory =
        config.categories.find(
          (category) =>
            category.code ===
            requestCategoryCode,
        );

      if (!matchingCategory) {
        throw new Error(
          `No existe una categoría activa configurada para ${requestCategoryCode}.`,
        );
      }

      setCategoryId(matchingCategory.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la creación de código.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const selectedCategory =
    configuration?.categories.find(
      (category) =>
        category.id === categoryId,
    ) ?? null;

  const availableGroupCodes = useMemo(() => {
    if (
      !configuration ||
      !selectedCategory
    ) {
      return new Set<string>();
    }

    return new Set(
      configuration.templates
        .filter(
          (template) =>
            template.category_code ===
            selectedCategory.code,
        )
        .map(
          (template) =>
            template.group_code,
        ),
    );
  }, [configuration, selectedCategory]);

  const filteredGroups = useMemo(() => {
    if (
      !configuration ||
      !selectedCategory
    ) {
      return [];
    }

    return configuration.groups.filter(
      (group) =>
        group.category_id ===
          selectedCategory.id &&
        availableGroupCodes.has(
          group.code,
        ),
    );
  }, [
    configuration,
    selectedCategory,
    availableGroupCodes,
  ]);

  const selectedGroup =
    configuration?.groups.find(
      (group) => group.id === groupId,
    ) ?? null;

  const availableSubgroupCodes =
    useMemo(() => {
      if (
        !configuration ||
        !selectedCategory ||
        !selectedGroup
      ) {
        return new Set<string>();
      }

      return new Set(
        configuration.templates
          .filter(
            (template) =>
              template.category_code ===
                selectedCategory.code &&
              template.group_code ===
                selectedGroup.code,
          )
          .map(
            (template) =>
              template.subgroup_code,
          ),
      );
    }, [
      configuration,
      selectedCategory,
      selectedGroup,
    ]);

  const filteredSubgroups =
    useMemo(() => {
      if (
        !configuration ||
        !selectedGroup
      ) {
        return [];
      }

      return configuration.subgroups.filter(
        (subgroup) =>
          subgroup.group_id ===
            selectedGroup.id &&
          availableSubgroupCodes.has(
            subgroup.code,
          ),
      );
    }, [
      configuration,
      selectedGroup,
      availableSubgroupCodes,
    ]);

  const selectedSubgroup =
    configuration?.subgroups.find(
      (subgroup) =>
        subgroup.id === subgroupId,
    ) ?? null;

  const selectedTemplate =
    configuration?.templates.find(
      (template) =>
        template.category_code ===
          selectedCategory?.code &&
        template.group_code ===
          selectedGroup?.code &&
        template.subgroup_code ===
          selectedSubgroup?.code,
    ) ?? null;

  const selectedTemplateFields =
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
    }, [configuration, selectedTemplate]);

  const selectedMasterFields =
    useMemo(() => {
      if (
        !configuration ||
        !selectedCategory
      ) {
        return [];
      }

      return configuration.master_fields
        .filter(
          (field) =>
            field.category_code ===
            selectedCategory.code,
        )
        .sort(
          (a, b) =>
            a.display_order -
            b.display_order,
        );
    }, [configuration, selectedCategory]);

  const generatedPreview = useMemo(() => {
    if (
      !configuration ||
      !selectedTemplate ||
      !selectedCategory ||
      !selectedGroup ||
      !selectedSubgroup
    ) {
      return {
        reference: "",
        name: "",
        numericBlock: "",
        isValidLength: false,
      };
    }

    const numericParts: string[] = [];
    const nameParts: string[] = [];

    for (
      const field of
      selectedTemplateFields
    ) {
      const rawValue =
        dynamicData[field.field_key] ??
        "";

      if (!rawValue) continue;

      const selectedOption =
        configuration.options.find(
          (option) =>
            option.template_id ===
              selectedTemplate.id &&
            option.field_key ===
              field.field_key &&
            option.name === rawValue,
        );

      if (field.contributes_to_code) {
        if (selectedOption) {
          numericParts.push(
            padCode(
              selectedOption.code,
              field.code_length,
            ),
          );
        } else if (
          field.field_type === "number"
        ) {
          const digits =
            String(rawValue).replace(
              /\D/g,
              "",
            );

          if (
            digits &&
            digits.length <=
              field.code_length
          ) {
            numericParts.push(
              padCode(
                digits,
                field.code_length,
              ),
            );
          }
        }
      }

      if (field.contributes_to_name) {
        nameParts.push(
          selectedOption?.name ??
            rawValue.trim().toUpperCase(),
        );
      }
    }

    const numericBlock =
      numericParts.join("");

    const classificationCode =
      `${selectedCategory.code}-` +
      `${selectedGroup.code}-` +
      `${selectedSubgroup.code}`;

    return {
      reference:
        numericBlock.length > 0
          ? `${classificationCode}-${numericBlock}`
          : "",
      name: nameParts
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
      numericBlock,
      isValidLength:
        numericBlock.length ===
        selectedTemplate.numeric_code_length,
    };
  }, [
    configuration,
    selectedTemplate,
    selectedCategory,
    selectedGroup,
    selectedSubgroup,
    selectedTemplateFields,
    dynamicData,
  ]);

  function getOptionsForField(
    field: TemplateField,
  ) {
    if (
      !configuration ||
      !selectedTemplate
    ) {
      return [];
    }

    return configuration.options.filter(
      (option) =>
        option.template_id ===
          selectedTemplate.id &&
        option.field_key ===
          field.field_key,
    );
  }

  function handleGroupChange(
    value: string,
  ) {
    setGroupId(value);
    setSubgroupId("");
    setDynamicData({});
  }

  function handleSubgroupChange(
    value: string,
  ) {
    setSubgroupId(value);
    setDynamicData({});
  }

  async function handleSave() {
    if (
      !session?.access_token ||
      !codeRequest ||
      !configuration
    ) {
      return;
    }

    if (
      !categoryId ||
      !groupId ||
      !subgroupId
    ) {
      alert(
        "Debes seleccionar grupo y subgrupo.",
      );
      return;
    }

    if (!selectedTemplate) {
      alert(
        "No existe una plantilla activa para la clasificación seleccionada.",
      );
      return;
    }

    for (
      const field of
      selectedTemplateFields
    ) {
      if (
        field.required &&
        !dynamicData[
          field.field_key
        ]?.trim()
      ) {
        alert(
          `Debes completar: ${field.field_label}.`,
        );
        return;
      }
    }

    if (
      !generatedPreview.isValidLength
    ) {
      alert(
        `El bloque numérico debe tener ${selectedTemplate.numeric_code_length} dígitos.`,
      );
      return;
    }

    for (
      const field of
      selectedMasterFields
    ) {
      if (!field.required) continue;

      const isFileField =
        field.field_type === "image" ||
        field.field_type === "pdf";

      if (
        isFileField &&
        !masterFiles[field.field_key]
      ) {
        alert(
          `Debes adjuntar: ${field.field_label}.`,
        );
        return;
      }

      if (
        !isFileField &&
        !masterData[
          field.field_key
        ]?.trim()
      ) {
        alert(
          `Debes completar: ${field.field_label}.`,
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      const product = {
        category_id: categoryId,
        group_id: groupId,
        subgroup_id: subgroupId,

        /*
         * Estos valores son solo una vista previa.
         * El backend genera nuevamente los oficiales.
         */
        reference:
          generatedPreview.reference,
        final_code:
          generatedPreview.reference,
        generated_reference:
          generatedPreview.reference,
        name:
          generatedPreview.name,
        dynamic_name:
          generatedPreview.name,

        dynamic_code_data:
          dynamicData,

        item_master_data:
          masterData,

        unit: "Unidad",
        status: "Activo",
        product_type: "Simple",
        supply_type: "Fabricado",

        can_be_sold: true,
        can_be_purchased: false,
        can_be_manufactured: true,

        tracks_inventory: true,
        tracks_lots: false,
        tracks_serials: false,

        requires_formula: false,
        requires_components: false,
        requires_route: false,
        requires_maintenance: false,
        depreciable: false,
      };

      const formData =
        new FormData();

      formData.append(
        "request_id",
        codeRequest.id,
      );

      formData.append(
        "product",
        JSON.stringify(product),
      );

      for (
        const [
          fieldKey,
          file,
        ] of Object.entries(
          masterFiles,
        )
      ) {
        if (!file) continue;

        formData.append(
          `master_file__${fieldKey}`,
          file,
        );
      }

      const response = await fetch(
        "/api/sistema-gestion-calidad/codificacion/solicitudes/crear-producto",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: formData,
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "No se pudo crear el producto.",
        );
      }

      if (
        codeRequest.requester_email &&
        payload.email_sent === false
      ) {
        alert(
          "Código creado correctamente, pero no se pudo enviar el correo de notificación.",
        );
      } else {
        alert(
          "Código creado correctamente.",
        );
      }

      router.push(
        "/sistema-gestion-calidad/codificacion",
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo crear el producto.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!canCreateProduct) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        No tienes permiso para crear códigos de producto.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
        Cargando solicitud y configuración...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage}
        </div>

        <button
          onClick={() =>
            router.push(
              "/sistema-gestion-calidad/codificacion",
            )
          }
          className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Volver a Codificación
        </button>
      </div>
    );
  }

  if (
    !codeRequest ||
    !configuration ||
    !selectedCategory
  ) {
    return null;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Sistema de Gestión de la Calidad · Codificación
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#07076b]">
            Crear código
          </h1>

          <p className="mt-3 text-base text-gray-600">
            Solicitud {codeRequest.request_number}
          </p>
        </div>

        <button
          onClick={() =>
            router.push(
              "/sistema-gestion-calidad/codificacion",
            )
          }
          className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Volver
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#07076b]">
          Solicitud recibida
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Info
            label="Solicitante"
            value={codeRequest.requester_name}
          />

          <Info
            label="Área"
            value={codeRequest.requester_area}
          />

          <Info
            label="Clasificación solicitada"
            value={`${codeRequest.classification_code} - ${
              codeRequest.classification_name ?? ""
            }`}
          />

          <Info
            label="Estado"
            value={codeRequest.status}
          />
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Descripción
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
            {codeRequest.detailed_description}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="border-b border-gray-100 pb-5">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
            1
          </div>

          <h2 className="text-xl font-bold text-[#07076b]">
            Clasificación y código
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Selecciona la clasificación. El código se forma automáticamente con la plantilla configurada.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field label="Categoría">
            <input
              value={`${selectedCategory.code} · ${selectedCategory.name}`}
              readOnly
              className={`${inputClassName} bg-gray-50`}
            />
          </Field>

          <Field label="Grupo *">
            <select
              value={groupId}
              onChange={(event) =>
                handleGroupChange(
                  event.target.value,
                )
              }
              className={inputClassName}
            >
              <option value="">
                Seleccionar grupo
              </option>

              {filteredGroups.map(
                (group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.code} ·{" "}
                    {group.name}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Subgrupo *">
            <select
              value={subgroupId}
              disabled={!groupId}
              onChange={(event) =>
                handleSubgroupChange(
                  event.target.value,
                )
              }
              className={`${inputClassName} disabled:bg-gray-100`}
            >
              <option value="">
                Seleccionar subgrupo
              </option>

              {filteredSubgroups.map(
                (subgroup) => (
                  <option
                    key={subgroup.id}
                    value={subgroup.id}
                  >
                    {subgroup.code} ·{" "}
                    {subgroup.name}
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>

        {selectedTemplate && (
          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
            {selectedTemplateFields.map(
              (field) => {
                const value =
                  dynamicData[
                    field.field_key
                  ] ?? "";

                const options =
                  getOptionsForField(
                    field,
                  );

                return (
                  <Field
                    key={field.id}
                    label={`${field.field_label}${
                      field.required
                        ? " *"
                        : ""
                    }`}
                  >
                    {field.field_type ===
                    "select" ? (
                      <select
                        value={value}
                        onChange={(event) =>
                          setDynamicData(
                            (current) => ({
                              ...current,
                              [field.field_key]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className={
                          inputClassName
                        }
                      >
                        <option value="">
                          Seleccionar
                        </option>

                        {options.map(
                          (option) => (
                            <option
                              key={
                                option.id
                              }
                              value={
                                option.name
                              }
                            >
                              {option.code} ·{" "}
                              {option.name}
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
                        value={value}
                        onChange={(event) =>
                          setDynamicData(
                            (current) => ({
                              ...current,
                              [field.field_key]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className={
                          inputClassName
                        }
                      />
                    )}
                  </Field>
                );
              },
            )}
          </div>
        )}

        <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Código automático">
            <input
              value={
                generatedPreview.reference
              }
              readOnly
              placeholder="Se genera automáticamente"
              className={`${inputClassName} bg-gray-50 font-semibold text-[#07076b]`}
            />

            {selectedTemplate &&
              generatedPreview.numericBlock &&
              !generatedPreview.isValidLength && (
                <p className="mt-2 text-xs text-amber-600">
                  Bloque numérico:{" "}
                  {
                    generatedPreview
                      .numericBlock.length
                  }
                  /
                  {
                    selectedTemplate.numeric_code_length
                  }{" "}
                  dígitos.
                </p>
              )}
          </Field>

          <Field label="Nombre automático">
            <input
              value={
                generatedPreview.name
              }
              readOnly
              placeholder="Se genera automáticamente"
              className={`${inputClassName} bg-gray-50 font-semibold text-[#07076b]`}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="border-b border-gray-100 pb-5">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07076b] text-sm font-bold text-white">
            2
          </div>

          <h2 className="text-xl font-bold text-[#07076b]">
            Datos maestros del item
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Estos campos dependen de la configuración activa de la categoría.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {selectedMasterFields.map(
            (field) => {
              const value =
                masterData[
                  field.field_key
                ] ?? "";

              if (
                field.field_type ===
                "textarea"
              ) {
                return (
                  <div
                    key={field.id}
                    className="md:col-span-2"
                  >
                    <Field
                      label={`${field.field_label}${
                        field.required
                          ? " *"
                          : ""
                      }`}
                    >
                      <textarea
                        rows={3}
                        value={value}
                        onChange={(event) =>
                          setMasterData(
                            (current) => ({
                              ...current,
                              [field.field_key]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className={
                          inputClassName
                        }
                      />
                    </Field>
                  </div>
                );
              }

              if (
                field.field_type ===
                "select"
              ) {
                return (
                  <Field
                    key={field.id}
                    label={`${field.field_label}${
                      field.required
                        ? " *"
                        : ""
                    }`}
                  >
                    <select
                      value={value}
                      onChange={(event) =>
                        setMasterData(
                          (current) => ({
                            ...current,
                            [field.field_key]:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className={
                        inputClassName
                      }
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {getMasterFieldOptions(
                        field,
                      ).map(
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
                  </Field>
                );
              }

              if (
                field.field_type ===
                  "image" ||
                field.field_type ===
                  "pdf"
              ) {
                const accept =
                  field.field_type ===
                  "image"
                    ? "image/jpeg,image/png,image/webp"
                    : "application/pdf";

                return (
                  <Field
                    key={field.id}
                    label={`${field.field_label}${
                      field.required
                        ? " *"
                        : ""
                    }`}
                  >
                    <input
                      type="file"
                      accept={accept}
                      onChange={(event) =>
                        setMasterFiles(
                          (current) => ({
                            ...current,
                            [field.field_key]:
                              event.target
                                .files?.[0] ??
                              null,
                          }),
                        )
                      }
                      className={
                        inputClassName
                      }
                    />

                    {masterFiles[
                      field.field_key
                    ] && (
                      <p className="mt-2 text-xs text-gray-500">
                        Archivo:{" "}
                        {
                          masterFiles[
                            field
                              .field_key
                          ]?.name
                        }
                      </p>
                    )}
                  </Field>
                );
              }

              return (
                <Field
                  key={field.id}
                  label={`${field.field_label}${
                    field.required
                      ? " *"
                      : ""
                  }`}
                >
                  <input
                    type={
                      field.field_type ===
                      "number"
                        ? "number"
                        : "text"
                    }
                    value={value}
                    onChange={(event) =>
                      setMasterData(
                        (current) => ({
                          ...current,
                          [field.field_key]:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className={
                      inputClassName
                    }
                  />
                </Field>
              );
            },
          )}
        </div>
      </section>

      <section className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
        <button
          onClick={() =>
            router.push(
              "/sistema-gestion-calidad/codificacion",
            )
          }
          disabled={isSaving}
          className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          onClick={handleSave}
          disabled={
            isSaving ||
            !selectedTemplate ||
            !generatedPreview.isValidLength
          }
          className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#07076b]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Creando código..."
            : "Crear código"}
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-800">
        {value}
      </p>
    </div>
  );
}
