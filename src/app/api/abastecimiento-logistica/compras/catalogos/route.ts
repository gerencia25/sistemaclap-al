import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Abastecimiento · Compras · Catálogos:",
    error,
  );

  if (error instanceof ApiAuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ABASTECIMIENTO_VIEW",
    );

    const [
      suppliersResult,
      itemsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("third_parties")
        .select(`
          id,
          business_name,
          commercial_name,
          first_name,
          last_name,
          identification_number,
          supplier_knowledge_status,
          status
        `)
        .eq("is_supplier", true)
        .eq("status", "Activo")
        .order("business_name"),

      supabaseAdmin
        .from("products")
        .select(`
          id,
          final_code,
          reference,
          name,
          item_type,
          unit,
          can_be_purchased
        `)
        .eq("status", "Activo")
        .eq("can_be_purchased", true)
        .order("name"),
    ]);

    if (suppliersResult.error) {
      throw new Error(
        `No se pudieron consultar los proveedores: ${suppliersResult.error.message}`,
      );
    }

    if (itemsResult.error) {
      throw new Error(
        `No se pudieron consultar los productos: ${itemsResult.error.message}`,
      );
    }

    const suppliers =
      (suppliersResult.data ?? []).map(
        (supplier) => {
          const personName = [
            supplier.first_name,
            supplier.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          const name =
            supplier.business_name?.trim() ||
            supplier.commercial_name?.trim() ||
            personName ||
            supplier.identification_number;

          return {
            id: supplier.id,
            name,
            supplier_knowledge_status:
              supplier.supplier_knowledge_status,
          };
        },
      );

    return NextResponse.json({
      suppliers,
      items: itemsResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}
