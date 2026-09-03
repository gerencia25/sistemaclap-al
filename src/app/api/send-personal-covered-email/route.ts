import { NextResponse } from "next/server";
import {
  CoveredEmployee,
  sendPersonalCoveredEmail,
} from "@/lib/server/sendPersonalCoveredEmail";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const employees: CoveredEmployee[] =
      Array.isArray(body.employees)
        ? body.employees
        : [];

    await sendPersonalCoveredEmail({
      to: String(body.to ?? "").trim(),

      requesterName: String(
        body.requesterName ?? "",
      ).trim(),

      requestNumber: String(
        body.requestNumber ?? "",
      ).trim(),

      requestReason:
        String(body.requestReason ?? "").trim() ||
        null,

      area: String(body.area ?? "").trim(),

      position: String(
        body.position ?? "",
      ).trim(),

      requestedQuantity:
        Number(body.requestedQuantity) || 0,

      fulfilledQuantity:
        Number(body.fulfilledQuantity) ||
        employees.length,

      closureType:
        body.closureType === "Parcial"
          ? "Parcial"
          : "Completo",

      closureReason:
        String(body.closureReason ?? "").trim() ||
        null,

      employees,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error enviando correo de cobertura de personal.",
      },
      { status: 500 },
    );
  }
}