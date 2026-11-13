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
    "API Configuración Codificación · Opciones:",
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

function normalizeFieldKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

async function fetchAllClassificationOptionsForAdmin() {
  const rows: Array<{
    id: string;
    template_id: string;
    field_key: string;
    code: string;
    name: string;
    status: string;
    created_at: string;
  }> = [];

  const pageSize = 1000;

  for (
    let from = 0;
    ;
    from += pageSize
  ) {
    const { data, error } =
      await supabaseAdmin
        .from(
          "item_classification_field_options",
        )
        .select(`
          id,
          template_id,
          field_key,
          code,
          name,
          status,
          created_at
        `)
        .order("code")
        .order("id")
        .range(
          from,
          from + pageSize - 1,
        );

    if (error) {
      throw new Error(
        `Error consultando opciones: ${error.message}`,
      );
    }

    const page = data ?? [];

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

// =========================================================
// GET
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const [
      templatesResult,
      fieldsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("item_classification_templates")
        .select(`
          id,
          full_code,
          name,
          status,
          numeric_code_length
        `)
        .order("full_code"),

      supabaseAdmin
        .from(
          "item_classification_template_fields",
        )
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
          option_catalog_id
        `)
        .order("display_order"),
    ]);

    if (templatesResult.error) {
      throw new Error(
        `Error consultando plantillas: ${templatesResult.error.message}`,
      );
    }

    if (fieldsResult.error) {
      throw new Error(
        `Error consultando campos: ${fieldsResult.error.message}`,
      );
    }

    const templates =
      templatesResult.data ?? [];

    const fields =
      fieldsResult.data ?? [];

    /*
     * Hay más de 1.000 opciones activas/inactivas.
     * Se consultan paginadas para no truncar la
     * administración de catálogos.
     */
    const options =
      await fetchAllClassificationOptionsForAdmin();

    const data =
      templates.map((template) => {
        const templateFields =
          fields
            .filter(
              (field) =>
                field.template_id ===
                  template.id &&
                field.field_type ===
                  "select",
            )
            .sort(
              (a, b) =>
                a.display_order -
                b.display_order,
            )
            .map((field) => {
              const fieldOptions =
                options
                  .filter(
                    (option) =>
                      option.template_id ===
                        template.id &&
                      option.field_key ===
                        field.field_key,
                  )
                  .sort((a, b) =>
                    String(a.code)
                      .localeCompare(
                        String(b.code),
                        undefined,
                        {
                          numeric: true,
                        },
                      ),
                  );

              return {
                ...field,

                options:
                  fieldOptions,

                options_count:
                  fieldOptions.length,

                active_options_count:
                  fieldOptions.filter(
                    (option) =>
                      option.status ===
                      "Activo",
                  ).length,

                options_scope:
                  field.option_catalog_id
                    ? "Transversal"
                    : "Plantilla",
              };
            });

        return {
          ...template,

          fields:
            templateFields,

          fields_count:
            templateFields.length,

          options_count:
            templateFields.reduce(
              (total, field) =>
                total +
                field.options_count,
              0,
            ),
        };
      });

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body =
      await request.json();

    const templateId =
      normalizeText(
        body.template_id,
      );

    const fieldKey =
      normalizeFieldKey(
        body.field_key,
      );

    const name =
      normalizeText(
        body.name,
      );

    if (!templateId) {
      return NextResponse.json(
        {
          error:
            "La plantilla es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!fieldKey) {
      return NextResponse.json(
        {
          error:
            "El campo es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "El nombre de la opción es obligatorio.",
        },
        { status: 400 },
      );
    }

    const {
      data: field,
      error: fieldError,
    } = await supabaseAdmin
      .from(
        "item_classification_template_fields",
      )
      .select(`
        id,
        template_id,
        field_key,
        field_label,
        field_type,
        code_length,
        allow_new_options,
        status,
        option_catalog_id
      `)
      .eq(
        "template_id",
        templateId,
      )
      .eq(
        "field_key",
        fieldKey,
      )
      .maybeSingle();

    if (fieldError) {
      throw new Error(
        `No se pudo consultar el campo: ${fieldError.message}`,
      );
    }

    if (!field) {
      return NextResponse.json(
        {
          error:
            "El campo seleccionado no existe.",
        },
        { status: 404 },
      );
    }

    if (
      field.status !== "Activo"
    ) {
      return NextResponse.json(
        {
          error:
            "El campo seleccionado está inactivo.",
        },
        { status: 409 },
      );
    }

    if (
      !field.allow_new_options
    ) {
      return NextResponse.json(
        {
          error:
            "Este campo no permite crear nuevas opciones.",
        },
        { status: 409 },
      );
    }

    // -----------------------------------------------------
    // CATÁLOGO TRANSVERSAL
    // -----------------------------------------------------

    if (
      field.option_catalog_id
    ) {
      const {
        data: created,
        error: createError,
      } = await supabaseAdmin.rpc(
        "config_create_shared_catalog_option",
        {
          p_catalog_id:
            field.option_catalog_id,

          p_name:
            name,

          p_code_length:
            field.code_length,
        },
      );

      if (createError) {
        const message =
          createError.message ??
          "No se pudo crear la opción transversal.";

        return NextResponse.json(
          { error: message },
          {
            status:
              message
                .toLowerCase()
                .includes(
                  "ya existe",
                )
                ? 409
                : 400,
          },
        );
      }

      const sharedOption =
        Array.isArray(created)
          ? created[0]
          : created;

      /*
       * El trigger ya creó el espejo para todas las
       * plantillas. Recuperamos la fila correspondiente
       * a esta plantilla para mantener la respuesta
       * compatible con la interfaz actual.
       */
      const {
        data: mirrored,
        error: mirrorError,
      } = await supabaseAdmin
        .from(
          "item_classification_field_options",
        )
        .select(`
          id,
          template_id,
          field_key,
          code,
          name,
          status,
          created_at
        `)
        .eq(
          "template_id",
          templateId,
        )
        .eq(
          "field_key",
          fieldKey,
        )
        .eq(
          "code",
          sharedOption.code,
        )
        .single();

      if (mirrorError) {
        throw new Error(
          `El catálogo se actualizó, pero no se pudo consultar su espejo: ${mirrorError.message}`,
        );
      }

      console.info(
        `Opción transversal creada por ${systemUser.email}: ${field.field_label} · ${mirrored.code} · ${mirrored.name}`,
      );

      return NextResponse.json(
        {
          data: mirrored,
          scope:
            "Transversal",
        },
        { status: 201 },
      );
    }

    // -----------------------------------------------------
    // OPCIÓN ESPECÍFICA DE PLANTILLA
    // -----------------------------------------------------

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "config_create_classification_option",
      {
        p_template_id:
          templateId,

        p_field_key:
          fieldKey,

        p_name:
          name,
      },
    );

    if (error) {
      const message =
        error.message ??
        "No se pudo crear la opción.";

      return NextResponse.json(
        { error: message },
        {
          status:
            message
              .toLowerCase()
              .includes(
                "ya existe",
              )
              ? 409
              : 400,
        },
      );
    }

    return NextResponse.json(
      {
        data,
        scope:
          "Plantilla",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// PATCH
// =========================================================

export async function PATCH(request: Request) {
  try {
    const systemUser =
      await requireSystemPermission(
        request,
        REQUIRED_PERMISSION,
      );

    const body =
      await request.json();

    const id =
      normalizeText(
        body.id,
      );

    const hasName =
      body.name !== undefined;

    const hasStatus =
      body.status !== undefined;

    const name =
      hasName
        ? normalizeText(
            body.name,
          ).toUpperCase()
        : "";

    const status =
      hasStatus
        ? normalizeText(
            body.status,
          )
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "La opción es obligatoria.",
        },
        { status: 400 },
      );
    }

    if (!hasName && !hasStatus) {
      return NextResponse.json(
        {
          error:
            "Debes indicar el nombre o el estado a actualizar.",
        },
        { status: 400 },
      );
    }

    if (hasName && !name) {
      return NextResponse.json(
        {
          error:
            "El nombre no puede quedar vacío.",
        },
        { status: 400 },
      );
    }

    if (
      hasStatus &&
      status !== "Activo" &&
      status !== "Inactivo"
    ) {
      return NextResponse.json(
        {
          error:
            "El estado debe ser Activo o Inactivo.",
        },
        { status: 400 },
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from(
        "item_classification_field_options",
      )
      .select(`
        id,
        template_id,
        field_key,
        code,
        name,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `No se pudo consultar la opción: ${existingError.message}`,
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "La opción seleccionada no existe.",
        },
        { status: 404 },
      );
    }

    const {
      data: field,
      error: fieldError,
    } = await supabaseAdmin
      .from(
        "item_classification_template_fields",
      )
      .select(`
        id,
        option_catalog_id,
        field_label
      `)
      .eq(
        "template_id",
        existing.template_id,
      )
      .eq(
        "field_key",
        existing.field_key,
      )
      .maybeSingle();

    if (fieldError) {
      throw new Error(
        `No se pudo consultar el campo: ${fieldError.message}`,
      );
    }

    /*
     * =====================================================
     * CATÁLOGO TRANSVERSAL
     * =====================================================
     */

    if (
      field?.option_catalog_id
    ) {
      if (
        hasName &&
        name !== existing.name
      ) {
        const {
          data: duplicate,
          error: duplicateError,
        } = await supabaseAdmin
          .from(
            "item_option_catalog_values",
          )
          .select("id")
          .eq(
            "catalog_id",
            field.option_catalog_id,
          )
          .ilike(
            "name",
            name,
          )
          .neq(
            "code",
            existing.code,
          )
          .limit(1)
          .maybeSingle();

        if (duplicateError) {
          throw new Error(
            `No se pudo validar el nombre transversal: ${duplicateError.message}`,
          );
        }

        if (duplicate) {
          return NextResponse.json(
            {
              error:
                `Ya existe una opción transversal llamada "${name}".`,
            },
            { status: 409 },
          );
        }
      }

      const updates: Record<
        string,
        unknown
      > = {
        updated_at:
          new Date().toISOString(),
      };

      if (hasName) {
        updates.name = name;
      }

      if (hasStatus) {
        updates.status = status;
      }

      const {
        data: shared,
        error: sharedError,
      } = await supabaseAdmin
        .from(
          "item_option_catalog_values",
        )
        .update(updates)
        .eq(
          "catalog_id",
          field.option_catalog_id,
        )
        .eq(
          "code",
          existing.code,
        )
        .select(`
          id,
          catalog_id,
          code,
          name,
          status
        `)
        .single();

      if (sharedError) {
        throw new Error(
          `No se pudo actualizar la opción transversal: ${sharedError.message}`,
        );
      }

      /*
       * El trigger sincroniza todos los espejos
       * vinculados al catálogo transversal.
       */
      const {
        data: mirrored,
        error: mirrorError,
      } = await supabaseAdmin
        .from(
          "item_classification_field_options",
        )
        .select(`
          id,
          template_id,
          field_key,
          code,
          name,
          status
        `)
        .eq("id", id)
        .single();

      if (mirrorError) {
        throw new Error(
          `La opción transversal se actualizó, pero no se pudo consultar su espejo: ${mirrorError.message}`,
        );
      }

      console.info(
        `Opción transversal actualizada por ${systemUser.email}: ${field.field_label} · ${shared.code} · ${shared.name} · ${shared.status}`,
      );

      return NextResponse.json({
        data: mirrored,
        scope:
          "Transversal",
      });
    }

    /*
     * =====================================================
     * OPCIÓN LOCAL DE PLANTILLA
     * =====================================================
     */

    if (
      hasName &&
      name !== existing.name
    ) {
      const {
        data: duplicate,
        error: duplicateError,
      } = await supabaseAdmin
        .from(
          "item_classification_field_options",
        )
        .select("id")
        .eq(
          "template_id",
          existing.template_id,
        )
        .eq(
          "field_key",
          existing.field_key,
        )
        .ilike(
          "name",
          name,
        )
        .neq(
          "id",
          id,
        )
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        throw new Error(
          `No se pudo validar el nombre: ${duplicateError.message}`,
        );
      }

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              `Ya existe una opción llamada "${name}" en este campo.`,
          },
          { status: 409 },
        );
      }
    }

    const updates: Record<
      string,
      unknown
    > = {};

    if (hasName) {
      updates.name = name;
    }

    if (hasStatus) {
      updates.status = status;
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "item_classification_field_options",
      )
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        template_id,
        field_key,
        code,
        name,
        status
      `)
      .single();

    if (error) {
      throw new Error(
        `No se pudo actualizar la opción: ${error.message}`,
      );
    }

    console.info(
      `Opción local actualizada por ${systemUser.email}: ${field?.field_label ?? existing.field_key} · ${data.code} · ${data.name} · ${data.status}`,
    );

    return NextResponse.json({
      data,
      scope:
        "Plantilla",
    });
  } catch (error) {
    return handleError(error);
  }
}
