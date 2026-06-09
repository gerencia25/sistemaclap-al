import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestNumber = body.requestNumber;

    if (!requestNumber) {
      return NextResponse.json(
        { error: "Falta el número de solicitud." },
        { status: 400 },
      );
    }

    const { error } = await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: "administrador@almultiformas.com",
      subject: `Nueva solicitud de código ${requestNumber}`,
      text: `Se creó una nueva solicitud de código número ${requestNumber}.`,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo enviar la notificación." },
      { status: 500 },
    );
  }
}