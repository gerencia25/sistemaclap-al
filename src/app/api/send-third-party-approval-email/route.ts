import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const requestNumber = body.requestNumber || "N/A";
    const requesterEmail = body.requesterEmail;
    const requesterName = body.requesterName || "No informado";
    const category = body.category || "No informada";

    if (!requesterEmail) {
      return Response.json({ success: false }, { status: 400 });
    }

    await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: [requesterEmail],
      subject: `Solicitud de tercero aprobada ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Solicitud de tercero aprobada</h2>

          <p>Hola ${requesterName},</p>

          <p>Tu solicitud de tercero fue aprobada.</p>

          <p><strong>Consecutivo:</strong> ${requestNumber}</p>
          <p><strong>Categoría:</strong> ${category}</p>

          <br />

          <p>El área encargada continuará con la creación del tercero en el Sistema CLAP.</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false }, { status: 500 });
  }
}