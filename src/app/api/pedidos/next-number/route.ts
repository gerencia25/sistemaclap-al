import { NextResponse } from "next/server";
import { getNextOrderNumber } from "@/lib/getNextOrderNumber";

export async function GET() {
  try {
    const orderNumber = await getNextOrderNumber();

    return NextResponse.json({
      ok: true,
      orderNumber,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Error generando consecutivo de pedido",
      },
      { status: 500 }
    );
  }
}