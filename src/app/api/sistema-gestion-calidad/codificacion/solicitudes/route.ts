import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

const resend = new Resend(
  process.env.RESEND_API_KEY,
);

const ATTACHMENTS_BUCKET =
  "item-code-request-attachments";

const MAX_ATTACHMENT_BYTES =
  10 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES =
  new Map<string, string>([
    ["application/pdf", "pdf"],
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);

function handleError(error: unknown) {
  console.error(
    "API Solicitudes Codificación:",
    error,
  );

  if (
    error instanceof ApiAuthorizationError
  ) {
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

function normalizeText(
  value: unknown,
) {
  return String(value ?? "").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safePathSegment(
  value: string,
) {
  return value
    .trim()
    .replace(
      /[^A-Z0-9_-]/gi,
      "_",
    );
}

async function getRequesterPosition(
  employeeId: string | null,
) {
  if (!employeeId) {
    return "";
  }

  const {
    data: employee,
    error: employeeError,
  } = await supabaseAdmin
    .from("employees")
    .select(`
      id,
      position,
      position_id,
      employment_status
    `)
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) {
    throw new Error(
      `No se pudo consultar el empleado: ${employeeError.message}`,
    );
  }

  if (!employee) {
    return "";
  }

  if (
    employee.employment_status !==
    "Activo"
  ) {
    throw new ApiAuthorizationError(
      "El empleado vinculado al usuario no se encuentra activo.",
      403,
    );
  }

  let positionName =
    employee.position?.trim() ?? "";

  if (employee.position_id) {
    const {
      data: position,
      error: positionError,
    } = await supabaseAdmin
      .from("company_positions")
      .select("name")
      .eq(
        "id",
        employee.position_id,
      )
      .maybeSingle();

    if (positionError) {
      throw new Error(
        `No se pudo consultar el cargo: ${positionError.message}`,
      );
    }

    positionName =
      position?.name?.trim() ||
      positionName;
  }

  return positionName;
}

async function parseCreatePayload(
  request: Request,
) {
  const contentType =
    request.headers.get(
      "content-type",
    ) ?? "";

  if (
    contentType.includes(
      "multipart/form-data",
    )
  ) {
    const formData =
      await request.formData();

    const attachmentValue =
      formData.get("attachment");

    const attachment =
      attachmentValue &&
      typeof attachmentValue !==
        "string" &&
      attachmentValue.size > 0
        ? attachmentValue
        : null;

    return {
      requesterArea: normalizeText(
        formData.get(
          "requester_area",
        ),
      ),
      requestType: normalizeText(
        formData.get(
          "request_type",
        ),
      ),
      requestCategory:
        normalizeText(
          formData.get(
            "request_category",
          ),
        ) || "Producto",
      classificationCode:
        normalizeText(
          formData.get(
            "classification_code",
          ),
        ),
      productCodeToDeactivate:
        normalizeText(
          formData.get(
            "product_code_to_deactivate",
          ),
        ),
      productNameToDeactivate:
        normalizeText(
          formData.get(
            "product_name_to_deactivate",
          ),
        ),
      detailedDescription:
        normalizeText(
          formData.get(
            "detailed_description",
          ),
        ),
      attachment,
    };
  }

  const body =
    await request.json();

  return {
    requesterArea: normalizeText(
      body.requester_area,
    ),
    requestType: normalizeText(
      body.request_type,
    ),
    requestCategory:
      normalizeText(
        body.request_category,
      ) || "Producto",
    classificationCode:
      normalizeText(
        body.classification_code,
      ),
    productCodeToDeactivate:
      normalizeText(
        body.product_code_to_deactivate,
      ),
    productNameToDeactivate:
      normalizeText(
        body.product_name_to_deactivate,
      ),
    detailedDescription:
      normalizeText(
        body.detailed_description,
      ),
    attachment: null as File | null,
  };
}

export async function GET(
  request: Request,
) {
  try {
    await requireSystemPermission(
      request,
      "CODIFICACION_VIEW",
    );

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("item_code_requests")
      .select(`
        id,
        request_number,
        requester_area,
        requester_name,
        requester_position,
        requester_email,
        request_type,
        request_category,
        classification_code,
        classification_name,
        product_id_to_deactivate,
        product_code_to_deactivate,
        product_name_to_deactivate,
        detailed_description,
        attachment_url,
        attachment_filename,
        status,
        created_product_id,
        created_product_code,
        created_product_name,
        requested_at,
        reviewed_at,
        completed_at,
        reviewed_by,
        comments,
        rejected_at,
        rejection_reason
      `)
      .order(
        "requested_at",
        {
          ascending: false,
        },
      );

    if (error) {
      throw new Error(
        `Error consultando solicitudes de código: ${error.message}`,
      );
    }

    return NextResponse.json({
      requests: data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: Request,
) {
  let insertedRequestId:
    | string
    | null = null;

  let uploadedPath:
    | string
    | null = null;

  try {
    const systemUser =
      await requireSystemPermission(
        request,
        "CODIFICACION_REQUEST",
      );

    const payload =
      await parseCreatePayload(
        request,
      );

    if (!payload.requesterArea) {
      return NextResponse.json(
        {
          error:
            "No se identificó el proceso solicitante.",
        },
        { status: 400 },
      );
    }

    if (
      ![
        "Creación",
        "Desactivación",
      ].includes(
        payload.requestType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El tipo de solicitud no es válido.",
        },
        { status: 400 },
      );
    }

    if (
      !payload.classificationCode
    ) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar una clasificación.",
        },
        { status: 400 },
      );
    }

    if (
      !payload.detailedDescription
    ) {
      return NextResponse.json(
        {
          error:
            "Debes ingresar la descripción detallada.",
        },
        { status: 400 },
      );
    }

    if (
      payload.requestType ===
        "Desactivación" &&
      !payload.productCodeToDeactivate
    ) {
      return NextResponse.json(
        {
          error:
            "Debes indicar el código que deseas desactivar.",
        },
        { status: 400 },
      );
    }

    const {
      data: category,
      error: categoryError,
    } = await supabaseAdmin
      .from("item_categories")
      .select(
        "id, code, name",
      )
      .eq(
        "code",
        payload.classificationCode,
      )
      .eq("status", "Activo")
      .maybeSingle();

    if (categoryError) {
      throw new Error(
        `No se pudo validar la clasificación: ${categoryError.message}`,
      );
    }

    if (!category) {
      return NextResponse.json(
        {
          error:
            "La clasificación seleccionada no existe o está inactiva.",
        },
        { status: 400 },
      );
    }

    const {
      data: activeTemplate,
      error: templateError,
    } = await supabaseAdmin
      .from(
        "item_classification_templates",
      )
      .select("id")
      .eq(
        "category_code",
        category.code,
      )
      .eq("status", "Activo")
      .limit(1)
      .maybeSingle();

    if (templateError) {
      throw new Error(
        `No se pudo validar la configuración de la clasificación: ${templateError.message}`,
      );
    }

    if (!activeTemplate) {
      return NextResponse.json(
        {
          error:
            "La clasificación seleccionada no tiene una plantilla activa de codificación.",
        },
        { status: 400 },
      );
    }

    const requesterPosition =
      await getRequesterPosition(
        systemUser.employee_id,
      );

    const {
      data: createdRequest,
      error: insertError,
    } = await supabaseAdmin
      .from("item_code_requests")
      .insert({
        request_number: "",
        requester_area:
          payload.requesterArea,
        requester_name:
          systemUser.full_name,
        requester_position:
          requesterPosition ||
          "No registrado",
        requester_email:
          systemUser.email ||
          null,
        request_type:
          payload.requestType,
        request_category:
          payload.requestCategory,
        classification_code:
          category.code,
        classification_name:
          category.name,
        product_code_to_deactivate:
          payload.requestType ===
          "Desactivación"
            ? payload.productCodeToDeactivate
            : null,
        product_name_to_deactivate:
          payload.requestType ===
          "Desactivación"
            ? payload.productNameToDeactivate ||
              null
            : null,
        detailed_description:
          payload.detailedDescription,
        status: "Pendiente",
      })
      .select(
        "id, request_number",
      )
      .single();

    if (insertError) {
      throw new Error(
        `No se pudo crear la solicitud: ${insertError.message}`,
      );
    }

    insertedRequestId =
      createdRequest.id;

    if (payload.attachment) {
      const extension =
        ALLOWED_ATTACHMENT_TYPES.get(
          payload.attachment.type,
        );

      if (!extension) {
        await supabaseAdmin
          .from(
            "item_code_requests",
          )
          .delete()
          .eq(
            "id",
            createdRequest.id,
          );

        insertedRequestId =
          null;

        return NextResponse.json(
          {
            error:
              "El adjunto debe ser PDF, JPG, PNG o WebP.",
          },
          { status: 400 },
        );
      }

      if (
        payload.attachment.size >
        MAX_ATTACHMENT_BYTES
      ) {
        await supabaseAdmin
          .from(
            "item_code_requests",
          )
          .delete()
          .eq(
            "id",
            createdRequest.id,
          );

        insertedRequestId =
          null;

        return NextResponse.json(
          {
            error:
              "El adjunto no puede superar 10 MB.",
          },
          { status: 400 },
        );
      }

      uploadedPath =
        `${safePathSegment(
          createdRequest.request_number,
        )}/` +
        `${Date.now()}-${randomUUID()}.${extension}`;

      const buffer =
        Buffer.from(
          await payload.attachment.arrayBuffer(),
        );

      const {
        error: uploadError,
      } = await supabaseAdmin.storage
        .from(
          ATTACHMENTS_BUCKET,
        )
        .upload(
          uploadedPath,
          buffer,
          {
            contentType:
              payload.attachment.type,
            upsert: false,
          },
        );

      if (uploadError) {
        await supabaseAdmin
          .from(
            "item_code_requests",
          )
          .delete()
          .eq(
            "id",
            createdRequest.id,
          );

        insertedRequestId =
          null;

        throw new Error(
          `No se pudo cargar el adjunto: ${uploadError.message}`,
        );
      }

      const {
        data: publicUrlData,
      } = supabaseAdmin.storage
        .from(
          ATTACHMENTS_BUCKET,
        )
        .getPublicUrl(
          uploadedPath,
        );

      const {
        error: updateError,
      } = await supabaseAdmin
        .from(
          "item_code_requests",
        )
        .update({
          attachment_url:
            publicUrlData.publicUrl,
          attachment_filename:
            payload.attachment.name,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdRequest.id,
        );

      if (updateError) {
        await supabaseAdmin.storage
          .from(
            ATTACHMENTS_BUCKET,
          )
          .remove([
            uploadedPath,
          ]);

        uploadedPath = null;

        await supabaseAdmin
          .from(
            "item_code_requests",
          )
          .delete()
          .eq(
            "id",
            createdRequest.id,
          );

        insertedRequestId =
          null;

        throw new Error(
          `No se pudo vincular el adjunto: ${updateError.message}`,
        );
      }
    }

    let emailSent = false;

    try {
      const safeRequestNumber =
        escapeHtml(
          createdRequest.request_number,
        );

      const safeRequester =
        escapeHtml(
          systemUser.full_name,
        );

      const safeArea =
        escapeHtml(
          payload.requesterArea,
        );

      const safeClassification =
        escapeHtml(
          `${category.code} - ${category.name}`,
        );

      const {
        error: emailError,
      } = await resend.emails.send({
        from:
          "Sistema CLAP <notificaciones@mail.almultiformas.com>",
        to: [
          "administrador@almultiformas.com",
        ],
        subject:
          `Nueva solicitud de código ${createdRequest.request_number}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Nueva solicitud de código</h2>

            <p><strong>Consecutivo:</strong> ${safeRequestNumber}</p>
            <p><strong>Solicitante:</strong> ${safeRequester}</p>
            <p><strong>Área:</strong> ${safeArea}</p>
            <p><strong>Clasificación:</strong> ${safeClassification}</p>

            <br />

            <p>Ingrese al Sistema CLAP para gestionar la solicitud.</p>
          </div>
        `,
      });

      if (!emailError) {
        emailSent = true;
      } else {
        console.error(
          "Solicitud creada, pero no se pudo enviar la notificación:",
          emailError,
        );
      }
    } catch (emailError) {
      console.error(
        "Solicitud creada, pero ocurrió un error enviando la notificación:",
        emailError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        request: {
          id: createdRequest.id,
          request_number:
            createdRequest.request_number,
          status: "Pendiente",
        },
        email_sent: emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      uploadedPath &&
      insertedRequestId
    ) {
      await supabaseAdmin.storage
        .from(
          ATTACHMENTS_BUCKET,
        )
        .remove([
          uploadedPath,
        ]);
    }

    return handleError(error);
  }
}
