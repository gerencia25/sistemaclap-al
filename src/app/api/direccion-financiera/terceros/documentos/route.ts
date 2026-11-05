import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

const BUCKET = "third-party-request-attachments";

const VALID_DOCUMENT_TYPES = new Set([
  "RUT",
  "CAMARA_COMERCIO",
  "CONOCIMIENTO_CLIENTE",
  "CONOCIMIENTO_PROVEEDOR",
]);

function handleError(error: unknown) {
  console.error(
    "API Dirección Financiera · Documentos de terceros:",
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

function safeFileName(name: string) {
  return name.replace(/[^A-Z0-9._-]/gi, "_");
}

// =========================================================
// GET
// Consulta documentos vigentes e históricos de un tercero.
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "TERCEROS_VIEW",
    );

    const url = new URL(request.url);

    const thirdPartyId =
      url.searchParams.get("thirdPartyId");

    if (!thirdPartyId) {
      return NextResponse.json(
        {
          error:
            "Debes indicar el tercero a consultar.",
        },
        { status: 400 },
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("third_party_documents")
        .select(`
          id,
          third_party_id,
          document_type,
          file_name,
          file_url,
          storage_path,
          mime_type,
          version,
          is_current,
          status,
          uploaded_by,
          source_request_id,
          created_at,
          updated_at
        `)
        .eq("third_party_id", thirdPartyId)
        .order("document_type", {
          ascending: true,
        })
        .order("version", {
          ascending: false,
        });

    if (error) {
      throw new Error(
        `No se pudieron consultar los documentos: ${error.message}`,
      );
    }

    return NextResponse.json({
      documents: data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST
// Reemplaza/agrega un documento PDF.
// La versión anterior permanece como histórico.
// =========================================================

export async function POST(request: Request) {
  let uploadedPath: string | null = null;

  try {
    const systemUser =
      await requireSystemPermission(
        request,
        "TERCEROS_APPROVE",
      );

    const formData =
      await request.formData();

    const thirdPartyId =
      String(
        formData.get("third_party_id") ?? "",
      ).trim();

    const documentType =
      String(
        formData.get("document_type") ?? "",
      ).trim();

    const file =
      formData.get("file");

    if (!thirdPartyId) {
      return NextResponse.json(
        {
          error:
            "Debes indicar el tercero.",
        },
        { status: 400 },
      );
    }

    if (
      !VALID_DOCUMENT_TYPES.has(
        documentType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Tipo de documento no válido.",
        },
        { status: 400 },
      );
    }

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar un archivo PDF.",
        },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" ||
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          error:
            "Solo se permiten archivos PDF.",
        },
        { status: 400 },
      );
    }

    // 15 MB máximo por documento.
    if (
      file.size >
      15 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          error:
            "El archivo supera el tamaño máximo de 15 MB.",
        },
        { status: 400 },
      );
    }

    const safeName =
      safeFileName(file.name);

    uploadedPath =
      `TERCEROS/${thirdPartyId}/${documentType}/${Date.now()}-${safeName}`;

    const buffer =
      Buffer.from(
        await file.arrayBuffer(),
      );

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from(BUCKET)
        .upload(
          uploadedPath,
          buffer,
          {
            contentType:
              "application/pdf",
            upsert: false,
          },
        );

    if (uploadError) {
      throw new Error(
        `No se pudo subir el PDF: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } =
      supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(
          uploadedPath,
        );

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "save_third_party_document",
      {
        p_third_party_id:
          thirdPartyId,

        p_document_type:
          documentType,

        p_file_name:
          file.name,

        p_file_url:
          publicUrlData.publicUrl,

        p_storage_path:
          uploadedPath,

        p_uploaded_by:
          systemUser.full_name ||
          systemUser.email,
      },
    );

    if (error) {
      // Si falla el versionado,
      // eliminamos el archivo recién subido
      // para no dejar basura en Storage.
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([uploadedPath]);

      uploadedPath = null;

      throw new Error(
        error.message,
      );
    }

    return NextResponse.json({
      document: data,
    });
  } catch (error) {
    return handleError(error);
  }
}
