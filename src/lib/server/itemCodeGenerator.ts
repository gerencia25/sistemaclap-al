import { supabaseAdmin } from "@/lib/supabaseAdmin";

type GenerateItemCodeInput = {
  categoryId: string;
  groupId: string;
  subgroupId: string;
  dynamicData: Record<string, string>;
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

function normalizeText(value: string) {
  return value.trim().toUpperCase();
}

function padCode(value: string, length: number) {
  const cleanValue = String(value).trim();

  if (cleanValue.length > length) {
    throw new Error(
      `El valor ${cleanValue} supera la longitud configurada de ${length} dígitos.`,
    );
  }

  return cleanValue.padStart(length, "0");
}

function formatValueForName(
  field: TemplateField,
  value: string,
) {
  const cleanValue = normalizeText(value);
  const label = field.field_label.toLowerCase();

  if (label.includes("kg")) {
    const numericValue = Number(
      String(value).replace(/\D/g, ""),
    );

    return numericValue
      ? `${numericValue} KG`
      : cleanValue;
  }

  if (label.includes("g]")) {
    const numericValue = Number(
      String(value).replace(/\D/g, ""),
    );

    return numericValue
      ? `${numericValue}G`
      : cleanValue;
  }

  return cleanValue;
}

export async function generateOfficialItemCode(
  input: GenerateItemCodeInput,
) {
  const {
    data: category,
    error: categoryError,
  } = await supabaseAdmin
    .from("item_categories")
    .select("id, code, name, status")
    .eq("id", input.categoryId)
    .eq("status", "Activo")
    .maybeSingle();

  if (categoryError) {
    throw new Error(
      `Error consultando categoría: ${categoryError.message}`,
    );
  }

  if (!category) {
    throw new Error(
      "La categoría seleccionada no existe o está inactiva.",
    );
  }

  const {
    data: group,
    error: groupError,
  } = await supabaseAdmin
    .from("item_groups")
    .select("id, category_id, code, name, status")
    .eq("id", input.groupId)
    .eq("category_id", category.id)
    .eq("status", "Activo")
    .maybeSingle();

  if (groupError) {
    throw new Error(
      `Error consultando grupo: ${groupError.message}`,
    );
  }

  if (!group) {
    throw new Error(
      "El grupo seleccionado no pertenece a la categoría o está inactivo.",
    );
  }

  const {
    data: subgroup,
    error: subgroupError,
  } = await supabaseAdmin
    .from("item_subgroups")
    .select("id, group_id, code, name, status")
    .eq("id", input.subgroupId)
    .eq("group_id", group.id)
    .eq("status", "Activo")
    .maybeSingle();

  if (subgroupError) {
    throw new Error(
      `Error consultando subgrupo: ${subgroupError.message}`,
    );
  }

  if (!subgroup) {
    throw new Error(
      "El subgrupo seleccionado no pertenece al grupo o está inactivo.",
    );
  }

  const {
    data: templates,
    error: templatesError,
  } = await supabaseAdmin
    .from("item_classification_templates")
    .select(`
      id,
      category_code,
      group_code,
      subgroup_code,
      numeric_code_length,
      status
    `)
    .eq("category_code", category.code)
    .eq("group_code", group.code)
    .eq("subgroup_code", subgroup.code)
    .eq("status", "Activo")
    .limit(2);

  if (templatesError) {
    throw new Error(
      `Error consultando plantilla de codificación: ${templatesError.message}`,
    );
  }

  if (!templates || templates.length === 0) {
    throw new Error(
      "No existe una plantilla de codificación activa para la clasificación seleccionada.",
    );
  }

  if (templates.length > 1) {
    throw new Error(
      "Existe más de una plantilla activa para la misma clasificación.",
    );
  }

  const template = templates[0];

  const {
    data: fieldsData,
    error: fieldsError,
  } = await supabaseAdmin
    .from("item_classification_template_fields")
    .select(`
      id,
      template_id,
      field_key,
      field_label,
      field_type,
      required,
      display_order,
      code_length,
      contributes_to_code,
      contributes_to_name
    `)
    .eq("template_id", template.id)
    .eq("status", "Activo")
    .order("display_order");

  if (fieldsError) {
    throw new Error(
      `Error consultando campos de la plantilla: ${fieldsError.message}`,
    );
  }

  const fields =
    (fieldsData ?? []) as TemplateField[];

  let options: ClassificationOption[] = [];

  if (fields.length > 0) {
    const {
      data: optionsData,
      error: optionsError,
    } = await supabaseAdmin
      .from("item_classification_field_options")
      .select(`
        id,
        template_id,
        field_key,
        code,
        name
      `)
      .eq("template_id", template.id)
      .eq("status", "Activo");

    if (optionsError) {
      throw new Error(
        `Error consultando opciones de codificación: ${optionsError.message}`,
      );
    }

    options =
      (optionsData ?? []) as ClassificationOption[];
  }

  const numericParts: string[] = [];
  const nameParts: string[] = [];
  const normalizedDynamicData:
    Record<string, string> = {};

  for (const field of fields) {
    const rawValue =
      String(
        input.dynamicData?.[field.field_key] ?? "",
      ).trim();

    if (field.required && !rawValue) {
      throw new Error(
        `Debes completar: ${field.field_label}.`,
      );
    }

    if (!rawValue) {
      continue;
    }

    const selectedOption = options.find(
      (option) =>
        option.field_key === field.field_key &&
        normalizeText(option.name) ===
          normalizeText(rawValue),
    );

    if (selectedOption) {
      normalizedDynamicData[field.field_key] =
        selectedOption.name;
    } else {
      normalizedDynamicData[field.field_key] =
        rawValue;
    }

    if (field.contributes_to_code) {
      if (selectedOption) {
        numericParts.push(
          padCode(
            selectedOption.code,
            field.code_length,
          ),
        );
      } else if (field.field_type === "number") {
        const digits =
          String(rawValue).replace(/\D/g, "");

        if (!digits) {
          throw new Error(
            `${field.field_label} debe contener un valor numérico válido.`,
          );
        }

        numericParts.push(
          padCode(
            digits,
            field.code_length,
          ),
        );
      } else {
        throw new Error(
          `La opción "${rawValue}" no es válida para ${field.field_label}.`,
        );
      }
    }

    if (field.contributes_to_name) {
      nameParts.push(
        selectedOption?.name ??
          formatValueForName(
            field,
            rawValue,
          ),
      );
    }
  }

  const numericBlock = numericParts.join("");

  if (
    numericBlock.length !==
    template.numeric_code_length
  ) {
    throw new Error(
      `El bloque numérico debe tener ${template.numeric_code_length} dígitos. Actualmente tiene ${numericBlock.length}.`,
    );
  }

  const classificationCode =
    `${category.code}-${group.code}-${subgroup.code}`;

  const finalCode =
    `${classificationCode}-${numericBlock}`;

  const productName =
    nameParts
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

  if (!productName) {
    throw new Error(
      "La plantilla no generó un nombre válido para el producto.",
    );
  }

  return {
    templateId: template.id,
    categoryId: category.id,
    categoryCode: category.code,
    categoryName: category.name,
    groupId: group.id,
    groupCode: group.code,
    groupName: group.name,
    subgroupId: subgroup.id,
    subgroupCode: subgroup.code,
    subgroupName: subgroup.name,
    classificationCode,
    numericBlock,
    finalCode,
    productName,
    dynamicData: normalizedDynamicData,
  };
}
