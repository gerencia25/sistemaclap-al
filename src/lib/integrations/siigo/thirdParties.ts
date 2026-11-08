import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { siigoRequest } from "@/lib/integrations/siigo/client";
import { resolveSiigoCity } from "@/lib/integrations/siigo/cities";

const SIIGO_CUSTOMERS_URL =
  "https://api.siigo.com/v1/customers";

type SiigoRole =
  | "Customer"
  | "Supplier";

type ThirdPartyRow = {
  id: string;

  is_customer: boolean;
  is_supplier: boolean;

  person_type: string | null;

  identification_type:
    | string
    | null;

  identification_number:
    | string
    | null;

  verification_digit:
    | string
    | null;

  first_name:
    | string
    | null;

  last_name:
    | string
    | null;

  business_name:
    | string
    | null;

  commercial_name:
    | string
    | null;

  country:
    | string
    | null;

  department:
    | string
    | null;

  city:
    | string
    | null;

  address:
    | string
    | null;

  postal_code:
    | string
    | null;

  phone_indicative:
    | string
    | null;

  phone:
    | string
    | null;

  email:
    | string
    | null;

  fiscal_responsibility:
    | string
    | null;

  is_vat_responsible:
    | boolean
    | null;

  is_grand_taxpayer:
    | boolean
    | null;

  is_self_withholder:
    | boolean
    | null;

  is_vat_withholding_agent:
    | boolean
    | null;

  observations:
    | string
    | null;

  status:
    | string
    | null;

  siigo_sync_enabled:
    | boolean
    | null;

  siigo_customer_id:
    | string
    | null;

  siigo_supplier_id:
    | string
    | null;

  siigo_third_party_id:
    | string
    | null;
};

type ContactRow = {
  first_name:
    | string
    | null;

  last_name:
    | string
    | null;

  email:
    | string
    | null;

  phone_indicative:
    | string
    | null;

  phone:
    | string
    | null;

  is_primary:
    | boolean
    | null;
};

type SiigoThirdParty = {
  id?: string;
  type?: string;

  identification?:
    | string
    | number;

  branch_office?:
    | string
    | number;
};

type RoleResult = {
  role: SiigoRole;

  action:
    | "already_linked"
    | "linked_existing"
    | "would_create"
    | "created";

  siigoId?: string;
};

export type ThirdPartySiigoSyncResult =
  | {
      ok: true;
      simulated: boolean;
      synchronized: boolean;
      roles: RoleResult[];
    }
  | {
      ok: false;
      simulated: boolean;
      error: string;
      roles: RoleResult[];
    };

function normalize(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function digits(
  value: unknown,
) {
  return String(value ?? "")
    .replace(
      /\D/g,
      "",
    );
}

function normalizeIdentification(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      "",
    );
}

function sanitizeSiigoAddress(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim()
    .slice(
      0,
      256,
    );
}

function getMode() {
  return (
    process.env
      .SIIGO_THIRD_PARTY_SYNC_MODE
      ?.trim()
      .toLowerCase() ||
    "simulate"
  );
}

function getIdTypeCode(
  value: string | null,
) {
  const key =
    normalize(value);

  const map:
    Record<string, string> = {
      NIT:
        "31",

      CC:
        "13",

      "CEDULA DE CIUDADANIA":
        "13",

      CE:
        "22",

      "CEDULA DE EXTRANJERIA":
        "22",

      "DOCUMENTO DE IDENTIFICACION EXTRANJERO":
        "42",

      "NIT DE OTRO PAIS":
        "50",

      NUIP:
        "91",

      PASAPORTE:
        "41",

      PEP:
        "47",

      "PERMISO ESPECIAL DE PERMANENCIA PEP":
        "47",

      "REGISTRO CIVIL":
        "11",

      "SIN IDENTIFICACION DEL EXTERIOR O PARA USO DEFINIDO POR LA DIAN":
        "43",

      "TARJETA DE EXTRANJERIA":
        "21",

      "TARJETA DE IDENTIDAD":
        "12",

      "SALVOCONDUCTO DE PERMANENCIA":
        "89",

      PPT:
        "48",

      "PERMISO PROTECCION TEMPORAL PPT":
        "48",
    };

  const code =
    map[key];

  if (!code) {
    throw new Error(
      `El tipo de identificación "${value}" no tiene equivalencia configurada para SIIGO.`,
    );
  }

  return code;
}

function getFiscalResponsibilities(
  thirdParty: ThirdPartyRow,
) {
  const codes =
    new Set<string>();

  const source =
    String(
      thirdParty
        .fiscal_responsibility ??
      "",
    );

  const matches =
    source.match(
      /R-99-PN|O-13|O-15|O-23|O-47/g,
    );

  for (
    const code of
    matches ?? []
  ) {
    codes.add(code);
  }

  if (
    thirdParty
      .is_grand_taxpayer
  ) {
    codes.add(
      "O-13",
    );
  }

  if (
    thirdParty
      .is_self_withholder
  ) {
    codes.add(
      "O-15",
    );
  }

  if (
    thirdParty
      .is_vat_withholding_agent
  ) {
    codes.add(
      "O-23",
    );
  }

  if (
    codes.size === 0
  ) {
    codes.add(
      "R-99-PN",
    );
  }

  return Array.from(
    codes,
  ).map(
    (code) => ({
      code,
    }),
  );
}

function getName(
  thirdParty: ThirdPartyRow,
) {
  if (
    normalize(
      thirdParty.person_type,
    ) === "PERSONA"
  ) {
    const firstName =
      String(
        thirdParty.first_name ??
        "",
      ).trim();

    const lastName =
      String(
        thirdParty.last_name ??
        "",
      ).trim();

    if (!firstName) {
      throw new Error(
        "La persona no tiene nombres registrados.",
      );
    }

    return [
      firstName,
      lastName,
    ].filter(Boolean);
  }

  const businessName =
    String(
      thirdParty.business_name ??
      "",
    ).trim();

  if (!businessName) {
    throw new Error(
      "La empresa no tiene razón social.",
    );
  }

  return [
    businessName,
  ];
}

function getPersonType(
  thirdParty: ThirdPartyRow,
) {
  return (
    normalize(
      thirdParty.person_type,
    ) === "PERSONA"
      ? "Person"
      : "Company"
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
    return JSON.parse(
      raw,
    );
  } catch {
    return {
      raw,
    };
  }
}

async function searchSiigo(
  identification: string,
) {
  const url =
    new URL(
      SIIGO_CUSTOMERS_URL,
    );

  url.searchParams.set(
    "identification",
    identification,
  );

  const response =
    await siigoRequest(
      url.toString(),
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const payload =
    await readJson(
      response,
    );

  if (!response.ok) {
    throw new Error(
      `SIIGO rechazó la búsqueda del tercero (${response.status} ${response.statusText}).`,
    );
  }

  return Array.isArray(
    payload?.results,
  )
    ? (
        payload.results as SiigoThirdParty[]
      )
    : [];
}

function findExactRole(
  records: SiigoThirdParty[],
  identification: string,
  role: SiigoRole,
) {
  const matches =
    records.filter(
      (record) =>
        normalize(
          record.type,
        ) ===
          normalize(
            role,
          ) &&
        normalizeIdentification(
          record.identification,
        ) ===
          normalizeIdentification(
            identification,
          ),
    );

  if (
    matches.length > 1
  ) {
    throw new Error(
      `SIIGO tiene más de un registro ${role} para la identificación ${identification}. Se requiere revisión manual.`,
    );
  }

  return (
    matches[0] ??
    null
  );
}

function nextBranchOffice(
  records: SiigoThirdParty[],
) {
  if (
    records.length === 0
  ) {
    return 0;
  }

  const values =
    records
      .map(
        (record) =>
          Number(
            record
              .branch_office ??
            0,
          ),
      )
      .filter(
        (value) =>
          Number.isInteger(
            value,
          ) &&
          value >= 0 &&
          value <= 999,
      );

  const used =
    new Set(values);

  for (
    let value = 0;
    value <= 999;
    value++
  ) {
    if (
      !used.has(value)
    ) {
      return value;
    }
  }

  throw new Error(
    "No hay un número de sucursal SIIGO disponible entre 0 y 999.",
  );
}

async function getPrimaryContact(
  thirdPartyId: string,
): Promise<ContactRow | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "third_party_contacts",
    )
    .select(`
      first_name,
      last_name,
      email,
      phone_indicative,
      phone,
      is_primary
    `)
    .eq(
      "third_party_id",
      thirdPartyId,
    )
    .eq(
      "status",
      "Activo",
    )
    .order(
      "is_primary",
      {
        ascending:
          false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar el contacto principal: ${error.message}`,
    );
  }

  return (
    data ??
    null
  );
}

async function buildCreatePayload(
  thirdParty: ThirdPartyRow,
  role: SiigoRole,
  branchOffice: number,
) {
  const identification =
    String(
      thirdParty
        .identification_number ??
      "",
    ).trim();

  if (!identification) {
    throw new Error(
      "El tercero no tiene identificación.",
    );
  }

  const idType =
    getIdTypeCode(
      thirdParty
        .identification_type,
    );

  if (
    ["31", "13", "11"].includes(
      idType,
    ) &&
    !/^\d{3,13}$/.test(
      identification,
    )
  ) {
    throw new Error(
      `La identificación ${identification} no cumple el formato numérico exigido por SIIGO para el tipo ${idType}.`,
    );
  }

  const address =
    sanitizeSiigoAddress(
      thirdParty.address,
    );

  if (!address) {
    throw new Error(
      "El tercero no tiene dirección y SIIGO la exige para crear el registro.",
    );
  }

  const city =
    await resolveSiigoCity({
      country:
        thirdParty.country,

      state:
        thirdParty.department,

      city:
        thirdParty.city,
    });

  const contact =
    await getPrimaryContact(
      thirdParty.id,
    );

  const payload:
    Record<string, unknown> = {
      type:
        role,

      person_type:
        getPersonType(
          thirdParty,
        ),

      id_type:
        idType,

      identification,

      name:
        getName(
          thirdParty,
        ),

      branch_office:
        branchOffice,

      active:
        normalize(
          thirdParty.status,
        ) !== "INACTIVO",

      vat_responsible:
        Boolean(
          thirdParty
            .is_vat_responsible,
        ),

      fiscal_responsibilities:
        getFiscalResponsibilities(
          thirdParty,
        ),

      address: {
        address,

        city: {
          country_code:
            city.country_code,

          state_code:
            city.state_code,

          city_code:
            city.city_code,
        },

        ...(thirdParty.postal_code
          ? {
              postal_code:
                thirdParty
                  .postal_code,
            }
          : {}),
      },
    };

  if (
    thirdParty
      .verification_digit
  ) {
    payload.check_digit =
      String(
        thirdParty
          .verification_digit,
      ).trim();
  }

  if (
    thirdParty
      .commercial_name
  ) {
    payload.commercial_name =
      thirdParty
        .commercial_name;
  }

  /*
   * El teléfono general es opcional en SIIGO.
   * No lo enviamos automáticamente hasta tener
   * datos telefónicos normalizados en CLAP.
   */
  if (
    contact?.first_name
  ) {
    const siigoContact:
      Record<string, unknown> = {
        first_name:
          contact
            .first_name,
      };

    if (
      contact.last_name
    ) {
      siigoContact.last_name =
        contact.last_name;
    }

    if (
      contact.email
    ) {
      siigoContact.email =
        contact.email;
    }

    const contactPhone =
      digits(
        contact.phone,
      );

    if (contactPhone) {
      siigoContact.phone = {
        indicative:
          digits(
            contact
              .phone_indicative,
          ),

        number:
          contactPhone,
      };
    }

    payload.contacts = [
      siigoContact,
    ];
  }

  if (
    thirdParty
      .observations
  ) {
    payload.comments =
      thirdParty
        .observations;
  }

  return payload;
}

async function createRole(
  thirdParty: ThirdPartyRow,
  role: SiigoRole,
  existingRecords: SiigoThirdParty[],
) {
  const branchOffice =
    nextBranchOffice(
      existingRecords,
    );

  const payload =
    await buildCreatePayload(
      thirdParty,
      role,
      branchOffice,
    );

  const response =
    await siigoRequest(
      SIIGO_CUSTOMERS_URL,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",
        },

        body:
          JSON.stringify(
            payload,
          ),
      },
    );

  const created =
    await readJson(
      response,
    );

  if (!response.ok) {
    throw new Error(
      `SIIGO rechazó la creación ${role} (${response.status} ${response.statusText}). ${JSON.stringify(created)}`,
    );
  }

  const id =
    String(
      created?.id ??
      "",
    ).trim();

  if (!id) {
    throw new Error(
      `SIIGO creó el registro ${role}, pero no devolvió su id.`,
    );
  }

  return {
    id,
    branchOffice,
  };
}

async function saveLinks(
  thirdParty: ThirdPartyRow,
  customerId: string | null,
  supplierId: string | null,
  status:
    | "Pendiente"
    | "Sincronizada"
    | "Error",
) {
  const legacyId =
    supplierId ||
    customerId ||
    thirdParty
      .siigo_third_party_id ||
    null;

  const {
    error,
  } = await supabaseAdmin
    .from(
      "third_parties",
    )
    .update({
      siigo_customer_id:
        customerId,

      siigo_supplier_id:
        supplierId,

      siigo_third_party_id:
        legacyId,

      siigo_sync_status:
        status,

      siigo_last_sync_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      thirdParty.id,
    );

  if (error) {
    throw new Error(
      `CLAP no pudo guardar el vínculo SIIGO del tercero: ${error.message}`,
    );
  }
}

export async function syncThirdPartyToSiigo(
  thirdPartyId: string,
): Promise<ThirdPartySiigoSyncResult> {
  const mode =
    getMode();

  const simulated =
    mode !== "live";

  const roles:
    RoleResult[] = [];

  try {
    const {
      data: thirdParty,
      error,
    } = await supabaseAdmin
      .from(
        "third_parties",
      )
      .select(`
        id,
        is_customer,
        is_supplier,
        person_type,
        identification_type,
        identification_number,
        verification_digit,
        first_name,
        last_name,
        business_name,
        commercial_name,
        country,
        department,
        city,
        address,
        postal_code,
        phone_indicative,
        phone,
        email,
        fiscal_responsibility,
        is_vat_responsible,
        is_grand_taxpayer,
        is_self_withholder,
        is_vat_withholding_agent,
        observations,
        status,
        siigo_sync_enabled,
        siigo_customer_id,
        siigo_supplier_id,
        siigo_third_party_id
      `)
      .eq(
        "id",
        thirdPartyId,
      )
      .single<ThirdPartyRow>();

    if (error) {
      throw new Error(
        `No se pudo consultar el tercero CLAP: ${error.message}`,
      );
    }

    if (
      thirdParty
        .siigo_sync_enabled ===
      false
    ) {
      return {
        ok: true,
        simulated,
        synchronized:
          false,
        roles,
      };
    }

    const identification =
      String(
        thirdParty
          .identification_number ??
        "",
      ).trim();

    if (!identification) {
      throw new Error(
        "El tercero no tiene identificación.",
      );
    }

    const requiredRoles:
      SiigoRole[] = [];

    if (
      thirdParty.is_customer
    ) {
      requiredRoles.push(
        "Customer",
      );
    }

    if (
      thirdParty.is_supplier
    ) {
      requiredRoles.push(
        "Supplier",
      );
    }

    if (
      requiredRoles.length === 0
    ) {
      await saveLinks(
        thirdParty,
        thirdParty
          .siigo_customer_id,
        thirdParty
          .siigo_supplier_id,
        "Pendiente",
      );

      return {
        ok: true,
        simulated,
        synchronized:
          false,
        roles,
      };
    }

    let customerId =
      thirdParty
        .siigo_customer_id;

    let supplierId =
      thirdParty
        .siigo_supplier_id;

    const records =
      await searchSiigo(
        identification,
      );

    for (
      const role of
      requiredRoles
    ) {
      const currentId =
        role ===
        "Customer"
          ? customerId
          : supplierId;

      if (currentId) {
        roles.push({
          role,
          action:
            "already_linked",
          siigoId:
            currentId,
        });

        continue;
      }

      const existing =
        findExactRole(
          records,
          identification,
          role,
        );

      if (
        existing?.id
      ) {
        const id =
          String(
            existing.id,
          );

        if (
          role ===
          "Customer"
        ) {
          customerId =
            id;
        } else {
          supplierId =
            id;
        }

        roles.push({
          role,
          action:
            "linked_existing",
          siigoId:
            id,
        });

        continue;
      }

      if (
        mode !== "live"
      ) {
        roles.push({
          role,
          action:
            "would_create",
        });

        continue;
      }

      const created =
        await createRole(
          thirdParty,
          role,
          records,
        );

      if (
        role ===
        "Customer"
      ) {
        customerId =
          created.id;
      } else {
        supplierId =
          created.id;
      }

      records.push({
        id:
          created.id,

        type:
          role,

        identification,

        branch_office:
          created
            .branchOffice,
      });

      roles.push({
        role,
        action:
          "created",
        siigoId:
          created.id,
      });
    }

    const customerReady =
      !thirdParty
        .is_customer ||
      Boolean(
        customerId,
      );

    const supplierReady =
      !thirdParty
        .is_supplier ||
      Boolean(
        supplierId,
      );

    const synchronized =
      customerReady &&
      supplierReady;

    await saveLinks(
      thirdParty,
      customerId,
      supplierId,
      synchronized
        ? "Sincronizada"
        : "Pendiente",
    );

    return {
      ok: true,
      simulated,
      synchronized,
      roles,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido sincronizando el tercero con SIIGO.";

    console.error(
      `SIIGO · Tercero ${thirdPartyId}:`,
      message,
    );

    await supabaseAdmin
      .from(
        "third_parties",
      )
      .update({
        siigo_sync_status:
          "Error",

        siigo_last_sync_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        thirdPartyId,
      );

    return {
      ok: false,
      simulated,
      error:
        message,
      roles,
    };
  }
}
