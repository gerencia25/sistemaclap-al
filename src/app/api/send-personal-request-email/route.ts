import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      requestNumber,
      requesterName,
      requesterArea,
      requesterPosition,
      requesterEmail,
      employeeFullName,
      documentNumber,
      area,
      position,
      hireDate,
      contractType,
      detailedDescription,
    } = body;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY no está configurada." },
        { status: 500 }
      );
    }

    const { error } = await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: ["administrador@almultiformas.com"],
      subject: `Nueva solicitud creación de personal ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="color: #07076b;">Nueva solicitud creación de personal</h2>

          <p>Se ha registrado una nueva solicitud de creación de personal en el Sistema CLAP.</p>

          <h3>Información de la solicitud</h3>
          <ul>
            <li><strong>Consecutivo:</strong> ${requestNumber}</li>
            <li><strong>Empleado solicitado:</strong> ${employeeFullName}</li>
            <li><strong>Documento:</strong> ${documentNumber}</li>
            <li><strong>Área:</strong> ${area}</li>
            <li><strong>Cargo:</strong> ${position}</li>
            <li><strong>Fecha estimada de ingreso:</strong> ${hireDate || "No definida"}</li>
            <li><strong>Tipo de contrato:</strong> ${contractType || "No definido"}</li>
          </ul>

          <h3>Solicitante</h3>
          <ul>
            <li><strong>Nombre:</strong> ${requesterName}</li>
            <li><strong>Área:</strong> ${requesterArea}</li>
            <li><strong>Cargo:</strong> ${requesterPosition}</li>
            <li><strong>Correo:</strong> ${requesterEmail}</li>
          </ul>

          <h3>Descripción / justificación</h3>
          <p>${detailedDescription || "Sin descripción adicional."}</p>

          <p style="margin-top: 24px;">
            Ingresa al Sistema CLAP para revisar, aprobar o rechazar esta solicitud.
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
            : "Error enviando correo de solicitud de personal.",
      },
      { status: 500 }
    );
  }
}
