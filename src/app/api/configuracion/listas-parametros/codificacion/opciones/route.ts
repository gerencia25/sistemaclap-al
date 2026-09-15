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

// =========================================================
// GET · Consultar opciones de clasificación
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
      optionsResult,
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
          status
        `)
        .order("display_order"),

      supabaseAdmin
        .from("item_classification_field_options")
        .select(`
          id,
          template_id,
          field_key,
          code,
          name,
          status,
          created_at
        `),
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

    if (optionsResult.error) {
      throw new Error(
        `Error consultando opciones: ${optionsResult.error.message}`,
      );
    }

    const templates =
      templatesResult.data ?? [];

    const fields =
      fieldsResult.data ?? [];

    const options =
      optionsResult.data ?? [];

    const data =
      templates.map((template) => {
        const templateFields =
          fields
            .filter(
              (field) =>
                field.template_id === template.id &&
                field.field_type === "select",
            )
            .sort(
              (a, b) =>
                a.display_order - b.display_order,
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
                    String(a.code).localeCompare(
                      String(b.code),
                      undefined,
                      {
                        numeric: true,
                      },
                    ),
                  );

              return {
                ...field,
                options: fieldOptions,
                options_count:
                  fieldOptions.length,
                active_options_count:
                  fieldOptions.filter(
                    (option) =>
                      option.status === "Activo",
                  ).length,
              };
            });

        return {
          ...template,
          fields: templateFields,
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
// POST · Crear opción de clasificación
// =========================================================

export async function POST(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body =
      await request.json();

    const templateId =
      normalizeText(body.template_id);

    const fieldKey =
      normalizeFieldKey(body.field_key);

    const name =
      normalizeText(body.name);

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
      data,
      error,
    } = await supabaseAdmin.rpc(
      "config_create_classification_option",
      {
        p_template_id: templateId,
        p_field_key: fieldKey,
        p_name: name,
      },
    );

    if (error) {
      const message =
        error.message ??
        "No se pudo crear la opción.";

      if (
        message
          .toLowerCase()
          .includes("ya existe")
      ) {
        return NextResponse.json(
          { error: message },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: message },
        { status: 400 },
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
// PATCH · Activar / inactivar opción de clasificación
// =========================================================

export async function PATCH(request: Request) {
  try {
    await requireSystemPermission(
      request,
      REQUIRED_PERMISSION,
    );

    const body = await request.json();

    const id =
      normalizeText(body.id);

    const status =
      normalizeText(body.status);

    if (!id) {
      return NextResponse.json(
        {
          error:
            "La opción es obligatoria.",
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
            "El estado debe ser Activo o Inactivo.",
        },
        { status: 400 },
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("item_classification_field_options")
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
      data,
      error,
    } = await supabaseAdmin
      .from("item_classification_field_options")
      .update({
        status,
      })
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

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return handleError(error);
  }
}
