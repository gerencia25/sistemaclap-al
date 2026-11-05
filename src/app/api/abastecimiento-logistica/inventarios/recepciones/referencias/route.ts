import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Recepciones · Referencias:",
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

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_RECEIVE",
    );

    const { data, error } = await supabaseAdmin
      .from("inventory_receipt_reference_types")
      .select(`
        id,
        code,
        name,
        description
      `)
      .eq("status", "Activo")
      .order("display_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw new Error(
        `No se pudieron consultar las referencias de entrada: ${error.message}`,
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
