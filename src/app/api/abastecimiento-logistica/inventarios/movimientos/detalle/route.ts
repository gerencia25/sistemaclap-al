import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

type Kind =
  | "salida"
  | "traslado"
  | "ajuste";

function handleError(error: unknown) {
  console.error(
    "API Inventarios · Detalle movimiento:",
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
    {
      status: 500,
    },
  );
}

export async function GET(request: Request) {
  try {
    const url =
      new URL(
        request.url,
      );

    const kind =
      String(
        url.searchParams.get(
          "kind",
        ) ?? "",
      ) as Kind;

    const id =
      String(
        url.searchParams.get(
          "id",
        ) ?? "",
      ).trim();

    if (
      kind !== "salida" &&
      kind !== "traslado" &&
      kind !== "ajuste"
    ) {
      return NextResponse.json(
        {
          error:
            "Tipo de movimiento no válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          error:
            "No se recibió el movimiento.",
        },
        {
          status: 400,
        },
      );
    }

    await requireSystemPermission(
      request,
      "ALMACEN_INVENTARIOS_VIEW",
    );

    let header:
      Record<
        string,
        unknown
      > | null = null;

    let items:
      Record<
        string,
        unknown
      >[] = [];

    let documentNumber =
      "";

    let documentDate =
      "";

    if (
      kind ===
      "salida"
    ) {
      const [
        headerResult,
        itemsResult,
      ] =
        await Promise.all([
          supabaseAdmin
            .from(
              "inventory_dispatches",
            )
            .select("*")
            .eq(
              "id",
              id,
            )
            .maybeSingle(),

          supabaseAdmin
            .from(
              "inventory_dispatch_items",
            )
            .select("*")
            .eq(
              "dispatch_id",
              id,
            ),
        ]);

      if (
        headerResult.error
      ) {
        throw new Error(
          headerResult.error.message,
        );
      }

      if (
        itemsResult.error
      ) {
        throw new Error(
          itemsResult.error.message,
        );
      }

      header =
        headerResult.data;

      items =
        itemsResult.data ??
        [];

      documentNumber =
        String(
          header?.dispatch_number ??
            "",
        );

      documentDate =
        String(
          header?.dispatch_date ??
            "",
        );
    }


    if (
      kind ===
      "traslado"
    ) {
      const [
        headerResult,
        itemsResult,
      ] =
        await Promise.all([
          supabaseAdmin
            .from(
              "inventory_transfers",
            )
            .select("*")
            .eq(
              "id",
              id,
            )
            .maybeSingle(),

          supabaseAdmin
            .from(
              "inventory_transfer_items",
            )
            .select("*")
            .eq(
              "transfer_id",
              id,
            ),
        ]);

      if (
        headerResult.error
      ) {
        throw new Error(
          headerResult.error.message,
        );
      }

      if (
        itemsResult.error
      ) {
        throw new Error(
          itemsResult.error.message,
        );
      }

      header =
        headerResult.data;

      items =
        itemsResult.data ??
        [];

      documentNumber =
        String(
          header?.transfer_number ??
            "",
        );

      documentDate =
        String(
          header?.transfer_date ??
            "",
        );
    }


    if (
      kind ===
      "ajuste"
    ) {
      const [
        headerResult,
        itemsResult,
      ] =
        await Promise.all([
          supabaseAdmin
            .from(
              "inventory_adjustments",
            )
            .select("*")
            .eq(
              "id",
              id,
            )
            .maybeSingle(),

          supabaseAdmin
            .from(
              "inventory_adjustment_items",
            )
            .select("*")
            .eq(
              "adjustment_id",
              id,
            ),
        ]);

      if (
        headerResult.error
      ) {
        throw new Error(
          headerResult.error.message,
        );
      }

      if (
        itemsResult.error
      ) {
        throw new Error(
          itemsResult.error.message,
        );
      }

      header =
        headerResult.data;

      items =
        itemsResult.data ??
        [];

      documentNumber =
        String(
          header?.adjustment_number ??
            "",
        );

      documentDate =
        String(
          header?.adjustment_date ??
            "",
        );
    }


    if (!header) {
      return NextResponse.json(
        {
          error:
            "No se encontró el movimiento.",
        },
        {
          status: 404,
        },
      );
    }


    const itemIds = [
      ...new Set(
        items
          .map(
            (item) =>
              item.item_id,
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
        [
          ...items.map(
            (item) =>
              item.warehouse_id,
          ),

          header.source_warehouse_id,

          header.destination_warehouse_id,
        ].filter(
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
        items
          .map(
            (item) =>
              item.lot_id,
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
    ] =
      await Promise.all([
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
          (row) => [
            row.id,
            row,
          ],
        ),
      );

    const warehousesById =
      new Map(
        (
          warehousesResult.data ??
          []
        ).map(
          (row) => [
            row.id,
            row,
          ],
        ),
      );

    const lotsById =
      new Map(
        (
          lotsResult.data ??
          []
        ).map(
          (row) => [
            row.id,
            row,
          ],
        ),
      );


    const enrichedItems =
      items.map(
        (item) => ({
          ...item,

          quantity:
            Number(
              item.quantity ??
                0,
            ),

          quantity_adjustment:
            Number(
              item.quantity_adjustment ??
                0,
            ),

          previous_balance:
            Number(
              item.previous_balance ??
                0,
            ),

          new_balance:
            Number(
              item.new_balance ??
                0,
            ),

          product:
            typeof item.item_id ===
            "string"
              ? productsById.get(
                  item.item_id,
                ) ?? null
              : null,

          warehouse:
            typeof item.warehouse_id ===
            "string"
              ? warehousesById.get(
                  item.warehouse_id,
                ) ?? null
              : null,

          lot:
            typeof item.lot_id ===
            "string"
              ? lotsById.get(
                  item.lot_id,
                ) ?? null
              : null,
        }),
      );


    return NextResponse.json({
      kind,
      document_number:
        documentNumber,

      document_date:
        documentDate,

      header: {
        ...header,

        source_warehouse:
          typeof header.source_warehouse_id ===
          "string"
            ? warehousesById.get(
                header.source_warehouse_id,
              ) ?? null
            : null,

        destination_warehouse:
          typeof header.destination_warehouse_id ===
          "string"
            ? warehousesById.get(
                header.destination_warehouse_id,
              ) ?? null
            : null,
      },

      items:
        enrichedItems,
    });
  } catch (error) {
    return handleError(
      error,
    );
  }
}
