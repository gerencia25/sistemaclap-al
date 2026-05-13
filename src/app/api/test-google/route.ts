import { NextResponse } from "next/server";
import { createQuotationSheet } from "@/lib/createQuotationSheet";

export async function GET() {
  const quoteNumber = `COT-${Date.now().toString().slice(-6)}`;

  const file = await createQuotationSheet({
    quoteNumber,
    customer: {
      category: "Industrial",
      name: "Industrias Plásticas GR Ltda",
      nit: "860516715",
      contact: "Daniel",
      email: "elbertalfonso@inplastgr.com",
      phone: "3105558436",
      address: "Calle 7 # 26 - 62",
      city: "Bogotá",
    },
    commercial: {
      date: "12/05/2026",
      paymentTerms: "30 días",
      deliveryTime: "25 días hábiles",
      validity: "15 días",
      taxCondition: "NO INCLUYE IVA",
    },
    items: [
      {
        product: "Envase 3 Bocas",
        color: "Azul",
        unitPrice: 1223,
        quantity: 134,
        total: 163882,
      },
    ],
    observations: "Prueba automática desde Sistema CLAP.",
  });

  return NextResponse.json({
    ok: true,
    file,
  });
}