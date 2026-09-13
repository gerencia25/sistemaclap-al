import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateOfficialItemCode } from "@/lib/server/itemCodeGenerator";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const PRODUCT_FILES_BUCKET = "product-technical-sheets";
const MASTER_FILE_PREFIX = "master_file__";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;

type ProductPayload = Record<string, unknown>;

type MasterField = {
  field_key: string;
  field_label: string;
  field_type: string;
  required: boolean;
};

function handleError(error: unknown) {
  console.error("API Crear Producto desde Solicitud:", error);

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function safePathSegment(value: string) {
  return value
    .trim()
    .replace(/[^A-Z0-9_-]/gi, "_");
}

function getExtensionFromMime(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "application/pdf":
      return "pdf";

    default:
      return null;
  }
}

async function removeUploadedFiles(paths: string[]) {
  if (paths.length === 0) return;

  const { error } = await supabaseAdmin.storage
    .from(PRODUCT_FILES_BUCKET)
    .remove(paths);

  if (error) {
    console.error(
      "No se pudieron limpiar archivos cargados:",
      error,
    );
  }
}

async function parsePayload(request: Request) {
  const contentType =
    request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const requestId =
      String(formData.get("request_id") ?? "").trim();

    const rawProduct = formData.get("product");

    if (typeof rawProduct !== "string") {
      throw new Error(
        "La información del producto no fue enviada correctamente.",
      );
    }

    let product: unknown;

    try {
      product = JSON.parse(rawProduct);
    } catch {
      throw new Error(
        "La información del producto contiene un JSON inválido.",
      );
    }

    const files = new Map<string, File>();

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith(MASTER_FILE_PREFIX)) {
        continue;
      }

      if (typeof value === "string") {
        continue;
      }

      if (value.size === 0) {
        continue;
      }

      const fieldKey = key
        .slice(MASTER_FILE_PREFIX.length)
        .trim();

      if (!fieldKey) {
        continue;
      }

      files.set(fieldKey, value);
    }

    return {
      requestId,
      product,
      files,
    };
  }

  const body = await request.json();

  return {
    requestId:
      String(body?.request_id ?? "").trim(),
    product: body?.product,
    files: new Map<string, File>(),
  };
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];
  let rpcSucceeded = false;

  try {
    const systemUser = await requireSystemPermission(
      request,
      "CODIFICACION_CREATE_PRODUCT",
    );

    const {
      requestId,
      product: rawProduct,
      files,
    } = await parsePayload(request);

    if (!requestId) {
      return NextResponse.json(
        { error: "La solicitud es obligatoria." },
        { status: 400 },
      );
    }

    if (!isObject(rawProduct)) {
      return NextResponse.json(
        {
          error:
            "La información del producto no es válida.",
        },
        { status: 400 },
      );
    }

    const product =
      rawProduct as ProductPayload;

    const categoryId =
      String(product.category_id ?? "").trim();

    const groupId =
      String(product.group_id ?? "").trim();

    const subgroupId =
      String(product.subgroup_id ?? "").trim();

    const dynamicDataValue =
      product.dynamic_code_data;

    const dynamicData =
      isObject(dynamicDataValue)
        ? Object.fromEntries(
            Object.entries(dynamicDataValue).map(
              ([key, value]) => [
                key,
                String(value ?? ""),
              ],
            ),
          )
        : {};

    if (!categoryId || !groupId || !subgroupId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar categoría, grupo y subgrupo.",
        },
        { status: 400 },
      );
    }

    const generated =
      await generateOfficialItemCode({
        categoryId,
        groupId,
        subgroupId,
        dynamicData,
      });

    /*
     * =====================================================
     * DATOS MAESTROS CONFIGURADOS
     * =====================================================
     *
     * La configuración activa de la categoría determina
     * qué campos puede recibir el producto.
     */
    const {
      data: masterFieldsData,
      error: masterFieldsError,
    } = await supabaseAdmin
      .from("item_master_fields")
      .select(`
        field_key,
        field_label,
        field_type,
        required
      `)
      .eq(
        "category_code",
        generated.categoryCode,
      )
      .eq("status", "Activo")
      .order("display_order");

    if (masterFieldsError) {
      throw new Error(
        `No se pudieron consultar los datos maestros: ${masterFieldsError.message}`,
      );
    }

    const masterFields =
      (masterFieldsData ?? []) as MasterField[];

    const incomingMasterData =
      isObject(product.item_master_data)
        ? product.item_master_data
        : {};

    /*
     * Solo conservamos datos maestros que realmente estén
     * configurados para la categoría.
     *
     * Los campos de archivos NO se aceptan como URL enviada
     * por el navegador. Deben cargarse físicamente.
     */
    const savedMasterData:
      Record<string, string> = {};

    for (const field of masterFields) {
      const isFileField =
        field.field_type === "image" ||
        field.field_type === "pdf";

      if (isFileField) {
        continue;
      }

      const rawValue =
        incomingMasterData[field.field_key];

      const value =
        rawValue === null ||
        rawValue === undefined
          ? ""
          : String(rawValue).trim();

      if (field.required && !value) {
        return NextResponse.json(
          {
            error:
              `Debes completar: ${field.field_label}.`,
          },
          { status: 400 },
        );
      }

      if (value) {
        savedMasterData[field.field_key] =
          value;
      }
    }

    const masterFieldByKey = new Map(
      masterFields.map((field) => [
        field.field_key,
        field,
      ]),
    );

    /*
     * =====================================================
     * VALIDACIÓN DE ARCHIVOS
     * =====================================================
     */
    for (const [fieldKey, file] of files) {
      const field =
        masterFieldByKey.get(fieldKey);

      if (!field) {
        return NextResponse.json(
          {
            error:
              `El campo de archivo "${fieldKey}" no está configurado para esta categoría.`,
          },
          { status: 400 },
        );
      }

      if (
        field.field_type !== "image" &&
        field.field_type !== "pdf"
      ) {
        return NextResponse.json(
          {
            error:
              `"${field.field_label}" no está configurado como archivo.`,
          },
          { status: 400 },
        );
      }

      if (field.field_type === "image") {
        const allowedImageTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ];

        if (
          !allowedImageTypes.includes(file.type)
        ) {
          return NextResponse.json(
            {
              error:
                `${field.field_label}: solo se permiten imágenes JPG, PNG o WebP.`,
            },
            { status: 400 },
          );
        }

        if (file.size > IMAGE_MAX_BYTES) {
          return NextResponse.json(
            {
              error:
                `${field.field_label}: la imagen no puede superar 5 MB.`,
            },
            { status: 400 },
          );
        }
      }

      if (field.field_type === "pdf") {
        if (file.type !== "application/pdf") {
          return NextResponse.json(
            {
              error:
                `${field.field_label}: solo se permiten archivos PDF.`,
            },
            { status: 400 },
          );
        }

        if (file.size > PDF_MAX_BYTES) {
          return NextResponse.json(
            {
              error:
                `${field.field_label}: el PDF no puede superar 10 MB.`,
            },
            { status: 400 },
          );
        }
      }
    }

    /*
     * Los archivos obligatorios también se validan desde
     * servidor.
     */
    for (const field of masterFields) {
      const isFileField =
        field.field_type === "image" ||
        field.field_type === "pdf";

      if (
        isFileField &&
        field.required &&
        !files.has(field.field_key)
      ) {
        return NextResponse.json(
          {
            error:
              `Debes adjuntar: ${field.field_label}.`,
          },
          { status: 400 },
        );
      }
    }

    /*
     * =====================================================
     * CARGA SEGURA A STORAGE
     * =====================================================
     */
    for (const [fieldKey, file] of files) {
      const field =
        masterFieldByKey.get(fieldKey);

      if (!field) continue;

      const extension =
        getExtensionFromMime(file.type);

      if (!extension) {
        return NextResponse.json(
          {
            error:
              `Tipo de archivo inválido para ${field.field_label}.`,
          },
          { status: 400 },
        );
      }

      const safeCode =
        safePathSegment(
          generated.finalCode,
        );

      const safeField =
        safePathSegment(fieldKey);

      const filePath =
        `${safeCode}/${safeField}/` +
        `${Date.now()}-${randomUUID()}.${extension}`;

      const buffer =
        Buffer.from(
          await file.arrayBuffer(),
        );

      const {
        error: uploadError,
      } = await supabaseAdmin.storage
        .from(PRODUCT_FILES_BUCKET)
        .upload(
          filePath,
          buffer,
          {
            contentType: file.type,
            upsert: false,
          },
        );

      if (uploadError) {
        throw new Error(
          `No se pudo cargar ${field.field_label}: ${uploadError.message}`,
        );
      }

      uploadedPaths.push(filePath);

      const {
        data: publicUrlData,
      } = supabaseAdmin.storage
        .from(PRODUCT_FILES_BUCKET)
        .getPublicUrl(filePath);

      savedMasterData[fieldKey] =
        publicUrlData.publicUrl;

      savedMasterData[
        `${fieldKey}_filename`
      ] = file.name;

      /*
       * Este es el dato importante para cuando el bucket
       * pase a privado.
       */
      savedMasterData[
        `${fieldKey}_storage_path`
      ] = filePath;
    }

    /*
     * =====================================================
     * PRODUCTO OFICIAL
     * =====================================================
     *
     * Código, clasificación y nombre siempre se vuelven
     * a calcular en servidor.
     *
     * Las URLs de archivos también salen únicamente de
     * archivos subidos por esta API.
     */
    const officialProduct = {
      ...product,

      reference: generated.finalCode,
      final_code: generated.finalCode,
      generated_reference:
        generated.finalCode,

      name: generated.productName,
      dynamic_name:
        generated.productName,

      category:
        generated.categoryName,
      item_type:
        generated.categoryName,

      category_id:
        generated.categoryId,
      group_id:
        generated.groupId,
      subgroup_id:
        generated.subgroupId,

      classification_code:
        generated.classificationCode,

      dynamic_code_data:
        generated.dynamicData,

      item_master_data:
        savedMasterData,

      production_process:
        savedMasterData.production_process ||
        product.production_process ||
        null,

      technical_description:
        savedMasterData.description ||
        product.technical_description ||
        null,

      suggested_price:
        Number(
          savedMasterData.suggested_sale_price ??
            product.suggested_price ??
            0,
        ),

      /*
       * Compatibilidad con columnas actuales.
       *
       * La fuente real queda además guardada en
       * item_master_data mediante *_storage_path.
       */
      image_url:
        savedMasterData.product_image ||
        null,

      technical_sheet_url:
        savedMasterData.technical_sheet ||
        null,

      technical_sheet_filename:
        savedMasterData
          .technical_sheet_filename ||
        null,
    };

    const {
      data: result,
      error: rpcError,
    } = await supabaseAdmin.rpc(
      "sc_create_product_from_request",
      {
        p_request_id: requestId,
        p_product: officialProduct,
        p_reviewed_by:
          systemUser.full_name,
      },
    );

    if (rpcError) {
      await removeUploadedFiles(
        uploadedPaths,
      );

      if (rpcError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Ya existe un producto con ese código oficial.",
          },
          { status: 409 },
        );
      }

      const message =
        rpcError.message ||
        "No se pudo crear el producto.";

      if (
        message.includes(
          "ya fue gestionada",
        ) ||
        message.includes(
          "Estado actual",
        )
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

    rpcSucceeded = true;

    if (!result) {
      throw new Error(
        "La creación terminó sin devolver información del producto.",
      );
    }

    const {
      data: codeRequest,
      error: requestError,
    } = await supabaseAdmin
      .from("item_code_requests")
      .select(`
        id,
        request_number,
        requester_name,
        requester_email,
        created_product_code,
        created_product_name,
        status
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      console.error(
        "Producto creado, pero no se pudo consultar la solicitud para notificación:",
        requestError,
      );
    }

    let emailSent = false;

    if (
      codeRequest?.requester_email &&
      codeRequest.status === "Creado"
    ) {
      try {
        const safeRequesterName =
          escapeHtml(
            codeRequest.requester_name,
          );

        const safeRequestNumber =
          escapeHtml(
            codeRequest.request_number,
          );

        const safeProductCode =
          escapeHtml(
            codeRequest
              .created_product_code ??
              "",
          );

        const safeProductName =
          escapeHtml(
            codeRequest
              .created_product_name ??
              "",
          );

        const {
          error: emailError,
        } = await resend.emails.send({
          from:
            "Sistema CLAP <notificaciones@mail.almultiformas.com>",
          to: [
            codeRequest.requester_email,
          ],
          subject:
            `Código creado - ${codeRequest.request_number}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Código creado correctamente</h2>

              <p>Hola ${safeRequesterName},</p>

              <p>
                La solicitud
                <strong>${safeRequestNumber}</strong>
                fue gestionada correctamente.
              </p>

              <p>
                <strong>Código creado:</strong>
                ${safeProductCode}
              </p>

              <p>
                <strong>Producto:</strong>
                ${safeProductName}
              </p>

              <br />

              <p>Sistema CLAP</p>
            </div>
          `,
        });

        if (!emailError) {
          emailSent = true;
        } else {
          console.error(
            "No se pudo enviar correo de código creado:",
            emailError,
          );
        }
      } catch (emailError) {
        console.error(
          "Error enviando correo de código creado:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      result,
      email_sent: emailSent,
    });
  } catch (error) {
    /*
     * Si ya se creó el producto en la RPC no eliminamos
     * los archivos aunque ocurra un problema posterior.
     */
    if (
      uploadedPaths.length > 0 &&
      !rpcSucceeded
    ) {
      await removeUploadedFiles(
        uploadedPaths,
      );
    }

    return handleError(error);
  }
}
