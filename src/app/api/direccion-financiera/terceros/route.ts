import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime = "nodejs";

function handleError(error: unknown) {
  console.error("API Dirección Financiera · Terceros:", error);

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

// =========================================================
// GET
// Consulta del maestro de terceros.
// Protegido por TERCEROS_VIEW.
// =========================================================

export async function GET(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "TERCEROS_VIEW",
    );

    const url = new URL(request.url);

    const requestId =
      url.searchParams.get("requestId");

    const thirdPartyId =
      url.searchParams.get("thirdPartyId");

    // =====================================================
    // SOLICITUD ESPECÍFICA
    // =====================================================

    if (requestId) {
      const { data, error } =
        await supabaseAdmin
          .from("third_party_requests")
          .select("*")
          .eq("id", requestId)
          .single();

      if (error) {
        throw new Error(
          `No se pudo cargar la solicitud: ${error.message}`,
        );
      }

      return NextResponse.json({
        request: data,
      });
    }

    // =====================================================
    // CONTACTOS DE UN TERCERO
    // =====================================================

    if (thirdPartyId) {
      const { data, error } =
        await supabaseAdmin
          .from("third_party_contacts")
          .select("*")
          .eq("third_party_id", thirdPartyId)
          .eq("status", "Activo")
          .order("is_primary", {
            ascending: false,
          })
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        throw new Error(
          `No se pudieron cargar los contactos: ${error.message}`,
        );
      }

      return NextResponse.json({
        contacts: data ?? [],
      });
    }

    // =====================================================
    // CARGA GENERAL DEL MAESTRO
    // =====================================================

    const [
      thirdPartiesResult,
      requestAttachmentsResult,
      currentDocumentsResult,
      identificationTypesResult,
      fiscalResponsibilitiesResult,
      vatRegimesResult,
      paymentTermsResult,
      currenciesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("third_parties")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("third_party_requests")
        .select(`
          created_third_party_id,
          rut_file_url,
          rut_file_name,
          chamber_commerce_file_url,
          chamber_commerce_file_name,
          customer_knowledge_file_url,
          customer_knowledge_file_name,
          supplier_knowledge_file_url,
          supplier_knowledge_file_name
        `)
        .not(
          "created_third_party_id",
          "is",
          null,
        ),

      supabaseAdmin
        .from("third_party_documents")
        .select(`
          id,
          third_party_id,
          document_type,
          file_name,
          file_url,
          storage_path,
          mime_type,
          version,
          is_current,
          status,
          uploaded_by,
          source_request_id,
          created_at,
          updated_at
        `)
        .eq("is_current", true)
        .eq("status", "Activo"),

      supabaseAdmin
        .from("third_party_identification_types")
        .select("*")
        .eq("status", "Activo")
        .order("name"),

      supabaseAdmin
        .from("third_party_fiscal_responsibilities")
        .select("*")
        .eq("status", "Activo")
        .order("code"),

      supabaseAdmin
        .from("third_party_vat_regimes")
        .select("*")
        .eq("status", "Activo")
        .order("name"),

      supabaseAdmin
        .from("third_party_payment_terms")
        .select("*")
        .eq("status", "Activo")
        .order("days"),

      supabaseAdmin
        .from("third_party_currencies")
        .select("*")
        .eq("status", "Activo")
        .order("code"),
    ]);

    const errors = [
      thirdPartiesResult.error,
      requestAttachmentsResult.error,
      currentDocumentsResult.error,
      identificationTypesResult.error,
      fiscalResponsibilitiesResult.error,
      vatRegimesResult.error,
      paymentTermsResult.error,
      currenciesResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(
        errors
          .map((error) => error?.message)
          .filter(Boolean)
          .join(" | "),
      );
    }

    return NextResponse.json({
      thirdParties:
        thirdPartiesResult.data ?? [],

      requestAttachments:
        requestAttachmentsResult.data ?? [],

      currentDocuments:
        currentDocumentsResult.data ?? [],

      identificationTypes:
        identificationTypesResult.data ?? [],

      fiscalResponsibilities:
        fiscalResponsibilitiesResult.data ?? [],

      vatRegimes:
        vatRegimesResult.data ?? [],

      paymentTerms:
        paymentTermsResult.data ?? [],

      currencies:
        currenciesResult.data ?? [],
    });
  } catch (error) {
    return handleError(error);
  }
}

// =========================================================
// POST
// Crear o editar tercero.
// Contactos + solicitud se guardan transaccionalmente.
// Protegido por TERCEROS_APPROVE.
// =========================================================

export async function POST(request: Request) {
  try {
    await requireSystemPermission(
      request,
      "TERCEROS_APPROVE",
    );

    const body = await request.json();

    if (
      !body?.data ||
      typeof body.data !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "La información del tercero es obligatoria.",
        },
        { status: 400 },
      );
    }

    const contacts =
      Array.isArray(body.contacts)
        ? body.contacts
        : [];

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "save_third_party",
      {
        p_data: body.data,

        p_contacts:
          contacts,

        p_third_party_id:
          body.third_party_id || null,

        p_request_id:
          body.request_id || null,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      thirdParty: data,
    });
  } catch (error) {
    return handleError(error);
  }
}
