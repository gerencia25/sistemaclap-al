import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

const REQUIRED_PERMISSION =
  "LISTAS_PARAMETROS_MANAGE";

function handleError(error: unknown) {
  console.error(
    "API Configuración Codificación · Plantillas:",
    error,
  );

  if (error instanceof ApiAuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado.";

  return NextResponse.json(
    { error: message },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const [
      templatesResult,
      fieldsResult,
      optionsResult,
      categoriesResult,
      groupsResult,
      subgroupsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("item_classification_templates")
        .select(`
          id,
          category_code,
          group_code,
          subgroup_code,
          full_code,
          name,
          code_pattern,
          name_pattern,
          numeric_code_length,
          status,
          created_at,
          updated_at
        `),

      supabaseAdmin
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
          contributes_to_name,
          allow_new_options,
          status,
          created_at
        `)
        .order("display_order"),

      supabaseAdmin
        .from("item_classification_field_options")
        .select(`
          id,
          template_id,
          field_key,
          status
        `),

      supabaseAdmin
        .from("item_categories")
        .select(`
          id,
          code,
          name,
          status
        `),

      supabaseAdmin
        .from("item_groups")
        .select(`
          id,
          category_id,
          code,
          name,
          status
        `),

      supabaseAdmin
        .from("item_subgroups")
        .select(`
          id,
          group_id,
          code,
          name,
          status
        `),
    ]);

    const results = [
      templatesResult,
      fieldsResult,
      optionsResult,
      categoriesResult,
      groupsResult,
      subgroupsResult,
    ];

    const failed =
      results.find((result) => result.error);

    if (failed?.error) {
      throw new Error(
        `No se pudo cargar la configuración de plantillas: ${failed.error.message}`,
      );
    }

    const categories =
      categoriesResult.data ?? [];

    const groups =
      groupsResult.data ?? [];

    const subgroups =
      subgroupsResult.data ?? [];

    const fields =
      fieldsResult.data ?? [];

    const options =
      optionsResult.data ?? [];

    const templates =
      await Promise.all(
        (templatesResult.data ?? []).map(
          async (template) => {
            const category =
              categories.find(
                (item) =>
                  item.code ===
                  template.category_code,
              ) ?? null;

            const group =
              groups.find(
                (item) =>
                  item.category_id === category?.id &&
                  item.code === template.group_code,
              ) ?? null;

            const subgroup =
              subgroups.find(
                (item) =>
                  item.group_id === group?.id &&
                  item.code === template.subgroup_code,
              ) ?? null;

            const templateFields =
              fields
                .filter(
                  (field) =>
                    field.template_id === template.id,
                )
                .map((field) => ({
                  ...field,
                  options_count:
                    options.filter(
                      (option) =>
                        option.template_id ===
                          template.id &&
                        option.field_key ===
                          field.field_key,
                    ).length,
                }))
                .sort(
                  (a, b) =>
                    a.display_order -
                    b.display_order,
                );

            const { count, error } =
              await supabaseAdmin
                .from("products")
                .select("id", {
                  count: "exact",
                  head: true,
                })
                .eq(
                  "classification_code",
                  template.full_code,
                );

            if (error) {
              throw new Error(
                `No se pudieron validar los productos de ${template.full_code}: ${error.message}`,
              );
            }

            const calculatedLength =
              templateFields
                .filter(
                  (field) =>
                    field.status === "Activo" &&
                    field.contributes_to_code,
                )
                .reduce(
                  (total, field) =>
                    total +
                    Number(field.code_length ?? 0),
                  0,
                );

            return {
              ...template,
              category,
              group,
              subgroup,
              fields: templateFields,
              fields_count:
                templateFields.length,
              products_count: count ?? 0,
              structure_locked:
                (count ?? 0) > 0,
              calculated_numeric_code_length:
                calculatedLength,
              length_is_consistent:
                calculatedLength ===
                template.numeric_code_length,
            };
          },
        ),
      );

    templates.sort((a, b) => {
      const categoryComparison =
        (a.category?.name ?? a.category_code)
          .localeCompare(
            b.category?.name ??
              b.category_code,
            "es",
            { sensitivity: "base" },
          );

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      const groupComparison =
        (a.group?.name ?? a.group_code)
          .localeCompare(
            b.group?.name ??
              b.group_code,
            "es",
            { sensitivity: "base" },
          );

      if (groupComparison !== 0) {
        return groupComparison;
      }

      return (
        a.subgroup?.name ??
        a.subgroup_code
      ).localeCompare(
        b.subgroup?.name ??
          b.subgroup_code,
        "es",
        { sensitivity: "base" },
      );
    });

    return NextResponse.json({
      data: templates,
      hierarchy: {
        categories,
        groups,
        subgroups,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST · Crear plantilla + campos de forma atómica
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body = await request.json();

    const categoryId =
      String(body.category_id ?? "").trim();

    const groupId =
      String(body.group_id ?? "").trim();

    const subgroupId =
      String(body.subgroup_id ?? "").trim();

    const rawFields =
      Array.isArray(body.fields)
        ? body.fields
        : [];

    if (!categoryId) {
      return NextResponse.json(
        {
          error:
            "La categoría es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!groupId) {
      return NextResponse.json(
        {
          error:
            "El grupo es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!subgroupId) {
      return NextResponse.json(
        {
          error:
            "El subgrupo es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (rawFields.length === 0) {
      return NextResponse.json(
        {
          error:
            "La plantilla debe tener al menos un campo.",
        },
        { status: 400 },
      );
    }

    const seenKeys = new Set<string>();
    const seenOrders = new Set<number>();

    let hasCodeContribution = false;
    let hasNameContribution = false;

    const fields = rawFields.map(
      (
        rawField: Record<string, unknown>,
        index: number,
      ) => {
        const fieldKey =
          String(rawField.field_key ?? "")
            .trim()
            .toLowerCase();

        const fieldLabel =
          String(rawField.field_label ?? "")
            .trim();

        const fieldType =
          String(
            rawField.field_type ?? "select",
          )
            .trim()
            .toLowerCase();

        const required =
          rawField.required === undefined
            ? true
            : Boolean(rawField.required);

        const displayOrder =
          Number(
            rawField.display_order ??
              index + 1,
          );

        const codeLength =
          Number(
            rawField.code_length ?? 0,
          );

        const contributesToCode =
          rawField.contributes_to_code === undefined
            ? true
            : Boolean(
                rawField.contributes_to_code,
              );

        const contributesToName =
          rawField.contributes_to_name === undefined
            ? true
            : Boolean(
                rawField.contributes_to_name,
              );

        const allowNewOptions =
          rawField.allow_new_options === undefined
            ? true
            : Boolean(
                rawField.allow_new_options,
              );

        if (!fieldKey) {
          throw new Error(
            `El campo ${index + 1} debe tener una clave.`,
          );
        }

        if (
          !/^[a-z][a-z0-9_]*$/.test(
            fieldKey,
          )
        ) {
          throw new Error(
            `La clave "${fieldKey}" no es válida. Usa letras minúsculas, números y guion bajo.`,
          );
        }

        if (seenKeys.has(fieldKey)) {
          throw new Error(
            `La clave "${fieldKey}" está repetida.`,
          );
        }

        seenKeys.add(fieldKey);

        if (!fieldLabel) {
          throw new Error(
            `El campo "${fieldKey}" debe tener un nombre visible.`,
          );
        }

        if (
          !["select", "number"].includes(
            fieldType,
          )
        ) {
          throw new Error(
            `El tipo "${fieldType}" no está permitido.`,
          );
        }

        if (
          !Number.isInteger(
            displayOrder,
          ) ||
          displayOrder <= 0
        ) {
          throw new Error(
            `El campo "${fieldLabel}" debe tener un orden entero mayor a 0.`,
          );
        }

        if (
          seenOrders.has(
            displayOrder,
          )
        ) {
          throw new Error(
            `El orden ${displayOrder} está repetido.`,
          );
        }

        seenOrders.add(
          displayOrder,
        );

        if (contributesToCode) {
          hasCodeContribution = true;

          if (!required) {
            throw new Error(
              `El campo "${fieldLabel}" aporta al código y debe ser obligatorio.`,
            );
          }

          if (
            !Number.isInteger(
              codeLength,
            ) ||
            codeLength <= 0
          ) {
            throw new Error(
              `El campo "${fieldLabel}" debe tener una longitud entera mayor a 0.`,
            );
          }
        }

        if (contributesToName) {
          hasNameContribution = true;
        }

        return {
          field_key: fieldKey,
          field_label: fieldLabel,
          field_type: fieldType,
          required,
          display_order:
            displayOrder,
          code_length:
            contributesToCode
              ? codeLength
              : 0,
          contributes_to_code:
            contributesToCode,
          contributes_to_name:
            contributesToName,
          allow_new_options:
            allowNewOptions,
        };
      },
    );

    if (!hasCodeContribution) {
      return NextResponse.json(
        {
          error:
            "La plantilla debe tener al menos un campo que aporte al código.",
        },
        { status: 400 },
      );
    }

    if (!hasNameContribution) {
      return NextResponse.json(
        {
          error:
            "La plantilla debe tener al menos un campo que aporte al nombre.",
        },
        { status: 400 },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "config_create_classification_template",
      {
        p_category_id:
          categoryId,
        p_group_id:
          groupId,
        p_subgroup_id:
          subgroupId,
        p_fields:
          fields,
      },
    );

    if (error) {
      const message =
        error.message ||
        "No se pudo crear la plantilla.";

      const isConflict =
        message.includes(
          "Ya existe una plantilla",
        );

      return NextResponse.json(
        { error: message },
        {
          status:
            isConflict
              ? 409
              : 400,
        },
      );
    }

    console.info(
      `Plantilla de codificación creada por ${systemUser.email}: ${data?.full_code ?? "sin código"}`,
    );

    return NextResponse.json(
      { data },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// PATCH · Activar / inactivar plantilla
// =========================================================

export async function PATCH(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body = await request.json();

    const id =
      String(body?.id ?? "").trim();

    const status =
      String(body?.status ?? "").trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "No se recibió la plantilla que deseas actualizar.",
        },
        { status: 400 },
      );
    }

    if (
      status !== "Activo" &&
      status !== "Inactivo"
    ) {
      return NextResponse.json(
        {
          error:
            "El estado de la plantilla no es válido.",
        },
        { status: 400 },
      );
    }

    const {
      data: template,
      error: templateError,
    } = await supabaseAdmin
      .from(
        "item_classification_templates",
      )
      .select(`
        id,
        full_code,
        numeric_code_length,
        status
      `)
      .eq("id", id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        {
          error:
            "No se encontró la plantilla.",
        },
        { status: 404 },
      );
    }

    /*
     * Antes de activar validamos que la plantilla
     * realmente esté lista para generar productos.
     */
    if (status === "Activo") {
      const {
        data: fields,
        error: fieldsError,
      } = await supabaseAdmin
        .from(
          "item_classification_template_fields",
        )
        .select(`
          id,
          field_key,
          field_label,
          field_type,
          required,
          code_length,
          contributes_to_code,
          contributes_to_name,
          status
        `)
        .eq("template_id", id)
        .eq("status", "Activo")
        .order("display_order");

      if (fieldsError) {
        throw new Error(
          `No se pudo validar la estructura: ${fieldsError.message}`,
        );
      }

      if (!fields || fields.length === 0) {
        return NextResponse.json(
          {
            error:
              "La plantilla no tiene campos activos.",
          },
          { status: 409 },
        );
      }

      const hasCodeContribution =
        fields.some(
          (field) =>
            field.contributes_to_code,
        );

      const hasNameContribution =
        fields.some(
          (field) =>
            field.contributes_to_name,
        );

      if (!hasCodeContribution) {
        return NextResponse.json(
          {
            error:
              "La plantilla debe tener al menos un campo que aporte al código.",
          },
          { status: 409 },
        );
      }

      if (!hasNameContribution) {
        return NextResponse.json(
          {
            error:
              "La plantilla debe tener al menos un campo que aporte al nombre.",
          },
          { status: 409 },
        );
      }

      const calculatedLength =
        fields
          .filter(
            (field) =>
              field.contributes_to_code,
          )
          .reduce(
            (total, field) =>
              total +
              Number(
                field.code_length ?? 0,
              ),
            0,
          );

      if (
        calculatedLength !==
        Number(
          template.numeric_code_length,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `La longitud configurada (${template.numeric_code_length}) no coincide con la suma de los campos (${calculatedLength}).`,
          },
          { status: 409 },
        );
      }

      /*
       * Un select obligatorio debe tener al menos
       * una opción activa antes de habilitar la plantilla.
       */
      const requiredSelectFields =
        fields.filter(
          (field) =>
            field.field_type ===
              "select" &&
            field.required,
        );

      if (
        requiredSelectFields.length > 0
      ) {
        const {
          data: options,
          error: optionsError,
        } = await supabaseAdmin
          .from(
            "item_classification_field_options",
          )
          .select(`
            id,
            field_key
          `)
          .eq("template_id", id)
          .eq("status", "Activo");

        if (optionsError) {
          throw new Error(
            `No se pudieron validar las opciones: ${optionsError.message}`,
          );
        }

        const fieldsWithoutOptions =
          requiredSelectFields.filter(
            (field) =>
              !(options ?? []).some(
                (option) =>
                  option.field_key ===
                  field.field_key,
              ),
          );

        if (
          fieldsWithoutOptions.length > 0
        ) {
          return NextResponse.json(
            {
              error:
                `Antes de activar debes configurar opciones para: ${fieldsWithoutOptions
                  .map(
                    (field) =>
                      field.field_label,
                  )
                  .join(", ")}.`,
            },
            { status: 409 },
          );
        }
      }
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "item_classification_templates",
      )
      .update({
        status,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        full_code,
        status
      `)
      .single();

    if (error) {
      throw new Error(
        `No se pudo actualizar la plantilla: ${error.message}`,
      );
    }

    console.info(
      `Plantilla ${data.full_code} ${status === "Activo" ? "activada" : "inactivada"} por ${systemUser.email}`,
    );

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return handleError(error);
  }
}
