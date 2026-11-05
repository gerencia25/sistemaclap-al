import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error(
    "API Inventarios · adjustments:",
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
      "ALMACEN_ADJUST",
    );

    const [
      balancesResult,
      warehousesResult,
      recentResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("inventory_balances")
        .select(`
          id,
          item_id,
          warehouse_id,
          lot_id,
          quantity_total,
          quantity_reserved,
          quantity_available,
          unit_cost,
          updated_at
        `)
        .order(
          "updated_at",
          { ascending: false },
        ),

      supabaseAdmin
        .from("warehouses")
        .select(`
          id,
          code,
          name,
          status
        `)
        .eq(
          "status",
          "Activo",
        )
        .order("code"),

      supabaseAdmin
        .from("inventory_adjustments")
        .select(`
          id,
          adjustment_number,
          adjustment_date,
          reason,
          reference,
          observations,
          adjusted_by,
          created_at
        `)
        .order(
          "created_at",
          { ascending: false },
        )
        .limit(30),
    ]);

    if (balancesResult.error) {
      throw new Error(
        balancesResult.error.message,
      );
    }

    if (warehousesResult.error) {
      throw new Error(
        warehousesResult.error.message,
      );
    }

    if (recentResult.error) {
      throw new Error(
        recentResult.error.message,
      );
    }

    const balances =
      balancesResult.data ?? [];

    const itemIds = [
      ...new Set(
        balances
          .map((row) => row.item_id)
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const lotIds = [
      ...new Set(
        balances
          .map((row) => row.lot_id)
          .filter(
            (value): value is string =>
              typeof value === "string",
          ),
      ),
    ];

    const [
      productsResult,
      lotsResult,
    ] = await Promise.all([
      itemIds.length
        ? supabaseAdmin
            .from("products")
            .select(`
              id,
              final_code,
              reference,
              name,
              unit,
              category
            `)
            .in("id", itemIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      lotIds.length
        ? supabaseAdmin
            .from("inventory_lots")
            .select(`
              id,
              lot_number,
              status
            `)
            .in("id", lotIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (productsResult.error) {
      throw new Error(
        productsResult.error.message,
      );
    }

    if (lotsResult.error) {
      throw new Error(
        lotsResult.error.message,
      );
    }

    const productsById = new Map(
      (productsResult.data ?? []).map(
        (row) => [row.id, row],
      ),
    );

    const lotsById = new Map(
      (lotsResult.data ?? []).map(
        (row) => [row.id, row],
      ),
    );

    const warehouses =
      warehousesResult.data ?? [];

    const warehousesById =
      new Map(
        warehouses.map(
          (row) => [
            row.id,
            row,
          ],
        ),
      );

    return NextResponse.json({
      balances:
        balances.map((balance) => ({
          ...balance,

          quantity_total:
            Number(
              balance.quantity_total ?? 0,
            ),

          quantity_reserved:
            Number(
              balance.quantity_reserved ?? 0,
            ),

          quantity_available:
            Number(
              balance.quantity_available ?? 0,
            ),

          unit_cost:
            Number(
              balance.unit_cost ?? 0,
            ),

          product:
            balance.item_id
              ? productsById.get(
                  balance.item_id,
                ) ?? null
              : null,

          warehouse:
            balance.warehouse_id
              ? warehousesById.get(
                  balance.warehouse_id,
                ) ?? null
              : null,

          lot:
            balance.lot_id
              ? lotsById.get(
                  balance.lot_id,
                ) ?? null
              : null,
        })),

      warehouses,

      adjustments:
        recentResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}


export async function POST(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_ADJUST",
    );

    const body =
      await request.json();

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "register_inventory_adjustment",
      {
        p_adjustment_date:
          body?.adjustment_date ||
          null,

        p_reason:
          String(
            body?.reason ?? "",
          ).trim(),

        p_reference:
          String(
            body?.reference ?? "",
          ).trim(),

        p_observations:
          String(
            body?.observations ?? "",
          ).trim(),

        p_adjusted_by:
          String(
            body?.adjusted_by ?? "",
          ).trim(),

        p_items:
          Array.isArray(
            body?.items,
          )
            ? body.items
            : [],
      },
    );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      { data },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
