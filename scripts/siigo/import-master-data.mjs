import { createClient } from "@supabase/supabase-js";

const APPLY =
  process.argv.includes("--apply");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const OMIT_PRODUCT_CODES =
  new Set([
    "1",
    "REGISTROMANUAL",
  ]);

const OMIT_ACCOUNT_GROUPS =
  new Set([
    1955, // PRUEBA PROCESO
  ]);

const PRODUCT_GROUPS = {
  1878: {
    category:
      "MATERIA PRIMA POLÍMEROS",
    supply_type:
      "Comprado",
    can_be_purchased:
      true,
    can_be_sold:
      false,
  },

  1895: {
    category:
      "MATERIA PRIMA COLORANTES Y ADITIVOS",
    supply_type:
      "Comprado",
    can_be_purchased:
      true,
    can_be_sold:
      false,
  },

  1909: {
    category:
      "INSUMOS",
    supply_type:
      "Comprado",
    can_be_purchased:
      true,
    can_be_sold:
      false,
  },

  1877: {
    category:
      "PRODUCTO TERMINADO FABRICADO",
    supply_type:
      "Fabricado",
    can_be_purchased:
      false,
    can_be_sold:
      true,
  },

  373: {
    category:
      "PRODUCTO TERMINADO COMERCIALIZADO",
    supply_type:
      "Comprado",
    can_be_purchased:
      true,
    can_be_sold:
      true,
  },

  1806: {
    category:
      "SERVICIOS",
    supply_type:
      "Comprado",
    can_be_purchased:
      true,
    can_be_sold:
      true,
  },

  1876: {
    category:
      "ALQUILER",
    supply_type:
      "Comprado",
    can_be_purchased:
      true,
    can_be_sold:
      true,
  },
};

const UNIT_MAP = {
  "94": "Unidad",
  "58": "KG",
  KGM: "KG",
  GGR: "G",
  MTR: "M",
  LBR: "LB",
};

function normalize(value) {
  return String(
    value ?? "",
  )
    .trim()
    .toUpperCase();
}

function digits(value) {
  return String(
    value ?? "",
  ).replace(
    /\D/g,
    "",
  );
}

function siigoName(value) {
  if (
    Array.isArray(value)
  ) {
    return value
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return String(
    value ?? "",
  ).trim();
}

function firstPrice(
  product,
) {
  const lists =
    product?.prices?.[0]
      ?.price_list;

  if (
    !Array.isArray(lists) ||
    !lists.length
  ) {
    return 0;
  }

  const value =
    Number(
      lists[0]?.value ??
      0,
    );

  return Number.isFinite(
    value,
  )
    ? value
    : 0;
}

function siigoTypeToClap(
  type,
) {
  if (type === "Service") {
    return "Servicio";
  }

  if (type === "Combo") {
    return "Combo";
  }

  return "Producto";
}

async function authenticateSiigo() {
  const response =
    await fetch(
      "https://api.siigo.com/auth",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Partner-Id":
            process.env
              .SIIGO_PARTNER_ID,
        },

        body:
          JSON.stringify({
            username:
              process.env
                .SIIGO_API_USERNAME,

            access_key:
              process.env
                .SIIGO_API_ACCESS_KEY,
          }),
      },
    );

  const body =
    await response.json();

  if (
    !response.ok ||
    !body?.access_token
  ) {
    throw new Error(
      `No se pudo autenticar con SIIGO: ${response.status}`,
    );
  }

  return body.access_token;
}

async function getAllSiigo(
  endpoint,
  token,
) {
  const pageSize = 100;
  let page = 1;
  const all = [];

  while (true) {
    const url =
      new URL(
        `https://api.siigo.com/v1/${endpoint}`,
      );

    url.searchParams.set(
      "page",
      String(page),
    );

    url.searchParams.set(
      "page_size",
      String(pageSize),
    );

    const response =
      await fetch(
        url,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,

            "Partner-Id":
              process.env
                .SIIGO_PARTNER_ID,

            Accept:
              "application/json",
          },
        },
      );

    const body =
      await response.json();

    if (!response.ok) {
      console.dir(
        body,
        {
          depth: 10,
        },
      );

      throw new Error(
        `Falló SIIGO /${endpoint} página ${page}`,
      );
    }

    all.push(
      ...(
        body.results ??
        []
      ),
    );

    const total =
      body?.pagination
        ?.total_results ??
      all.length;

    if (
      all.length >= total
    ) {
      break;
    }

    page++;
  }

  return all;
}

function mapProduct(
  product,
) {
  const groupId =
    Number(
      product
        ?.account_group
        ?.id,
    );

  const group =
    PRODUCT_GROUPS[
      groupId
    ];

  if (!group) {
    return {
      skip:
        `Grupo contable sin mapeo: ${groupId}`,
    };
  }

  const siigoUnit =
    product?.unit?.code ??
    null;

  const unit =
    UNIT_MAP[
      siigoUnit
    ];

  if (!unit) {
    return {
      skip:
        `Unidad SIIGO sin mapeo: ${siigoUnit ?? "vacía"}`,
    };
  }

  const price =
    firstPrice(
      product,
    );

  const taxes =
    Array.isArray(
      product?.taxes,
    )
      ? product.taxes
      : [];

  const firstTax =
    taxes[0] ?? null;

  const inventory =
    Boolean(
      product
        ?.stock_control,
    );

  const active =
    product?.active !==
    false;

  return {
    data: {
      reference:
        String(
          product.code,
        ),

      final_code:
        String(
          product.code,
        ),

      name:
        String(
          product.name,
        ),

      category:
        group.category,

      item_type:
        group.category,

      unit,

      dian_unit:
        siigoUnit,

      suggested_price:
        price,

      status:
        active
          ? "Activo"
          : "Inactivo",

      product_type:
        product.type ===
        "Combo"
          ? "Combo"
          : "Simple",

      supply_type:
        group
          .supply_type,

      can_be_purchased:
        group
          .can_be_purchased,

      can_be_sold:
        group
          .can_be_sold,

      can_be_manufactured:
        false,

      tracks_inventory:
        inventory,

      is_inventory:
        inventory,

      siigo_inventory_product:
        inventory,

      has_taxes:
        taxes.length > 0,

      tax_type:
        product
          ?.tax_classification ??
        null,

      tax_charge:
        firstTax?.name ??
        "No aplica",

      tax_charge_two:
        "No aplica",

      include_iva_in_price:
        Boolean(
          product
            ?.tax_included,
        ),

      siigo_type:
        siigoTypeToClap(
          product.type,
        ),

      barcode:
        product
          ?.additional_fields
          ?.barcode ||
        null,

      price_list_1_name:
        "Precio de venta 1",

      price_list_1_value:
        price,

      visible_in_purchases:
        group
          .can_be_purchased,

      visible_purchases:
        group
          .can_be_purchased,

      visible_in_sales:
        group
          .can_be_sold,

      visible_sales:
        group
          .can_be_sold,

      siigo_sync_enabled:
        true,

      siigo_product_id:
        product.id,

      siigo_sync_status:
        "Sincronizada",

      item_master_data: {
        source:
          "SIIGO",

        imported_at:
          new Date()
            .toISOString(),

        account_group:
          product
            .account_group ??
          null,

        siigo_type:
          product.type ??
          null,

        tax_classification:
          product
            .tax_classification ??
          null,

        taxes,

        siigo_snapshot:
          product,
      },
    },
  };
}

function extractAddress(
  supplier,
) {
  const raw =
    supplier?.address;

  if (!raw) {
    return {
      country: null,
      department: null,
      city: null,
      address: null,
    };
  }

  if (
    typeof raw ===
    "string"
  ) {
    return {
      country: null,
      department: null,
      city: null,
      address: raw,
    };
  }

  const city =
    raw?.city ?? {};

  return {
    address:
      raw?.address ??
      raw?.street ??
      null,

    city:
      city?.city_name ??
      city?.name ??
      raw?.city_name ??
      null,

    department:
      city?.state_name ??
      city?.state ??
      raw?.state_name ??
      null,

    country:
      city?.country_name ??
      city?.country ??
      raw?.country_name ??
      null,
  };
}

function extractContact(
  supplier,
) {
  const contact =
    Array.isArray(
      supplier?.contacts,
    )
      ? supplier.contacts[0]
      : null;

  const phone =
    Array.isArray(
      supplier?.phones,
    )
      ? supplier.phones[0]
      : null;

  return {
    email:
      contact?.email ??
      null,

    phone:
      phone?.number ??
      phone?.phone ??
      null,

    indicative:
      phone?.indicative ??
      phone?.country_code ??
      null,
  };
}

function mapSupplier(
  supplier,
) {
  const idTypeCode =
    String(
      supplier
        ?.id_type
        ?.code ??
      supplier
        ?.id_type
        ?.id ??
      "",
    );

  const idTypeName =
    supplier
      ?.id_type
      ?.name ??
    (
      idTypeCode ===
      "31"
        ? "NIT"
        : "Otro"
    );

  const name =
    siigoName(
      supplier.name,
    );

  const location =
    extractAddress(
      supplier,
    );

  const contact =
    extractContact(
      supplier,
    );

  const fiscal =
    Array.isArray(
      supplier
        ?.fiscal_responsibilities,
    )
      ? supplier
          .fiscal_responsibilities
      : [];

  const fiscalPrimary =
    fiscal[0] ??
    null;

  const fiscalCodes =
    fiscal.map(
      item =>
        item?.code,
    );

  const isColombian =
    idTypeCode ===
    "31";

  const active =
    supplier?.active !==
    false;

  return {
    is_customer:
      false,

    is_supplier:
      true,

    is_other:
      false,

    person_type:
      "Empresa",

    identification_type:
      idTypeName,

    identification_number:
      String(
        supplier
          .identification,
      ),

    verification_digit:
      supplier
        ?.check_digit !=
      null
        ? String(
            supplier
              .check_digit,
          )
        : null,

    business_name:
      name ||
      String(
        supplier
          .identification,
      ),

    commercial_name:
      null,

    country:
      location.country ??
      (
        isColombian
          ? "Colombia"
          : null
      ),

    department:
      location.department,

    city:
      location.city,

    address:
      location.address,

    phone_indicative:
      contact.indicative,

    phone:
      contact.phone,

    email:
      contact.email,

    fiscal_responsibility:
      fiscalPrimary
        ? `${fiscalPrimary.code ?? ""} - ${fiscalPrimary.name ?? ""}`.trim()
        : "R-99-PN - No aplica / Otros",

    iva_regime:
      supplier
        ?.vat_responsible
        ? "Responsable de IVA"
        : "No aplica",

    is_vat_responsible:
      Boolean(
        supplier
          ?.vat_responsible,
      ),

    is_grand_taxpayer:
      fiscalCodes.includes(
        "O-13",
      ),

    is_self_withholder:
      fiscalCodes.includes(
        "O-15",
      ),

    status:
      active
        ? "Activo"
        : "Inactivo",

    currency:
      "COP",

    customer_knowledge_status:
      "No aplica",

    supplier_knowledge_status:
      "Pendiente",

    siigo_sync_enabled:
      true,

    siigo_sync_status:
      "Sincronizada",

    siigo_third_party_id:
      supplier.id,

    siigo_supplier_id:
      supplier.id,

    siigo_last_sync_at:
      new Date()
        .toISOString(),

    observations:
      "Importado automáticamente desde SIIGO. Expediente documental pendiente de completar en CLAP.",
  };
}

/*
 * =========================================================
 * CARGA
 * =========================================================
 */

console.log(
  APPLY
    ? "\n🚀 MODO APLICAR"
    : "\n🔎 MODO VISTA PREVIA",
);

const token =
  await authenticateSiigo();

const siigoProducts =
  await getAllSiigo(
    "products",
    token,
  );

const siigoThirdParties =
  await getAllSiigo(
    "customers",
    token,
  );

const siigoSuppliers =
  siigoThirdParties
    .filter(
      item =>
        item?.type ===
        "Supplier",
    );

const {
  data:
    existingProducts,
  error:
    existingProductsError,
} = await supabase
  .from("products")
  .select(`
    id,
    final_code,
    name,
    siigo_product_id
  `);

if (
  existingProductsError
) {
  throw existingProductsError;
}

const {
  data:
    existingSuppliers,
  error:
    existingSuppliersError,
} = await supabase
  .from(
    "third_parties",
  )
  .select(`
    id,
    identification_number,
    business_name,
    is_supplier,
    siigo_third_party_id
  `)
  .eq(
    "is_supplier",
    true,
  );

if (
  existingSuppliersError
) {
  throw existingSuppliersError;
}

const productBySiigoId =
  new Map();

const productByCode =
  new Map();

for (
  const product of
  existingProducts ?? []
) {
  if (
    product
      .siigo_product_id
  ) {
    productBySiigoId.set(
      product
        .siigo_product_id,
      product,
    );
  }

  const code =
    normalize(
      product.final_code,
    );

  if (!code) continue;

  if (
    !productByCode.has(
      code,
    )
  ) {
    productByCode.set(
      code,
      [],
    );
  }

  productByCode
    .get(code)
    .push(product);
}

const supplierBySiigoId =
  new Map();

const supplierByNit =
  new Map();

for (
  const supplier of
  existingSuppliers ??
  []
) {
  if (
    supplier
      .siigo_third_party_id
  ) {
    supplierBySiigoId.set(
      supplier
        .siigo_third_party_id,
      supplier,
    );
  }

  const nit =
    digits(
      supplier
        .identification_number,
    );

  if (!nit) continue;

  if (
    !supplierByNit.has(
      nit,
    )
  ) {
    supplierByNit.set(
      nit,
      [],
    );
  }

  supplierByNit
    .get(nit)
    .push(supplier);
}

const stats = {
  products: {
    alreadyLinked: 0,
    linkedByCode: 0,
    created: 0,
    omitted: 0,
    conflicts: 0,
    errors: 0,
  },

  suppliers: {
    alreadyLinked: 0,
    linkedByNit: 0,
    created: 0,
    conflicts: 0,
    errors: 0,
  },
};

const omittedProducts = [];
const errors = [];

/*
 * =========================================================
 * PRODUCTOS
 * =========================================================
 */

for (
  const product of
  siigoProducts
) {
  const code =
    normalize(
      product.code,
    );

  if (
    productBySiigoId.has(
      product.id,
    )
  ) {
    stats.products
      .alreadyLinked++;

    continue;
  }

  if (
    OMIT_PRODUCT_CODES.has(
      code,
    )
  ) {
    stats.products
      .omitted++;

    omittedProducts.push({
      code:
        product.code,

      name:
        product.name,

      reason:
        "Producto genérico/manual excluido del maestro operativo CLAP",
    });

    continue;
  }

  const groupId =
    Number(
      product
        ?.account_group
        ?.id,
    );

  if (
    OMIT_ACCOUNT_GROUPS.has(
      groupId,
    )
  ) {
    stats.products
      .omitted++;

    omittedProducts.push({
      code:
        product.code,

      name:
        product.name,

      reason:
        `Grupo ${groupId} · ${product?.account_group?.name ?? ""} pendiente de revisión`,
    });

    continue;
  }

  const matches =
    productByCode.get(
      code,
    ) ?? [];

  if (
    matches.length > 1
  ) {
    stats.products
      .conflicts++;

    errors.push({
      type:
        "PRODUCT_CONFLICT",

      code:
        product.code,

      reason:
        "Más de un producto CLAP con el mismo código",
    });

    continue;
  }

  if (
    matches.length === 1
  ) {
    stats.products
      .linkedByCode++;

    if (APPLY) {
      const {
        error,
      } = await supabase
        .from(
          "products",
        )
        .update({
          siigo_product_id:
            product.id,

          siigo_sync_enabled:
            true,

          siigo_sync_status:
            "Sincronizada",

          dian_unit:
            product
              ?.unit
              ?.code ??
            null,
        })
        .eq(
          "id",
          matches[0].id,
        );

      if (error) {
        stats.products
          .errors++;

        errors.push({
          type:
            "PRODUCT_LINK",

          code:
            product.code,

          message:
            error.message,
        });

        continue;
      }
    }

    continue;
  }

  const mapped =
    mapProduct(
      product,
    );

  if (
    mapped.skip
  ) {
    stats.products
      .omitted++;

    omittedProducts.push({
      code:
        product.code,

      name:
        product.name,

      reason:
        mapped.skip,
    });

    continue;
  }

  stats.products
    .created++;

  if (!APPLY) {
    continue;
  }

  const {
    data:
      inserted,
    error,
  } = await supabase
    .from(
      "products",
    )
    .insert(
      mapped.data,
    )
    .select(`
      id,
      final_code,
      name,
      siigo_product_id
    `)
    .single();

  if (error) {
    stats.products
      .created--;

    stats.products
      .errors++;

    errors.push({
      type:
        "PRODUCT_INSERT",

      code:
        product.code,

      message:
        error.message,
    });

    continue;
  }

  productBySiigoId.set(
    product.id,
    inserted,
  );

  productByCode.set(
    code,
    [inserted],
  );
}

/*
 * =========================================================
 * PROVEEDORES
 * =========================================================
 */

for (
  const supplier of
  siigoSuppliers
) {
  if (
    supplierBySiigoId.has(
      supplier.id,
    )
  ) {
    stats.suppliers
      .alreadyLinked++;

    continue;
  }

  const nit =
    digits(
      supplier
        .identification,
    );

  const matches =
    supplierByNit.get(
      nit,
    ) ?? [];

  if (
    matches.length > 1
  ) {
    stats.suppliers
      .conflicts++;

    errors.push({
      type:
        "SUPPLIER_CONFLICT",

      nit:
        supplier
          .identification,

      reason:
        "Más de un proveedor CLAP con el mismo NIT",
    });

    continue;
  }

  if (
    matches.length === 1
  ) {
    stats.suppliers
      .linkedByNit++;

    if (APPLY) {
      const {
        error,
      } = await supabase
        .from(
          "third_parties",
        )
        .update({
          siigo_third_party_id:
            supplier.id,

          siigo_supplier_id:
            supplier.id,

          siigo_sync_enabled:
            true,

          siigo_sync_status:
            "Sincronizada",

          siigo_last_sync_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          matches[0].id,
        );

      if (error) {
        stats.suppliers
          .errors++;

        errors.push({
          type:
            "SUPPLIER_LINK",

          nit:
            supplier
              .identification,

          message:
            error.message,
        });

        continue;
      }
    }

    continue;
  }

  const mapped =
    mapSupplier(
      supplier,
    );

  stats.suppliers
    .created++;

  if (!APPLY) {
    continue;
  }

  const {
    data:
      inserted,
    error,
  } = await supabase
    .from(
      "third_parties",
    )
    .insert(
      mapped,
    )
    .select(`
      id,
      identification_number,
      business_name,
      siigo_third_party_id
    `)
    .single();

  if (error) {
    stats.suppliers
      .created--;

    stats.suppliers
      .errors++;

    errors.push({
      type:
        "SUPPLIER_INSERT",

      nit:
        supplier
          .identification,

      message:
        error.message,
    });

    continue;
  }

  supplierBySiigoId.set(
    supplier.id,
    inserted,
  );

  supplierByNit.set(
    nit,
    [inserted],
  );
}

/*
 * =========================================================
 * RESULTADO
 * =========================================================
 */

console.log(
  "\n========================================",
);

console.log(
  APPLY
    ? "RESULTADO IMPORTACIÓN SIIGO → CLAP"
    : "VISTA PREVIA IMPORTACIÓN SIIGO → CLAP",
);

console.log(
  "========================================",
);

console.log(
  "\n📦 PRODUCTOS",
);

console.table({
  "SIIGO":
    siigoProducts.length,

  "Ya vinculados":
    stats.products
      .alreadyLinked,

  "Vincular por código":
    stats.products
      .linkedByCode,

  "Crear en CLAP":
    stats.products
      .created,

  "Omitidos / revisión":
    stats.products
      .omitted,

  "Conflictos":
    stats.products
      .conflicts,

  "Errores":
    stats.products
      .errors,
});

console.log(
  "\n🏢 PROVEEDORES",
);

console.table({
  "SIIGO":
    siigoSuppliers.length,

  "Ya vinculados":
    stats.suppliers
      .alreadyLinked,

  "Vincular por NIT":
    stats.suppliers
      .linkedByNit,

  "Crear en CLAP":
    stats.suppliers
      .created,

  "Conflictos":
    stats.suppliers
      .conflicts,

  "Errores":
    stats.suppliers
      .errors,
});

if (
  omittedProducts.length
) {
  console.log(
    "\n⚠️ PRODUCTOS OMITIDOS / REVISIÓN",
  );

  console.table(
    omittedProducts,
  );
}

if (
  errors.length
) {
  console.log(
    "\n❌ CONFLICTOS / ERRORES",
  );

  console.dir(
    errors,
    {
      depth: 6,
      colors: false,
    },
  );
}

console.log(
  APPLY
    ? "\n✅ Importación terminada."
    : "\n✅ Vista previa terminada. No se modificó CLAP ni SIIGO.",
);
