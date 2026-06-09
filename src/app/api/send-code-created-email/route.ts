import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const requestNumber = body.requestNumber;
    const requesterEmail = body.requesterEmail;
    const requesterName = body.requesterName || "Usuario";
    const createdCode = body.createdCode;
    const createdProductName = body.createdProductName || "No informado";

    if (!requestNumber || !requesterEmail || !createdCode) {
      return Response.json({ success: false }, { status: 400 });
    }

    await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: [requesterEmail],
      subject: `Solicitud ${requestNumber} aprobada`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Solicitud de código aprobada</h2>

          <p>Hola ${requesterName},</p>

          <p>
            Su solicitud <strong>${requestNumber}</strong> fue aprobada.
          </p>

          <p><strong>Código generado:</strong></p>

          <div style="
            background:#ecfdf5;
            border:1px solid #bbf7d0;
            padding:12px;
            border-radius:8px;
            margin:12px 0;
            font-weight:bold;
          ">
            ${createdCode}
          </div>
          
          <p><strong>Nombre del item:</strong></p>

<div style="
  background:#f8fafc;
  border:1px solid #e2e8f0;
  padding:12px;
  border-radius:8px;
  margin:12px 0;
">
  ${createdProductName}
</div>

          <p>El código ya se encuentra registrado en el Sistema CLAP.</p>

          <br />

          <p>Sistema CLAP</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);

    return Response.json({ success: false }, { status: 500 });
  }
}