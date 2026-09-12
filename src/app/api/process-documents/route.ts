import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";
import { getProcessDocumentContext } from "@/lib/server/processDocumentContexts";

export const runtime = "nodejs";

const BUCKET = "process-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function handleError(error: unknown) {
  console.error("API Process Documents:", error);

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

function sanitizePathPart(value: string) {
  return value
    .trim()
    .replace(/[^A-Z0-9-]/gi, "_")
    .replace(/_+/g, "_");
}

async function createAccessUrl(
  storagePath: string | null,
  fallbackUrl: string,
) {
  if (!storagePath) {
    return fallbackUrl;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(
      storagePath,
      SIGNED_URL_TTL_SECONDS,
    );

  if (error || !data?.signedUrl) {
    return fallbackUrl;
  }

  return data.signedUrl;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const contextKey =
      url.searchParams.get("context")?.trim() ?? "";

    const context =
      getProcessDocumentContext(contextKey);

    if (!context) {
      return NextResponse.json(
        { error: "Contexto documental no válido." },
        { status: 400 },
      );
    }

    await requireSystemPermission(
      request,
      context.permissions.view,
    );

    const { data, error } = await supabaseAdmin
      .from("process_documents")
      .select("*")
      .eq("module_code", context.moduleCode)
      .eq("process_code", context.processCode)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        `Error consultando documentos: ${error.message}`,
      );
    }

    const documents = await Promise.all(
      (data ?? []).map(async (document) => ({
        ...document,
        access_url: await createAccessUrl(
          document.storage_path,
          document.file_url,
        ),
      })),
    );

    return NextResponse.json({
      context: {
        key: context.key,
        module_code: context.moduleCode,
        module_name: context.moduleName,
        process_code: context.processCode,
        process_name: context.processName,
      },
      documents,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  let uploadedStoragePath: string | null = null;

  try {
    const formData = await request.formData();

    const contextKey =
      String(formData.get("context") ?? "").trim();

    const context =
      getProcessDocumentContext(contextKey);

    if (!context) {
      return NextResponse.json(
        { error: "Contexto documental no válido." },
        { status: 400 },
      );
    }

    await requireSystemPermission(
      request,
      context.permissions.create,
    );

    const documentCode =
      String(formData.get("document_code") ?? "").trim();

    const documentName =
      String(formData.get("document_name") ?? "").trim();

    const documentType =
      String(formData.get("document_type") ?? "").trim();

    const version =
      String(formData.get("version") ?? "").trim();

    const documentDate =
      String(formData.get("document_date") ?? "").trim();

    const status =
      String(formData.get("status") ?? "Vigente").trim();

    const fileValue = formData.get("file");

    if (!documentCode) {
      return NextResponse.json(
        { error: "El código del documento es obligatorio." },
        { status: 400 },
      );
    }

    if (!documentName) {
      return NextResponse.json(
        { error: "El nombre del documento es obligatorio." },
        { status: 400 },
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { error: "El tipo de documento es obligatorio." },
        { status: 400 },
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: "La versión es obligatoria." },
        { status: 400 },
      );
    }

    if (!["Vigente", "Obsoleto"].includes(status)) {
      return NextResponse.json(
        { error: "El estado del documento no es válido." },
        { status: 400 },
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Debes seleccionar un archivo PDF." },
        { status: 400 },
      );
    }

    const isPdf =
      fileValue.type === "application/pdf" &&
      fileValue.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        { error: "Solo se permiten archivos PDF." },
        { status: 400 },
      );
    }

    if (fileValue.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error:
            "El archivo supera el tamaño máximo permitido de 10 MB.",
        },
        { status: 400 },
      );
    }

    const safeCode =
      sanitizePathPart(documentCode) || "DOCUMENTO";

    const safeVersion =
      sanitizePathPart(version) || "VERSION";

    const storagePath =
      `${context.moduleCode}/${context.processCode}/` +
      `${safeCode}-${safeVersion}-${Date.now()}.pdf`;

    const fileBuffer = Buffer.from(
      await fileValue.arrayBuffer(),
    );

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from(BUCKET)
        .upload(
          storagePath,
          fileBuffer,
          {
            contentType: "application/pdf",
            upsert: false,
          },
        );

    if (uploadError) {
      throw new Error(
        `Error subiendo el archivo: ${uploadError.message}`,
      );
    }

    uploadedStoragePath = storagePath;

    const { data: publicUrlData } =
      supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

    const fileUrl =
      publicUrlData.publicUrl;

    const {
      data: document,
      error: insertError,
    } = await supabaseAdmin
      .from("process_documents")
      .insert({
        module_code: context.moduleCode,
        module_name: context.moduleName,
        process_code: context.processCode,
        process_name: context.processName,
        document_code: documentCode,
        document_name: documentName,
        document_type: documentType,
        version,
        document_date: documentDate || null,
        status,
        file_url: fileUrl,
        file_name: fileValue.name,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([storagePath]);

      uploadedStoragePath = null;

      throw new Error(
        `Error registrando el documento: ${insertError.message}`,
      );
    }

    const accessUrl =
      await createAccessUrl(
        document.storage_path,
        document.file_url,
      );

    return NextResponse.json(
      {
        document: {
          ...document,
          access_url: accessUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (uploadedStoragePath) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([uploadedStoragePath]);
    }

    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  let newStoragePath: string | null = null;

  try {
    const formData = await request.formData();

    const contextKey =
      String(formData.get("context") ?? "").trim();

    const context =
      getProcessDocumentContext(contextKey);

    if (!context) {
      return NextResponse.json(
        { error: "Contexto documental no válido." },
        { status: 400 },
      );
    }

    await requireSystemPermission(
      request,
      context.permissions.edit,
    );

    const id =
      String(formData.get("id") ?? "").trim();

    const documentCode =
      String(formData.get("document_code") ?? "").trim();

    const documentName =
      String(formData.get("document_name") ?? "").trim();

    const documentType =
      String(formData.get("document_type") ?? "").trim();

    const version =
      String(formData.get("version") ?? "").trim();

    const documentDate =
      String(formData.get("document_date") ?? "").trim();

    const status =
      String(formData.get("status") ?? "").trim();

    const fileValue = formData.get("file");

    if (!id) {
      return NextResponse.json(
        { error: "El documento es obligatorio." },
        { status: 400 },
      );
    }

    if (!documentCode || !documentName || !documentType || !version) {
      return NextResponse.json(
        {
          error:
            "Código, nombre, tipo y versión son obligatorios.",
        },
        { status: 400 },
      );
    }

    if (!["Vigente", "Obsoleto"].includes(status)) {
      return NextResponse.json(
        { error: "El estado del documento no es válido." },
        { status: 400 },
      );
    }

    const {
      data: existingDocument,
      error: existingError,
    } = await supabaseAdmin
      .from("process_documents")
      .select("*")
      .eq("id", id)
      .eq("module_code", context.moduleCode)
      .eq("process_code", context.processCode)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Error consultando el documento: ${existingError.message}`,
      );
    }

    if (!existingDocument) {
      return NextResponse.json(
        {
          error:
            "El documento no existe o no pertenece a este proceso.",
        },
        { status: 404 },
      );
    }

    let fileUrl = existingDocument.file_url;
    let fileName = existingDocument.file_name;
    let storagePath = existingDocument.storage_path;

    if (fileValue instanceof File && fileValue.size > 0) {
      const isPdf =
        fileValue.type === "application/pdf" &&
        fileValue.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        return NextResponse.json(
          { error: "Solo se permiten archivos PDF." },
          { status: 400 },
        );
      }

      if (fileValue.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error:
              "El archivo supera el tamaño máximo permitido de 10 MB.",
          },
          { status: 400 },
        );
      }

      const safeCode =
        sanitizePathPart(documentCode) || "DOCUMENTO";

      const safeVersion =
        sanitizePathPart(version) || "VERSION";

      newStoragePath =
        `${context.moduleCode}/${context.processCode}/` +
        `${safeCode}-${safeVersion}-${Date.now()}.pdf`;

      const fileBuffer = Buffer.from(
        await fileValue.arrayBuffer(),
      );

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from(BUCKET)
          .upload(
            newStoragePath,
            fileBuffer,
            {
              contentType: "application/pdf",
              upsert: false,
            },
          );

      if (uploadError) {
        throw new Error(
          `Error subiendo el archivo: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } =
        supabaseAdmin.storage
          .from(BUCKET)
          .getPublicUrl(newStoragePath);

      fileUrl = publicUrlData.publicUrl;
      fileName = fileValue.name;
      storagePath = newStoragePath;
    }

    const {
      data: updatedDocument,
      error: updateError,
    } = await supabaseAdmin
      .from("process_documents")
      .update({
        document_code: documentCode,
        document_name: documentName,
        document_type: documentType,
        version,
        document_date: documentDate || null,
        status,
        file_url: fileUrl,
        file_name: fileName,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("module_code", context.moduleCode)
      .eq("process_code", context.processCode)
      .select("*")
      .single();

    if (updateError) {
      if (newStoragePath) {
        await supabaseAdmin.storage
          .from(BUCKET)
          .remove([newStoragePath]);

        newStoragePath = null;
      }

      throw new Error(
        `Error actualizando el documento: ${updateError.message}`,
      );
    }

    if (
      newStoragePath &&
      existingDocument.storage_path &&
      existingDocument.storage_path !== newStoragePath
    ) {
      const { error: removeOldError } =
        await supabaseAdmin.storage
          .from(BUCKET)
          .remove([existingDocument.storage_path]);

      if (removeOldError) {
        console.warn(
          "No se pudo eliminar el archivo anterior:",
          removeOldError.message,
        );
      }
    }

    newStoragePath = null;

    const accessUrl =
      await createAccessUrl(
        updatedDocument.storage_path,
        updatedDocument.file_url,
      );

    return NextResponse.json({
      document: {
        ...updatedDocument,
        access_url: accessUrl,
      },
    });
  } catch (error) {
    if (newStoragePath) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([newStoragePath]);
    }

    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const contextKey =
      String(body.context ?? "").trim();

    const id =
      String(body.id ?? "").trim();

    const context =
      getProcessDocumentContext(contextKey);

    if (!context) {
      return NextResponse.json(
        { error: "Contexto documental no válido." },
        { status: 400 },
      );
    }

    await requireSystemPermission(
      request,
      context.permissions.delete,
    );

    if (!id) {
      return NextResponse.json(
        { error: "El documento es obligatorio." },
        { status: 400 },
      );
    }

    const {
      data: existingDocument,
      error: existingError,
    } = await supabaseAdmin
      .from("process_documents")
      .select("*")
      .eq("id", id)
      .eq("module_code", context.moduleCode)
      .eq("process_code", context.processCode)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Error consultando el documento: ${existingError.message}`,
      );
    }

    if (!existingDocument) {
      return NextResponse.json(
        {
          error:
            "El documento no existe o no pertenece a este proceso.",
        },
        { status: 404 },
      );
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("process_documents")
        .delete()
        .eq("id", id)
        .eq("module_code", context.moduleCode)
        .eq("process_code", context.processCode);

    if (deleteError) {
      throw new Error(
        `Error eliminando el documento: ${deleteError.message}`,
      );
    }

    if (existingDocument.storage_path) {
      const { error: removeFileError } =
        await supabaseAdmin.storage
          .from(BUCKET)
          .remove([existingDocument.storage_path]);

      if (removeFileError) {
        console.warn(
          "El registro fue eliminado, pero no se pudo retirar el archivo de Storage:",
          removeFileError.message,
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return handleError(error);
  }
}
