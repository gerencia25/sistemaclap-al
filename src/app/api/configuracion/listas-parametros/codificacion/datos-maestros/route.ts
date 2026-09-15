import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

const REQUIRED_PERMISSION =
  "LISTAS_PARAMETROS_MANAGE";

const ALLOWED_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "image",
  "pdf",
] as const;

function handleError(error: unknown) {
  console.error(
    "API Configuración Codificación · Datos maestros:",
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

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeCategoryCode(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function normalizeFieldKey(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeBoolean(
  value: unknown,
  fallback = false,
) {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function normalizeOrder(value: unknown) {
  const number = Number(value);

  return Number.isInteger(number) &&
    number > 0
    ? number
    : null;
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const clean =
    value
      .map((item) =>
        String(item ?? "").trim(),
      )
      .filter(Boolean);

  return Array.from(
    new Map(
      clean.map((item) => [
        item.toLocaleUpperCase("es"),
        item,
      ]),
    ).values(),
  );
}

function isValidFieldKey(value: string) {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

function isAllowedType(
  value: string,
): value is (typeof ALLOWED_TYPES)[number] {
  return ALLOWED_TYPES.includes(
    value as (typeof ALLOWED_TYPES)[number],
  );
}

async function getCategory(
  categoryCode: string,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("item_categories")
    .select(`
      id,
      code,
      name,
      status
    `)
    .eq("code", categoryCode)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar la categoría: ${error.message}`,
    );
  }

  return data;
}

async function getFieldUsage(
  categoryCode: string,
  fieldKey: string,
) {
  const category =
    await getCategory(categoryCode);

  if (!category) {
    return {
      products_count: 0,
      used_values: [] as string[],
    };
  }

  const {
    data: products,
    error,
  } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      item_master_data
    `)
    .eq("category_id", category.id);

  if (error) {
    throw new Error(
      `No se pudo validar el uso del campo maestro: ${error.message}`,
    );
  }

  let productsCount = 0;
  const values = new Set<string>();

  for (const product of products ?? []) {
    const masterData =
      product.item_master_data &&
      typeof product.item_master_data ===
        "object" &&
      !Array.isArray(product.item_master_data)
        ? (product.item_master_data as
            Record<string, unknown>)
        : {};

    if (
      Object.prototype.hasOwnProperty.call(
        masterData,
        fieldKey,
      )
    ) {
      productsCount += 1;

      const value =
        masterData[fieldKey];

      if (
        typeof value === "string" &&
        value.trim()
      ) {
        values.add(value.trim());
      }
    }
  }

  return {
    products_count: productsCount,
    used_values: Array.from(values).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "es",
          {
            sensitivity: "base",
          },
        ),
    ),
  };
}

// =========================================================
// GET · Consultar datos maestros
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const [
      categoriesResult,
      fieldsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("item_categories")
        .select(`
          id,
          code,
          name,
          status
        `)
        .order("name"),

      supabaseAdmin
        .from("item_master_fields")
        .select(`
          id,
          category_code,
          field_key,
          field_label,
          field_type,
          required,
          display_order,
          options,
          status,
          created_at,
          updated_at
        `)
        .order("category_code")
        .order("display_order"),
    ]);

    if (categoriesResult.error) {
      throw new Error(
        `Error consultando categorías: ${categoriesResult.error.message}`,
      );
    }

    if (fieldsResult.error) {
      throw new Error(
        `Error consultando datos maestros: ${fieldsResult.error.message}`,
      );
    }

    const categories =
      categoriesResult.data ?? [];

    const enriched =
      await Promise.all(
        (fieldsResult.data ?? []).map(
          async (field) => {
            const usage =
              await getFieldUsage(
                field.category_code,
                field.field_key,
              );

            const category =
              categories.find(
                (item) =>
                  item.code ===
                  field.category_code,
              ) ?? null;

            return {
              ...field,
              category,
              products_count:
                usage.products_count,
              used_values:
                usage.used_values,
              structure_locked:
                usage.products_count > 0,
            };
          },
        ),
      );

    enriched.sort((a, b) => {
      const categoryCompare =
        String(
          a.category?.name ??
            a.category_code,
        ).localeCompare(
          String(
            b.category?.name ??
              b.category_code,
          ),
          "es",
          {
            sensitivity: "base",
          },
        );

      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      return (
        a.display_order -
        b.display_order
      );
    });

    return NextResponse.json({
      data: enriched,
      categories,
      allowed_types: ALLOWED_TYPES,
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST · Crear dato maestro
// =========================================================

export async function POST(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body =
      await request.json();

    const categoryCode =
      normalizeCategoryCode(
        body.category_code,
      );

    const fieldKey =
      normalizeFieldKey(
        body.field_key,
      );

    const fieldLabel =
      normalizeText(
        body.field_label,
      );

    const fieldType =
      normalizeText(
        body.field_type,
      ).toLowerCase();

    const required =
      normalizeBoolean(
        body.required,
        false,
      );

    const displayOrder =
      normalizeOrder(
        body.display_order,
      );

    const options =
      normalizeOptions(
        body.options,
      );

    if (!categoryCode) {
      return NextResponse.json(
        {
          error:
            "La categoría es obligatoria.",
        },
        { status: 400 },
      );
    }

    const category =
      await getCategory(categoryCode);

    if (!category) {
      return NextResponse.json(
        {
          error:
            "La categoría seleccionada no existe.",
        },
        { status: 400 },
      );
    }

    if (category.status !== "Activo") {
      return NextResponse.json(
        {
          error:
            "La categoría seleccionada está inactiva.",
        },
        { status: 400 },
      );
    }

    if (!fieldKey) {
      return NextResponse.json(
        {
          error:
            "La clave técnica es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!isValidFieldKey(fieldKey)) {
      return NextResponse.json(
        {
          error:
            "La clave técnica debe iniciar con una letra minúscula y solo puede contener letras, números y guion bajo.",
        },
        { status: 400 },
      );
    }

    if (!fieldLabel) {
      return NextResponse.json(
        {
          error:
            "El nombre visible es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedType(fieldType)) {
      return NextResponse.json(
        {
          error:
            "El tipo de campo no es válido.",
        },
        { status: 400 },
      );
    }

    if (!displayOrder) {
      return NextResponse.json(
        {
          error:
            "El orden debe ser un número entero mayor a 0.",
        },
        { status: 400 },
      );
    }

    if (
      fieldType === "select" &&
      options.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Los campos de tipo lista deben tener al menos una opción.",
        },
        { status: 400 },
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("item_master_fields")
      .select("id")
      .eq(
        "category_code",
        categoryCode,
      )
      .eq(
        "field_key",
        fieldKey,
      )
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `No se pudo validar la clave técnica: ${existingError.message}`,
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Ya existe un dato maestro con esa clave técnica para la categoría seleccionada.",
        },
        { status: 409 },
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("item_master_fields")
      .insert({
        category_code:
          categoryCode,
        field_key:
          fieldKey,
        field_label:
          fieldLabel,
        field_type:
          fieldType,
        required,
        display_order:
          displayOrder,
        options:
          fieldType === "select"
            ? options
            : null,
        status: "Activo",
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `No se pudo crear el dato maestro: ${error.message}`,
      );
    }

    return NextResponse.json(
      {
        data,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// PATCH · Editar / activar / inactivar dato maestro
// =========================================================

export async function PATCH(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body =
      await request.json();

    const id =
      normalizeText(body.id);

    if (!id) {
      return NextResponse.json(
        {
          error:
            "El dato maestro es obligatorio.",
        },
        { status: 400 },
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("item_master_fields")
      .select(`
        id,
        category_code,
        field_key,
        field_label,
        field_type,
        required,
        display_order,
        options,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `No se pudo consultar el dato maestro: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "El dato maestro seleccionado no existe.",
        },
        { status: 404 },
      );
    }

    const usage =
      await getFieldUsage(
        existing.category_code,
        existing.field_key,
      );

    const structureLocked =
      usage.products_count > 0;

    const nextCategoryCode =
      body.category_code !== undefined
        ? normalizeCategoryCode(
            body.category_code,
          )
        : existing.category_code;

    const nextFieldKey =
      body.field_key !== undefined
        ? normalizeFieldKey(
            body.field_key,
          )
        : existing.field_key;

    const nextFieldLabel =
      body.field_label !== undefined
        ? normalizeText(
            body.field_label,
          )
        : existing.field_label;

    const nextFieldType =
      body.field_type !== undefined
        ? normalizeText(
            body.field_type,
          ).toLowerCase()
        : existing.field_type;

    const nextRequired =
      body.required !== undefined
        ? normalizeBoolean(
            body.required,
          )
        : existing.required;

    const nextDisplayOrder =
      body.display_order !== undefined
        ? normalizeOrder(
            body.display_order,
          )
        : existing.display_order;

    const nextStatus =
      body.status !== undefined
        ? normalizeText(
            body.status,
          )
        : existing.status;

    const nextOptions =
      body.options !== undefined
        ? normalizeOptions(
            body.options,
          )
        : normalizeOptions(
            existing.options,
          );

    if (
      nextStatus !== "Activo" &&
      nextStatus !== "Inactivo"
    ) {
      return NextResponse.json(
        {
          error:
            "El estado debe ser Activo o Inactivo.",
        },
        { status: 400 },
      );
    }

    if (!nextFieldLabel) {
      return NextResponse.json(
        {
          error:
            "El nombre visible es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!nextDisplayOrder) {
      return NextResponse.json(
        {
          error:
            "El orden debe ser un número entero mayor a 0.",
        },
        { status: 400 },
      );
    }

    if (structureLocked) {
      if (
        nextCategoryCode !==
        existing.category_code
      ) {
        return NextResponse.json(
          {
            error:
              "La categoría está protegida porque este campo ya tiene información registrada en productos.",
          },
          { status: 409 },
        );
      }

      if (
        nextFieldKey !==
        existing.field_key
      ) {
        return NextResponse.json(
          {
            error:
              "La clave técnica está protegida porque este campo ya tiene información registrada en productos.",
          },
          { status: 409 },
        );
      }

      if (
        nextFieldType !==
        existing.field_type
      ) {
        return NextResponse.json(
          {
            error:
              "El tipo de campo está protegido porque este campo ya tiene información registrada en productos.",
          },
          { status: 409 },
        );
      }
    } else {
      const category =
        await getCategory(
          nextCategoryCode,
        );

      if (!category) {
        return NextResponse.json(
          {
            error:
              "La categoría seleccionada no existe.",
          },
          { status: 400 },
        );
      }

      if (!isValidFieldKey(nextFieldKey)) {
        return NextResponse.json(
          {
            error:
              "La clave técnica debe iniciar con una letra minúscula y solo puede contener letras, números y guion bajo.",
          },
          { status: 400 },
        );
      }

      if (!isAllowedType(nextFieldType)) {
        return NextResponse.json(
          {
            error:
              "El tipo de campo no es válido.",
          },
          { status: 400 },
        );
      }

      if (
        nextCategoryCode !==
          existing.category_code ||
        nextFieldKey !==
          existing.field_key
      ) {
        const {
          data: duplicate,
          error: duplicateError,
        } = await supabaseAdmin
          .from("item_master_fields")
          .select("id")
          .eq(
            "category_code",
            nextCategoryCode,
          )
          .eq(
            "field_key",
            nextFieldKey,
          )
          .neq("id", id)
          .maybeSingle();

        if (duplicateError) {
          throw new Error(
            `No se pudo validar la clave técnica: ${duplicateError.message}`,
          );
        }

        if (duplicate) {
          return NextResponse.json(
            {
              error:
                "Ya existe un dato maestro con esa clave técnica para la categoría seleccionada.",
            },
            { status: 409 },
          );
        }
      }
    }

    if (
      nextFieldType === "select"
    ) {
      if (nextOptions.length === 0) {
        return NextResponse.json(
          {
            error:
              "Los campos de tipo lista deben tener al menos una opción.",
          },
          { status: 400 },
        );
      }

      if (structureLocked) {
        const normalizedNext =
          new Set(
            nextOptions.map(
              (option) =>
                option.toLocaleUpperCase(
                  "es",
                ),
            ),
          );

        const missingHistorical =
          usage.used_values.filter(
            (value) =>
              !normalizedNext.has(
                value.toLocaleUpperCase(
                  "es",
                ),
              ),
          );

        if (
          missingHistorical.length > 0
        ) {
          return NextResponse.json(
            {
              error:
                `No puedes eliminar opciones ya utilizadas en productos: ${missingHistorical.join(", ")}.`,
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
      .from("item_master_fields")
      .update({
        category_code:
          nextCategoryCode,
        field_key:
          nextFieldKey,
        field_label:
          nextFieldLabel,
        field_type:
          nextFieldType,
        required:
          nextRequired,
        display_order:
          nextDisplayOrder,
        options:
          nextFieldType === "select"
            ? nextOptions
            : null,
        status:
          nextStatus,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(
        `No se pudo actualizar el dato maestro: ${error.message}`,
      );
    }

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return handleError(error);
  }
}
