import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { siigoRequest } from "@/lib/integrations/siigo/client";

const SIIGO_PRODUCTS_URL =
  "https://api.siigo.com/v1/products";

const ACCOUNT_GROUP_BY_PREFIX: Record<string, number> = {
  MPP: 1878,
  MPC: 1895,
  INS: 1909,
  PTF: 1877,
  PTC: 373,
  SER: 1806,
  ALQ: 1876,
};

const UNIT_BY_CLAP: Record<string, string> = {
  UNIDAD: "94",
  UND: "94",
  KG: "KGM",
  G: "GGR",
  M: "MTR",
  LB: "LBR",
};

type ProductRow = {
  id: string;
  final_code: string | null;
  name: string | null;
  classification_code: string | null;
  unit: string | null;
  dian_unit: string | null;
  status: string | null;
  siigo_type: string | null;
  tax_charge: string | null;
  suggested_price: number | null;
  include_iva_in_price: boolean | null;
  tracks_inventory: boolean | null;
  siigo_inventory_product: boolean | null;
  siigo_sync_enabled: boolean | null;
  siigo_product_id: string | null;
  siigo_sync_status: string | null;
};

type SiigoProduct = {
  id?: string;
  code?: string;
  name?: string;
};

export type ProductSiigoSyncResult =
  | {
      ok: true;
      action:
        | "already_linked"
        | "linked_existing"
        | "created";
      siigoProductId: string;
    }
  | {
      ok: false;
      action:
        | "disabled"
        | "error";
      error: string;
    };

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isLiveMode() {
  return (
    process.env.SIIGO_MASTER_SYNC_MODE
      ?.trim()
      .toLowerCase() === "live"
  );
}

function getAccountGroup(product: ProductRow) {
  const source =
    product.classification_code ||
    product.final_code ||
    "";

  const prefix =
    normalize(source)
      .split("-")[0];

  const accountGroup =
    ACCOUNT_GROUP_BY_PREFIX[prefix];

  if (!accountGroup) {
    throw new Error(
      `No existe un grupo contable SIIGO configurado para el prefijo ${prefix || "vacío"}.`,
    );
  }

  return accountGroup;
}

function getSiigoUnit(product: ProductRow) {
  const explicit =
    String(product.dian_unit ?? "")
      .trim();

  if (explicit) {
    return explicit;
  }

  const mapped =
    UNIT_BY_CLAP[
      normalize(product.unit)
    ];

  if (!mapped) {
    throw new Error(
      `No existe equivalencia SIIGO para la unidad ${product.unit ?? "vacía"}.`,
    );
  }

  return mapped;
}

function getSiigoType(product: ProductRow) {
  const value =
    normalize(product.siigo_type);

  if (
    value === "SERVICIO" ||
    value === "SERVICE"
  ) {
    return "Service";
  }

  if (
    value === "COMBO"
  ) {
    return "Combo";
  }

  return "Product";
}

function getTaxConfiguration(product: ProductRow) {
  const tax =
    normalize(product.tax_charge);

  if (
    !tax ||
    tax === "NO APLICA"
  ) {
    return {
      tax_classification:
        "Excluded",
      taxes: [] as Array<{ id: number }>,
    };
  }

  if (
    tax.includes("IVA") &&
    tax.includes("19")
  ) {
    return {
      tax_classification:
        "Taxed",
      taxes: [
        {
          id: 3916,
        },
      ],
    };
  }

  throw new Error(
    `El impuesto "${product.tax_charge}" todavía no tiene equivalencia configurada para SIIGO.`,
  );
}

async function readJson(
  response: Response,
) {
  const raw =
    await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      raw,
    };
  }
}

async function markProductError(
  productId: string,
  error: unknown,
) {
  const message =
    error instanceof Error
      ? error.message
      : "Error desconocido al sincronizar con SIIGO.";

  console.error(
    `SIIGO · Producto ${productId}:`,
    message,
  );

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("products")
    .update({
      siigo_sync_status:
        "Error",
    })
    .eq(
      "id",
      productId,
    );

  if (updateError) {
    console.error(
      "No se pudo marcar el producto con error SIIGO:",
      updateError,
    );
  }

  return message;
}

async function linkProduct(
  productId: string,
  siigoProductId: string,
  dianUnit: string,
) {
  const {
    error,
  } = await supabaseAdmin
    .from("products")
    .update({
      siigo_product_id:
        siigoProductId,

      siigo_sync_status:
        "Sincronizada",

      dian_unit:
        dianUnit,
    })
    .eq(
      "id",
      productId,
    );

  if (error) {
    throw new Error(
      `SIIGO respondió correctamente, pero CLAP no pudo guardar el vínculo del producto: ${error.message}`,
    );
  }
}

export async function syncProductToSiigo(
  productId: string,
): Promise<ProductSiigoSyncResult> {
  if (!isLiveMode()) {
    return {
      ok: false,
      action:
        "disabled",
      error:
        "La sincronización automática de maestros SIIGO no está en modo live.",
    };
  }

  try {
    const {
      data: product,
      error: productError,
    } = await supabaseAdmin
      .from("products")
      .select(`
        id,
        final_code,
        name,
        classification_code,
        unit,
        dian_unit,
        status,
        siigo_type,
        tax_charge,
        suggested_price,
        include_iva_in_price,
        tracks_inventory,
        siigo_inventory_product,
        siigo_sync_enabled,
        siigo_product_id,
        siigo_sync_status
      `)
      .eq(
        "id",
        productId,
      )
      .single<ProductRow>();

    if (productError) {
      throw new Error(
        `No se pudo consultar el producto CLAP: ${productError.message}`,
      );
    }

    if (!product) {
      throw new Error(
        "El producto CLAP no existe.",
      );
    }

    if (
      product.siigo_sync_enabled ===
      false
    ) {
      return {
        ok: false,
        action:
          "disabled",
        error:
          "El producto tiene deshabilitada la sincronización con SIIGO.",
      };
    }

    if (
      product.siigo_product_id
    ) {
      return {
        ok: true,
        action:
          "already_linked",
        siigoProductId:
          product.siigo_product_id,
      };
    }

    const code =
      String(
        product.final_code ?? "",
      ).trim();

    const name =
      String(
        product.name ?? "",
      ).trim();

    if (!code) {
      throw new Error(
        "El producto no tiene código oficial.",
      );
    }

    if (!name) {
      throw new Error(
        "El producto no tiene nombre.",
      );
    }

    const dianUnit =
      getSiigoUnit(product);

    /*
     * 1. Buscar primero por código.
     *    Nunca crear a ciegas.
     */
    const searchUrl =
      new URL(
        SIIGO_PRODUCTS_URL,
      );

    searchUrl.searchParams.set(
      "code",
      code,
    );

    const searchResponse =
      await siigoRequest(
        searchUrl.toString(),
        {
          method:
            "GET",
          headers: {
            Accept:
              "application/json",
          },
        },
      );

    const searchPayload =
      await readJson(
        searchResponse,
      );

    if (!searchResponse.ok) {
      throw new Error(
        `SIIGO rechazó la búsqueda del producto (${searchResponse.status} ${searchResponse.statusText}).`,
      );
    }

    const results =
      Array.isArray(
        searchPayload?.results,
      )
        ? (
            searchPayload.results as SiigoProduct[]
          )
        : [];

    const exactMatches =
      results.filter(
        (item) =>
          normalize(item.code) ===
          normalize(code),
      );

    if (
      exactMatches.length > 1
    ) {
      throw new Error(
        `SIIGO tiene más de un producto con el código ${code}. Se requiere revisión manual.`,
      );
    }

    if (
      exactMatches.length === 1
    ) {
      const siigoProductId =
        String(
          exactMatches[0].id ??
          "",
        ).trim();

      if (!siigoProductId) {
        throw new Error(
          "SIIGO encontró el producto, pero no devolvió su identificador.",
        );
      }

      await linkProduct(
        product.id,
        siigoProductId,
        dianUnit,
      );

      return {
        ok: true,
        action:
          "linked_existing",
        siigoProductId,
      };
    }

    /*
     * 2. No existe: crear.
     */
    const accountGroup =
      getAccountGroup(product);

    const type =
      getSiigoType(product);

    const tax =
      getTaxConfiguration(
        product,
      );

    const stockControl =
      type === "Product"
        ? Boolean(
            product.siigo_inventory_product ??
            product.tracks_inventory,
          )
        : false;

    /*
     * Precio de venta.
     *
     * Para PTF y PTC el precio sugerido registrado
     * durante la codificación se envía a la lista
     * "Precio de venta 1" de SIIGO.
     *
     * Para las demás categorías no se envía prices.
     */
    const categoryPrefix =
      normalize(
        product.classification_code,
      )
        .split("-")[0];

    const suggestedPrice =
      Number(
        product.suggested_price ??
          0,
      );

    const shouldSendSuggestedPrice =
      ["PTF", "PTC"].includes(
        categoryPrefix,
      ) &&
      Number.isFinite(
        suggestedPrice,
      ) &&
      suggestedPrice > 0;

    const createPayload = {
      code,
      name,

      account_group:
        accountGroup,

      type,

      stock_control:
        stockControl,

      active:
        normalize(
          product.status,
        ) !== "INACTIVO",

      tax_classification:
        tax.tax_classification,

      tax_included:
        Boolean(
          product.include_iva_in_price,
        ),

      taxes:
        tax.taxes,

      ...(shouldSendSuggestedPrice
        ? {
            prices: [
              {
                currency_code:
                  "COP",

                price_list: [
                  {
                    position:
                      1,

                    name:
                      "Precio de venta 1",

                    value:
                      suggestedPrice,
                  },
                ],
              },
            ],
          }
        : {}),

      unit:
        dianUnit,
    };

    const createResponse =
      await siigoRequest(
        SIIGO_PRODUCTS_URL,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              createPayload,
            ),
        },
      );

    const created =
      await readJson(
        createResponse,
      );

    if (!createResponse.ok) {
      const detail =
        JSON.stringify(
          created,
        );

      throw new Error(
        `SIIGO rechazó la creación del producto (${createResponse.status} ${createResponse.statusText}). ${detail}`,
      );
    }

    const siigoProductId =
      String(
        created?.id ??
        "",
      ).trim();

    if (!siigoProductId) {
      throw new Error(
        "SIIGO creó el producto, pero no devolvió su identificador.",
      );
    }

    await linkProduct(
      product.id,
      siigoProductId,
      dianUnit,
    );

    return {
      ok: true,
      action:
        "created",
      siigoProductId,
    };
  } catch (error) {
    const message =
      await markProductError(
        productId,
        error,
      );

    return {
      ok: false,
      action:
        "error",
      error:
        message,
    };
  }
}
