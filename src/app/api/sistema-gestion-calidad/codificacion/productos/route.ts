import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API SC Codificación · Maestro de productos:",
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

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

// =========================================================
// GET · Maestro oficial de productos
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "CODIFICACION_VIEW",
    );

    const [
      productsResult,
      categoriesResult,
      groupsResult,
      subgroupsResult,
      templatesResult,
      templateFieldsResult,
      masterFieldsResult,
      requestsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select(`
          id,
          reference,
          name,
          category,
          item_type,
          category_id,
          group_id,
          subgroup_id,
          classification_code,

          product_type,
          supply_type,
          production_process,

          color,
          unit,
          material,
          mouth_size,
          capacity_ml,
          width_cm,
          length_m,
          finish,

          technical_description,
          suggested_price,
          image_url,

          status,

          can_be_sold,
          can_be_purchased,
          can_be_manufactured,

          tracks_inventory,
          tracks_lots,
          tracks_serials,

          requires_formula,
          requires_components,
          requires_route,
          requires_maintenance,
          depreciable,

          dynamic_code_data,
          dynamic_name,
          generated_reference,
          final_code,

          technical_sheet_url,
          technical_sheet_filename,

          item_master_data,
          dian_unit,

          created_at
        `)
        .order("created_at", {
          ascending: false,
        }),

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

      supabaseAdmin
        .from("item_classification_templates")
        .select(`
          id,
          category_code,
          group_code,
          subgroup_code,
          full_code,
          name,
          status
        `),

      supabaseAdmin
        .from("item_classification_template_fields")
        .select(`
          id,
          template_id,
          field_key,
          field_label,
          field_type,
          display_order,
          contributes_to_code,
          contributes_to_name,
          status
        `)
        .order("display_order"),

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
          status
        `)
        .order("display_order"),

      supabaseAdmin
        .from("item_code_requests")
        .select(`
          id,
          request_number,
          requester_area,
          requester_name,
          requester_position,
          request_type,
          status,
          created_product_id,
          created_product_code,
          created_product_name,
          requested_at,
          completed_at
        `)
        .not(
          "created_product_id",
          "is",
          null,
        )
        .order("requested_at", {
          ascending: false,
        }),
    ]);

    const results = [
      productsResult,
      categoriesResult,
      groupsResult,
      subgroupsResult,
      templatesResult,
      templateFieldsResult,
      masterFieldsResult,
      requestsResult,
    ];

    const failed =
      results.find(
        (result) => result.error,
      );

    if (failed?.error) {
      throw new Error(
        `No se pudo consultar el Maestro de productos: ${failed.error.message}`,
      );
    }

    const products =
      productsResult.data ?? [];

    const categories =
      categoriesResult.data ?? [];

    const groups =
      groupsResult.data ?? [];

    const subgroups =
      subgroupsResult.data ?? [];

    const templates =
      templatesResult.data ?? [];

    const templateFields =
      templateFieldsResult.data ?? [];

    const masterFields =
      masterFieldsResult.data ?? [];

    const requests =
      requestsResult.data ?? [];

    const enrichedProducts =
      products.map((product) => {
        const category =
          categories.find(
            (item) =>
              item.id ===
              product.category_id,
          ) ?? null;

        const group =
          groups.find(
            (item) =>
              item.id ===
              product.group_id,
          ) ?? null;

        const subgroup =
          subgroups.find(
            (item) =>
              item.id ===
              product.subgroup_id,
          ) ?? null;

        const template =
          templates.find(
            (item) =>
              item.full_code ===
              product.classification_code,
          ) ?? null;

        const dynamicData =
          asRecord(
            product.dynamic_code_data,
          );

        const productTemplateFields =
          template
            ? templateFields
                .filter(
                  (field) =>
                    field.template_id ===
                    template.id,
                )
                .sort(
                  (a, b) =>
                    a.display_order -
                    b.display_order,
                )
            : [];

        const codeAttributes =
          productTemplateFields.map(
            (field) => ({
              field_key:
                field.field_key,
              field_label:
                field.field_label,
              field_type:
                field.field_type,
              contributes_to_code:
                field.contributes_to_code,
              contributes_to_name:
                field.contributes_to_name,
              value:
                dynamicData[
                  field.field_key
                ] ?? null,
            }),
          );

        const masterData =
          asRecord(
            product.item_master_data,
          );

        const categoryCode =
          category?.code ??
          product.classification_code
            ?.split("-")[0] ??
          "";

        const productMasterFields =
          masterFields
            .filter(
              (field) =>
                field.category_code ===
                categoryCode,
            )
            .sort(
              (a, b) =>
                a.display_order -
                b.display_order,
            );

        const masterDataFields =
  productMasterFields.map(
    (field) => ({
      field_key:
        field.field_key,
      field_label:
        field.field_label,
      field_type:
        field.field_type,
      required:
        field.required,
      status:
        field.status,
      options:
        Array.isArray(field.options)
          ? field.options
          : [],
      value:
        masterData[
          field.field_key
        ] ?? null,
      filename:
        masterData[
          `${field.field_key}_filename`
        ] ?? null,
    }),
  );

        const linkedRequest =
          requests.find(
            (item) =>
              item.created_product_id ===
              product.id,
          ) ?? null;

        return {
          ...product,

          hierarchy: {
            category,
            group,
            subgroup,
          },

          template: template
            ? {
                id: template.id,
                full_code:
                  template.full_code,
                name:
                  template.name,
                status:
                  template.status,
              }
            : null,

          code_attributes:
            codeAttributes,

          master_data_fields:
            masterDataFields,

          linked_request:
            linkedRequest,
        };
      });

    return NextResponse.json({
      products:
        enrichedProducts,

      summary: {
        total:
          enrichedProducts.length,

        active:
          enrichedProducts.filter(
            (product) =>
              product.status ===
              "Activo",
          ).length,

        inactive:
          enrichedProducts.filter(
            (product) =>
              product.status ===
              "Inactivo",
          ).length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// PATCH · Editar datos maestros permitidos del producto
// =========================================================

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function normalizeConfiguredOptions(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      String(item ?? "").trim(),
    )
    .filter(Boolean);
}

export async function PATCH(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "CODIFICACION_EDIT_PRODUCT",
    );

    const body = await request.json();

    const productId =
      normalizeText(body.id);

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "El producto es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (
      !isPlainRecord(
        body.item_master_data,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Los datos maestros enviados no son válidos.",
        },
        { status: 400 },
      );
    }

    const incomingMasterData =
      body.item_master_data;

    if (
      Object.keys(
        incomingMasterData,
      ).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No se enviaron datos maestros para actualizar.",
        },
        { status: 400 },
      );
    }

    // -----------------------------------------------------
    // Producto real
    // -----------------------------------------------------

    const {
      data: product,
      error: productError,
    } = await supabaseAdmin
      .from("products")
      .select(`
        id,
        category_id,
        classification_code,
        item_master_data
      `)
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      throw new Error(
        `No se pudo consultar el producto: ${productError.message}`,
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          error:
            "El producto seleccionado no existe.",
        },
        { status: 404 },
      );
    }

    // -----------------------------------------------------
    // Categoría real del producto
    // -----------------------------------------------------

    let categoryCode = "";

    if (product.category_id) {
      const {
        data: category,
        error: categoryError,
      } = await supabaseAdmin
        .from("item_categories")
        .select(`
          id,
          code,
          name,
          status
        `)
        .eq(
          "id",
          product.category_id,
        )
        .maybeSingle();

      if (categoryError) {
        throw new Error(
          `No se pudo consultar la categoría del producto: ${categoryError.message}`,
        );
      }

      categoryCode =
        category?.code ?? "";
    }

    if (
      !categoryCode &&
      product.classification_code
    ) {
      categoryCode =
        product.classification_code
          .split("-")[0]
          ?.trim() ?? "";
    }

    if (!categoryCode) {
      return NextResponse.json(
        {
          error:
            "No se pudo determinar la categoría oficial del producto.",
        },
        { status: 409 },
      );
    }

    // -----------------------------------------------------
    // Configuración oficial de datos maestros
    // -----------------------------------------------------

    const {
      data: configuredFields,
      error: fieldsError,
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
      .eq(
        "category_code",
        categoryCode,
      )
      .eq("status", "Activo")
      .order("display_order");

    if (fieldsError) {
      throw new Error(
        `No se pudieron consultar los datos maestros configurados: ${fieldsError.message}`,
      );
    }

    const fields =
      configuredFields ?? [];

    const fieldsByKey =
      new Map(
        fields.map((field) => [
          field.field_key,
          field,
        ]),
      );

    const existingMasterData =
      asRecord(
        product.item_master_data,
      );

    const nextMasterData: Record<
      string,
      unknown
    > = {
      ...existingMasterData,
    };

    // -----------------------------------------------------
    // Validar exclusivamente campos configurados
    // -----------------------------------------------------

    for (
      const [
        fieldKey,
        rawValue,
      ] of Object.entries(
        incomingMasterData,
      )
    ) {
      const field =
        fieldsByKey.get(fieldKey);

      if (!field) {
        return NextResponse.json(
          {
            error:
              `El dato maestro "${fieldKey}" no existe o no está activo para la categoría ${categoryCode}.`,
          },
          { status: 400 },
        );
      }

      // Archivos tendrán API independiente.
      if (
        field.field_type ===
          "image" ||
        field.field_type === "pdf"
      ) {
        return NextResponse.json(
          {
            error:
              `${field.field_label} es un archivo y debe gestionarse mediante la carga segura de documentos.`,
          },
          { status: 400 },
        );
      }

      if (
        field.field_type ===
          "text" ||
        field.field_type ===
          "textarea"
      ) {
        const value =
          normalizeText(rawValue);

        if (
          field.required &&
          !value
        ) {
          return NextResponse.json(
            {
              error:
                `${field.field_label} es obligatorio.`,
            },
            { status: 400 },
          );
        }

        if (value) {
          nextMasterData[
            field.field_key
          ] = value;
        } else {
          delete nextMasterData[
            field.field_key
          ];
        }

        continue;
      }

      if (
        field.field_type ===
        "number"
      ) {
        const textValue =
          normalizeText(rawValue);

        if (!textValue) {
          if (field.required) {
            return NextResponse.json(
              {
                error:
                  `${field.field_label} es obligatorio.`,
              },
              { status: 400 },
            );
          }

          delete nextMasterData[
            field.field_key
          ];

          continue;
        }

        const numericValue =
          Number(
            textValue.replace(
              ",",
              ".",
            ),
          );

        if (
          !Number.isFinite(
            numericValue,
          )
        ) {
          return NextResponse.json(
            {
              error:
                `${field.field_label} debe ser un número válido.`,
            },
            { status: 400 },
          );
        }

        nextMasterData[
          field.field_key
        ] = String(
          numericValue,
        );

        continue;
      }

      if (
        field.field_type ===
        "select"
      ) {
        const value =
          normalizeText(rawValue);

        if (!value) {
          if (field.required) {
            return NextResponse.json(
              {
                error:
                  `${field.field_label} es obligatorio.`,
              },
              { status: 400 },
            );
          }

          delete nextMasterData[
            field.field_key
          ];

          continue;
        }

        const options =
          normalizeConfiguredOptions(
            field.options,
          );

        const canonicalOption =
          options.find(
            (option) =>
              option.localeCompare(
                value,
                "es",
                {
                  sensitivity:
                    "base",
                },
              ) === 0,
          );

        if (!canonicalOption) {
          return NextResponse.json(
            {
              error:
                `${field.field_label} contiene una opción no permitida.`,
            },
            { status: 400 },
          );
        }

        nextMasterData[
          field.field_key
        ] = canonicalOption;

        continue;
      }

      return NextResponse.json(
        {
          error:
            `El tipo de dato maestro "${field.field_type}" todavía no está habilitado para edición.`,
        },
        { status: 400 },
      );
    }

    // -----------------------------------------------------
    // Validar requeridos editables después de mezclar
    // -----------------------------------------------------

    for (const field of fields) {
      if (
        !field.required ||
        field.field_type ===
          "image" ||
        field.field_type === "pdf"
      ) {
        continue;
      }

      const value =
        nextMasterData[
          field.field_key
        ];

      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
      ) {
        return NextResponse.json(
          {
            error:
              `${field.field_label} es obligatorio.`,
          },
          { status: 400 },
        );
      }
    }

    // -----------------------------------------------------
    // ÚNICA columna actualizable desde este endpoint
    // -----------------------------------------------------

    const {
      data: updatedProduct,
      error: updateError,
    } = await supabaseAdmin
      .from("products")
      .update({
        item_master_data:
          nextMasterData,
      })
      .eq("id", product.id)
      .select(`
        id,
        final_code,
        name,
        item_master_data
      `)
      .single();

    if (updateError) {
      throw new Error(
        `No se pudo actualizar el producto: ${updateError.message}`,
      );
    }

    return NextResponse.json({
      product: updatedProduct,
      message:
        "Datos maestros actualizados correctamente.",
    });
  } catch (error) {
    return handleError(error);
  }
}
