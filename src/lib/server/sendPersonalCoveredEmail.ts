import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type CoveredEmployee = {
  fullName: string;
  documentType: string;
  documentNumber: string;
  area: string;
  position: string;
  hireDate: string | null;
};

export type SendPersonalCoveredEmailParams = {
  to: string;
  requesterName: string;
  requestNumber: string;
  requestReason: string | null;
  area: string;
  position: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  closureType: "Completo" | "Parcial";
  closureReason?: string | null;
  employees: CoveredEmployee[];
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date: string | null | undefined) {
  if (!date) return "No definida";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return escapeHtml(date);
  }

  return `${Number(day)}/${Number(month)}/${year}`;
}

export async function sendPersonalCoveredEmail(
  params: SendPersonalCoveredEmailParams,
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY no está configurada.",
    );
  }

  const {
    to,
    requesterName,
    requestNumber,
    requestReason,
    area,
    position,
    requestedQuantity,
    fulfilledQuantity,
    closureType,
    closureReason,
    employees,
  } = params;

  if (!to) {
    throw new Error(
      "No se recibió correo del solicitante.",
    );
  }

  if (!requestNumber) {
    throw new Error(
      "No se recibió el número de solicitud.",
    );
  }

  const isPartial = closureType === "Parcial";

  const employeesHtml =
    employees.length > 0
      ? employees
          .map(
            (employee) => `
              <div
                style="
                  margin-bottom: 12px;
                  padding: 14px;
                  border: 1px solid #e5e7eb;
                  border-radius: 10px;
                  background: #f9fafb;
                "
              >
                <div
                  style="
                    font-weight: 700;
                    color: #111827;
                  "
                >
                  ${escapeHtml(employee.fullName)}
                </div>

                <div style="margin-top: 6px;">
                  <strong>Documento:</strong>
                  ${escapeHtml(employee.documentType)}
                  ${escapeHtml(employee.documentNumber)}
                </div>

                <div>
                  <strong>Área:</strong>
                  ${escapeHtml(employee.area)}
                </div>

                <div>
                  <strong>Cargo:</strong>
                  ${escapeHtml(employee.position)}
                </div>

                <div>
                  <strong>Fecha de ingreso:</strong>
                  ${formatDate(employee.hireDate)}
                </div>
              </div>
            `,
          )
          .join("")
      : `
        <p>
          No se recibió información detallada del personal vinculado.
        </p>
      `;

  const closureHtml = isPartial
    ? `
      <div
        style="
          margin-top: 18px;
          padding: 14px;
          border: 1px solid #f59e0b;
          border-radius: 10px;
          background: #fffbeb;
        "
      >
        <strong>Cierre parcial</strong>

        <p style="margin-bottom: 0;">
          La solicitud fue cerrada sin completar la totalidad
          inicialmente requerida.
        </p>

        <p style="margin-bottom: 0;">
          <strong>Motivo:</strong>
          ${escapeHtml(
            closureReason || "No informado",
          )}
        </p>
      </div>
    `
    : `
      <div
        style="
          margin-top: 18px;
          padding: 14px;
          border: 1px solid #10b981;
          border-radius: 10px;
          background: #ecfdf5;
        "
      >
        <strong>
          Cobertura completa
        </strong>

        <p style="margin-bottom: 0;">
          Se completó la cantidad de personal requerida
          para esta solicitud.
        </p>
      </div>
    `;

  const { error } = await resend.emails.send({
    from:
      "Sistema CLAP <notificaciones@mail.almultiformas.com>",

    to: [to],

    subject: isPartial
      ? `Solicitud de personal cerrada parcialmente ${requestNumber}`
      : `Solicitud de personal cubierta ${requestNumber}`,

    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          color: #111827;
          line-height: 1.6;
        "
      >
        <h2 style="color: #07076b;">
          ${
            isPartial
              ? "Solicitud de personal cerrada"
              : "Solicitud de personal cubierta"
          }
        </h2>

        <p>
          Hola ${escapeHtml(requesterName)},
        </p>

        <p>
          Talento Humano informa que la gestión correspondiente
          a la solicitud
          <strong>${escapeHtml(requestNumber)}</strong>
          ha finalizado.
        </p>

        <h3>
          Información de la solicitud
        </h3>

        <ul>
          <li>
            <strong>Consecutivo:</strong>
            ${escapeHtml(requestNumber)}
          </li>

          <li>
            <strong>Motivo:</strong>
            ${escapeHtml(
              requestReason || "No definido",
            )}
          </li>

          <li>
            <strong>Área requerida:</strong>
            ${escapeHtml(area)}
          </li>

          <li>
            <strong>Cargo requerido:</strong>
            ${escapeHtml(position)}
          </li>

          <li>
            <strong>Personas solicitadas:</strong>
            ${requestedQuantity}
          </li>

          <li>
            <strong>Personas vinculadas:</strong>
            ${fulfilledQuantity}
          </li>

          <li>
            <strong>Tipo de cierre:</strong>
            ${isPartial ? "Parcial" : "Completo"}
          </li>
        </ul>

        ${closureHtml}

        <h3 style="margin-top: 24px;">
          Personal vinculado
        </h3>

        ${employeesHtml}

        <p style="margin-top: 24px;">
          La información de las personas vinculadas ya se
          encuentra registrada en el Sistema CLAP.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true,
  };
}