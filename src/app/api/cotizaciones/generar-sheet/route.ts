import { NextResponse } from "next/server";
import { createQuotationSheet } from "@/lib/createQuotationSheet";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const sheet = await createQuotationSheet(body.sheetData);

    const { error } = await supabaseAdmin
      .from("quotations")
      .update({
        sheet_id: sheet.id,
        sheet_url: sheet.url,
      })
      .eq("id", body.quotationId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "Sheet creado, pero no se pudo actualizar Supabase",
          error: error.message,
          sheet,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      sheet,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}