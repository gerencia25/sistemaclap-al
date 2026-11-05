import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(
  error: unknown,
) {
  console.error(
    "API Almacenes e Inventarios · Salidas:",
    error,
  );

  if (
    error instanceof
    ApiAuthorizationError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status:
          error.status,
      },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
    },
    {
      status: 500,
    },
  );
}


// ==========================================================
// GET · EXISTENCIAS DISPONIBLES + SALIDAS RECIENTES
// ==========================================================

export async function GET(
  request: Request,
) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_DISPATCH",
    );

    const [
      balancesResult,
      dispatchesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from(
          "inventory_balances",
        )
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
        .gt(
          "quantity_available",
          0,
        )
        .order(
          "updated_at",
          {
            ascending: false,
          },
        ),

      supabaseAdmin
        .from(
          "inventory_dispatches",
        )
        .select(`
          id,
          dispatch_number,
          dispatch_date,
          reason,
          destination,
          reference,
          observations,
          dispatched_by,
          total_quantity,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(30),
    ]);

    if (
      balancesResult.error
    ) {
      throw new Error(
        `No se pudieron consultar las existencias: ${balancesResult.error.message}`,
      );
    }

    if (
      dispatchesResult.error
    ) {
      throw new Error(
        `No se pudieron consultar las salidas: ${dispatchesResult.error.message}`,
      );
    }

    const balances =
      balancesResult.data ??
      [];

    const itemIds = [
      ...new Set(
        balances
          .map(
            (row) =>
              row.item_id,
          )
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
              "string",
          ),
      ),
    ];

    const warehouseIds = [
      ...new Set(
        balances
          .map(
            (row) =>
              row.warehouse_id,
          )
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
              "string",
          ),
      ),
    ];

    const lotIds = [
      ...new Set(
        balances
          .map(
            (row) =>
              row.lot_id,
          )
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
              "string",
          ),
      ),
    ];

    const [
      productsResult,
      warehousesResult,
      lotsResult,
    ] = await Promise.all([
      itemIds.length
        ? supabaseAdmin
            .from(
              "products",
            )
            .select(`
              id,
              final_code,
              reference,
              name,
              unit,
              category
            `)
            .in(
              "id",
              itemIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      warehouseIds.length
        ? supabaseAdmin
            .from(
              "warehouses",
            )
            .select(`
              id,
              code,
              name
            `)
            .in(
              "id",
              warehouseIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      lotIds.length
        ? supabaseAdmin
            .from(
              "inventory_lots",
            )
            .select(`
              id,
              lot_number,
              status
            `)
            .in(
              "id",
              lotIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (
      productsResult.error
    ) {
      throw new Error(
        productsResult.error.message,
      );
    }

    if (
      warehousesResult.error
    ) {
      throw new Error(
        warehousesResult.error.message,
      );
    }

    if (
      lotsResult.error
    ) {
      throw new Error(
        lotsResult.error.message,
      );
    }

    const productsById =
      new Map(
        (
          productsResult.data ??
          []
        ).map(
          (product) => [
            product.id,
            product,
          ],
        ),
      );

    const warehousesById =
      new Map(
        (
          warehousesResult.data ??
          []
        ).map(
          (warehouse) => [
            warehouse.id,
            warehouse,
          ],
        ),
      );

    const lotsById =
      new Map(
        (
          lotsResult.data ??
          []
        ).map(
          (lot) => [
            lot.id,
            lot,
          ],
        ),
      );

    return NextResponse.json({
      balances:
        balances.map(
          (balance) => ({
            ...balance,

            quantity_total:
              Number(
                balance.quantity_total ??
                  0,
              ),

            quantity_reserved:
              Number(
                balance.quantity_reserved ??
                  0,
              ),

            quantity_available:
              Number(
                balance.quantity_available ??
                  0,
              ),

            unit_cost:
              Number(
                balance.unit_cost ??
                  0,
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
          }),
        ),

      dispatches:
        (
          dispatchesResult.data ??
          []
        ).map(
          (dispatch) => ({
            ...dispatch,
            total_quantity:
              Number(
                dispatch.total_quantity ??
                  0,
              ),
          }),
        ),
    });
  } catch (error) {
    return handleError(
      error,
    );
  }
}


// ==========================================================
// POST · REGISTRAR SALIDA
// ==========================================================

export async function POST(
  request: Request,
) {
  try {
    await requireSystemPermission(
      request,
      "ALMACEN_DISPATCH",
    );

    const body =
      await request.json();

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "register_inventory_dispatch",
        {
          p_dispatch_date:
            body?.dispatch_date ||
            null,

          p_reason:
            String(
              body?.reason ??
                "",
            ).trim(),

          p_destination:
            String(
              body?.destination ??
                "",
            ).trim(),

          p_reference:
            String(
              body?.reference ??
                "",
            ).trim(),

          p_observations:
            String(
              body?.observations ??
                "",
            ).trim(),

          p_dispatched_by:
            String(
              body?.dispatched_by ??
                "",
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
      {
        data,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleError(
      error,
    );
  }
}
