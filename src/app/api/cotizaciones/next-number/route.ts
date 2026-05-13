import { NextResponse } from "next/server";
import { getNextQuoteNumber } from "@/lib/getNextQuoteNumber";

export async function GET() {
  try {
    const quoteNumber = await getNextQuoteNumber();

    return NextResponse.json({
      ok: true,
      quoteNumber,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Error generando consecutivo",
      },
      { status: 500 }
    );
  }
}