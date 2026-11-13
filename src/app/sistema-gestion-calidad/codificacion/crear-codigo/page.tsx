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

  can_be_sold: boolean;
  can_be_purchased: boolean;
  can_be_manufactured: boolean;
  tracks_inventory: boolean;
  tracks_lots: boolean;
  tracks_serials: boolean;
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

type OptionCatalog = {
  id: string;
  code: string;
  name: string;
};

type OptionCatalogValue = {
  id: string;
  catalog_id: string;
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

type MeasurementUnit = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  siigo_unit_code: string | null;
};

type ConfigurationPayload = {
  categories: Category[];
  groups: Group[];
  subgroups: Subgroup[];
  templates: Template[];
  template_fields: TemplateField[];
  options: ClassificationOption[];
  option_catalogs: OptionCatalog[];
  option_catalog_values: OptionCatalogValue[];
  master_fields: MasterField[];
  measurement_units: MeasurementUnit[];
};

const inputClassName =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

function padCode(value: string, length: number) {
  return String(value).padStart(length, "0");
}

function getNewOptionButtonLabel(
  field: TemplateField,
) {
  const label =
    field.field_label.trim();

  const lower =
    label.toLowerCase();

  const feminine =
    lower.startsWith("referencia") ||
    lower.startsWith("presentación")
      ? "Nueva"
      : "Nuevo";

  const scope =
    field.option_catalog_id
      ? " (transversal)"
      : "";

  return `+ ${feminine} ${lower}${scope}`;
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

  const [inventoryUnit, setInventoryUnit] = useState("");

  const [dynamicData, setDynamicData] =
    useState<Record<string, string>>({});

  const [masterData, setMasterData] =
    useState<Record<string, string>>({});

  const [masterFiles, setMasterFiles] =
    useState<Record<string, File | null>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [
    creatingOptionFieldKey,
    setCreatingOptionFieldKey,
  ] = useState("");

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

  /*
   * Los grupos y subgrupos pertenecen al maestro de
   * clasificación y NO dependen de que exista una
   * plantilla activa.
   *
   * La plantilla se valida después de seleccionar
   * categoría + grupo + subgrupo.
   */
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
        selectedCategory.id,
    );
  }, [
    configuration,
    selectedCategory,
  ]);

  const selectedGroup =
    configuration?.groups.find(
      (group) =>
        group.id === groupId,
    ) ?? null;

  const filteredSubgroups = useMemo(() => {
    if (
      !configuration ||
      !selectedGroup
    ) {
      return [];
    }

    return configuration.subgroups.filter(
      (subgroup) =>
        subgroup.group_id ===
        selectedGroup.id,
    );
  }, [
    configuration,
    selectedGroup,
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
        getOptionsForField(field).find(
          (option) =>
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

  const selectedMeasurementUnit =
    configuration?.measurement_units.find(
      (unit) =>
        unit.code === inventoryUnit,
    ) ?? null;

  function getOptionsForField(
    field: TemplateField,
  ) {
    if (
      !configuration ||
      !selectedTemplate
    ) {
      return [];
    }

    const legacyOptions =
      configuration.options.filter(
        (option) =>
          option.template_id ===
            selectedTemplate.id &&
          option.field_key ===
            field.field_key,
      );

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
        .map(
          (option): ClassificationOption => ({
            id: option.id,
            template_id: selectedTemplate.id,
            field_key: field.field_key,
            code: option.code,
            name: option.name,
          }),
        );

    return sharedOptions.length > 0
      ? sharedOptions
      : legacyOptions;
  }

  async function handleCreateOption(
    field: TemplateField,
  ) {
    if (
      !session?.access_token ||
      !selectedTemplate ||
      !configuration
    ) {
      return;
    }

    if (!field.allow_new_options) {
      alert(
        `${field.field_label} no permite crear nuevas opciones.`,
      );
      return;
    }

    if (field.option_catalog_id) {
      const confirmed =
        window.confirm(
          `${field.field_label} es un catálogo transversal.\n\n` +
          "El nuevo valor quedará disponible en todas las clasificaciones vinculadas a este catálogo.\n\n" +
          "¿Deseas continuar?",
        );

      if (!confirmed) {
        return;
      }
    }

    const value = window.prompt(
      field.option_catalog_id
        ? `Nuevo valor TRANSVERSAL para ${field.field_label}:`
        : `Nuevo valor para ${field.field_label}:`,
    );

    const name = value?.trim();

    if (!name) {
      return;
    }

    setCreatingOptionFieldKey(
      field.field_key,
    );

    try {
      const response = await fetch(
        "/api/sistema-gestion-calidad/codificacion/opciones",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            template_id:
              selectedTemplate.id,
            field_key:
              field.field_key,
            name,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo crear la nueva opción.",
        );
      }

      /*
       * Recargamos la configuración completa.
       * Así funciona tanto para opciones propias
       * de la plantilla como para catálogos
       * transversales.
       */
      const configurationResponse =
        await fetch(
          "/api/sistema-gestion-calidad/codificacion/configuracion",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

      const configurationPayload =
        await configurationResponse.json();

      if (!configurationResponse.ok) {
        throw new Error(
          configurationPayload.error ||
            "La opción fue creada, pero no se pudo refrescar la configuración.",
        );
      }

      setConfiguration(
        configurationPayload as ConfigurationPayload,
      );

      const createdName =
        String(
          result.data?.name ?? name,
        );

      setDynamicData(
        (current) => ({
          ...current,
          [field.field_key]:
            createdName,
        }),
      );

      alert(
        `${field.field_label}: "${createdName}" creado correctamente.`,
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo crear la nueva opción.",
      );
    } finally {
      setCreatingOptionFieldKey("");
    }
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

  async function handleSave(
    confirmed = false,
  ) {
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

    if (!selectedCategory) {
      alert(
        "No se encontró la configuración de la categoría seleccionada.",
      );
      return;
    }

    if (!inventoryUnit) {
      alert(
        "Debes seleccionar la unidad de medida de inventario.",
      );
      return;
    }

    if (
      !selectedMeasurementUnit
        ?.siigo_unit_code
    ) {
      alert(
        "La unidad seleccionada todavía no tiene equivalencia configurada en SIIGO.",
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

    if (!confirmed) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
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

        unit: inventoryUnit,
        status: "Activo",
        product_type: "Simple",

        supply_type:
          selectedCategory.can_be_manufactured
            ? "Fabricado"
            : selectedCategory.can_be_purchased
              ? "Comprado"
              : "Otro",

        can_be_sold:
          selectedCategory.can_be_sold,

        can_be_purchased:
          selectedCategory.can_be_purchased,

        can_be_manufactured:
          selectedCategory.can_be_manufactured,

        tracks_inventory:
          selectedCategory.tracks_inventory,

        tracks_lots:
          selectedCategory.tracks_lots,

        tracks_serials:
          selectedCategory.tracks_serials,

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
                      <div className="space-y-2">
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

                        {field.allow_new_options && (
                          <button
                            type="button"
                            disabled={
                              creatingOptionFieldKey ===
                              field.field_key
                            }
                            onClick={() =>
                              handleCreateOption(
                                field,
                              )
                            }
                            className="inline-flex items-center rounded-lg border border-[#07076b]/15 bg-[#07076b]/5 px-3 py-2 text-xs font-semibold text-[#07076b] transition hover:bg-[#07076b]/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {creatingOptionFieldKey ===
                            field.field_key
                              ? "Creando..."
                              : getNewOptionButtonLabel(
                                  field,
                                )}
                          </button>
                        )}
                      </div>
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

        <div className="mt-7 max-w-xl">
          <Field label="Unidad de medida de inventario *">
            <select
              value={inventoryUnit}
              onChange={(event) =>
                setInventoryUnit(event.target.value)
              }
              className={inputClassName}
            >
              <option value="">
                Seleccionar unidad de medida
              </option>

              {configuration.measurement_units.map(
                (unit) => (
                  <option
                    key={unit.id}
                    value={unit.code}
                    disabled={
                      !unit.siigo_unit_code
                    }
                  >
                    {unit.code} · {unit.name} ({unit.symbol})
                    {unit.siigo_unit_code
                      ? ` → SIIGO ${unit.siigo_unit_code}`
                      : " · Sin equivalencia SIIGO"}
                  </option>
                ),
              )}
            </select>

            {selectedMeasurementUnit && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold text-[#07076b]">
                  Equivalencia para SIIGO
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  CLAP:{" "}
                  <strong>
                    {selectedMeasurementUnit.code} ·{" "}
                    {selectedMeasurementUnit.name}
                  </strong>
                  {" → "}
                  SIIGO:{" "}
                  <strong>
                    {selectedMeasurementUnit.siigo_unit_code ??
                      "Sin equivalencia configurada"}
                  </strong>
                </p>
              </div>
            )}

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Unidad oficial utilizada por inventarios, entradas,
              salidas, Kardex y demás movimientos del producto.
            </p>
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
          onClick={() => handleSave(false)}
          disabled={
            isSaving ||
            !selectedTemplate ||
            !generatedPreview.isValidLength ||
            !inventoryUnit
          }
          className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#07076b]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Creando código..."
            : "Crear código"}
        </button>
      </section>
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-product-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                Confirmación final
              </p>

              <h2
                id="confirm-product-title"
                className="mt-2 text-2xl font-bold text-[#07076b]"
              >
                Confirmar creación oficial
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Revisa cuidadosamente la información. Al confirmar,
                este producto será creado oficialmente en CLAP y se
                iniciará su sincronización con SIIGO.
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-2xl border border-[#07076b]/10 bg-[#07076b]/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Código oficial
                </p>

                <p className="mt-2 break-all text-lg font-bold text-[#07076b]">
                  {generatedPreview.reference}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Nombre oficial
                </p>

                <p className="mt-2 text-base font-semibold leading-6 text-gray-900">
                  {generatedPreview.name || "—"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Categoría
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {selectedCategory.code} · {selectedCategory.name}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Grupo
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {selectedGroup
                      ? `${selectedGroup.code} · ${selectedGroup.name}`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Subgrupo
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {selectedSubgroup
                      ? `${selectedSubgroup.code} · ${selectedSubgroup.name}`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Unidad CLAP
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {selectedMeasurementUnit
                      ? `${selectedMeasurementUnit.code} · ${selectedMeasurementUnit.name} (${selectedMeasurementUnit.symbol})`
                      : inventoryUnit}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Unidad SIIGO
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {selectedMeasurementUnit?.siigo_unit_code || "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Verifica antes de continuar
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Si encuentras un error en el código, nombre,
                  clasificación o unidad, selecciona
                  <strong> Volver a revisar</strong>. Todavía no se
                  creará ningún producto.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm leading-6 text-gray-700">
                  Al confirmar, CLAP volverá a calcular y validar el
                  código en el servidor antes de guardarlo. La vista
                  previa mostrada aquí no sustituye las validaciones
                  del backend.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSaving}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Volver a revisar
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#07076b]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Creando código..."
                  : "Confirmar y crear código"}
              </button>
            </div>
          </div>
        </div>
      )}

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
