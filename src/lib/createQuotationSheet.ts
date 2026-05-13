import { drive, sheets } from "./google";

type QuotationSheetItem = {
  product: string;
  color: string;
  unitPrice: number;
  quantity: number;
  total: number;
};

type CreateQuotationSheetInput = {
  quoteNumber: string;
  customer: {
    category: string;
    name: string;
    nit: string;
    contact: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  commercial: {
    date: string;
    paymentTerms: string;
    deliveryTime: string;
    validity: string;
    taxCondition: string;
  };
  items: QuotationSheetItem[];
  observations?: string;
};

export async function createQuotationSheet(data: CreateQuotationSheetInput) {
  const templateId = process.env.GOOGLE_SHEETS_TEMPLATE_ID;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!templateId || !folderId) {
    throw new Error(
      "Faltan variables GOOGLE_SHEETS_TEMPLATE_ID o GOOGLE_DRIVE_FOLDER_ID"
    );
  }

  const copiedFile = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: `${data.quoteNumber} - ${data.customer.name}`,
      parents: [folderId],
    },
    supportsAllDrives: true,
  });

  const spreadsheetId = copiedFile.data.id;

  if (!spreadsheetId) {
    throw new Error("No se pudo crear el archivo de cotización.");
  }

const productRows = data.items.map((item, index) => [
  index + 1,        // B = #
  item.product,     // C = Producto
  "",               // D
  "",               // E
  "",               // F = Imagen
  item.color,       // G = Color
  item.unitPrice,   // H = Precio
  item.quantity,    // I = Cant.
  item.total,       // J = Total
]);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: "D9", values: [[data.customer.category]] },
        { range: "D10", values: [[data.customer.name]] },
        { range: "D11", values: [[data.customer.nit]] },
        { range: "D12", values: [[data.customer.contact]] },
        { range: "D13", values: [[data.customer.email]] },
        { range: "D14", values: [[data.customer.phone]] },
        { range: "D15", values: [[data.customer.address]] },

        { range: "I9", values: [[data.quoteNumber]] },
        { range: "I10", values: [[data.commercial.date]] },
        { range: "I11", values: [[data.commercial.paymentTerms]] },
        { range: "I12", values: [[data.commercial.deliveryTime]] },
        { range: "I13", values: [[data.commercial.validity]] },
        { range: "I14", values: [[data.commercial.taxCondition]] },
        { range: "I15", values: [[data.customer.city]] },

        { range: "B20:J39", values: productRows },
        { range: "B40", values: [[`Observaciones: ${data.observations ?? ""}`]] },
      ],
    },
  });

  return {
    id: spreadsheetId,
    name: copiedFile.data.name,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}