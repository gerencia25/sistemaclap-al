import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      to,
      requestNumber,
      requesterName,
      requestReason,
      area,
      position,
      requestedQuantity,
      requiredDate,
    } = body;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY no está configurada." },
        { status: 500 }
      );
    }

    if (!to) {
      return NextResponse.json(
        { error: "No se recibió correo del solicitante." },
        { status: 400 }
      );
    }

    const { error } = await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: [to],
      subject: `Solicitud de personal aprobada ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="color: #07076b;">Solicitud de personal aprobada</h2>

          <p>Hola ${requesterName},</p>

          <p>
            Talento Humano ha aprobado la necesidad de personal registrada
            en el Sistema CLAP y procederá con la gestión correspondiente.
          </p>

          <h3>Información de la solicitud</h3>

          <ul>
            <li><strong>Consecutivo:</strong> ${requestNumber}</li>
            <li><strong>Motivo:</strong> ${requestReason || "No definido"}</li>
            <li><strong>Área requerida:</strong> ${area}</li>
            <li><strong>Cargo requerido:</strong> ${position}</li>
            <li><strong>Cantidad:</strong> ${requestedQuantity || 1}</li>
            <li><strong>Fecha requerida:</strong> ${requiredDate || "No definida"}</li>
          </ul>

          <p>
            La aprobación de esta solicitud confirma la necesidad de personal.
            Talento Humano continuará con el proceso de gestión correspondiente.
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error enviando correo de aprobación de personal.",
      },
      { status: 500 }
    );
  }
}