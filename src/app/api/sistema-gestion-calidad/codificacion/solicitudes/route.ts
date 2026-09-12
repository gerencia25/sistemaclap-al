import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error("API Solicitudes Codificación:", error);

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
      "CODIFICACION_VIEW",
    );

    const { data, error } = await supabaseAdmin
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
      .order("requested_at", { ascending: false });

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
