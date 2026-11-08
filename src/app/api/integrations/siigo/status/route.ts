import {
  NextResponse,
} from "next/server";

import {
  getSiigoAccessToken,
  getSiigoPartnerId,
} from "@/lib/integrations/siigo/client";

import {
  ApiAuthorizationError,
  requireSystemPermission,
} from "@/lib/server/requireSystemPermission";

export const runtime =
  "nodejs";

export async function GET(
  request: Request,
) {
  try {
    await requireSystemPermission(
      request,
      "ABASTECIMIENTO_COMPRAS_MANAGE",
    );

    const token =
      await getSiigoAccessToken();

    return NextResponse.json({
      connected: true,

      authenticated:
        Boolean(token),

      partner_id:
        getSiigoPartnerId(),

      message:
        "CLAP se autenticó correctamente con SIIGO.",
    });
  } catch (error) {
    console.error(
      "Estado integración SIIGO:",
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
        connected: false,

        authenticated:
          false,

        error:
          error instanceof Error
            ? error.message
            : "No se pudo conectar con SIIGO.",
      },
      {
        status: 500,
      },
    );
  }
}
