import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";
import { getProcessDocumentContext } from "@/lib/server/processDocumentContexts";

const BUCKET = "process-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const contextKey = url.searchParams.get("context")?.trim() ?? "";

    const context = getProcessDocumentContext(contextKey);

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
      (data ?? []).map(async (document) => {
        let accessUrl = document.file_url;

        if (document.storage_path) {
          const { data: signedData, error: signedError } =
            await supabaseAdmin.storage
              .from(BUCKET)
              .createSignedUrl(
                document.storage_path,
                SIGNED_URL_TTL_SECONDS,
              );

          if (!signedError && signedData?.signedUrl) {
            accessUrl = signedData.signedUrl;
          }
        }

        return {
          ...document,
          access_url: accessUrl,
        };
      }),
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
