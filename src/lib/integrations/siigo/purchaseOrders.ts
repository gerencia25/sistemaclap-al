export class SiigoIntegrationNotConfiguredError extends Error {
  constructor() {
    super(
      "La integración API con SIIGO aún no está configurada. La solicitud permanece intacta en CLAP.",
    );

    this.name =
      "SiigoIntegrationNotConfiguredError";
  }
}

export type SiigoPurchaseOrderEmissionResult = {
  siigo_document_id: string;
  siigo_order_number: string;

  raw_response?: unknown;
};

export async function emitPurchaseOrderToSiigo(
  _purchaseOrderId: string,
): Promise<SiigoPurchaseOrderEmissionResult> {
  /*
   * ========================================================
   * PUNTO ÚNICO DE INTEGRACIÓN SIIGO
   * ========================================================
   *
   * Aquí implementaremos:
   *
   * 1. Autenticación oficial con SIIGO.
   * 2. Buscar proveedor por NIT.
   * 3. Crearlo/actualizarlo si hace falta.
   * 4. Buscar productos por código.
   * 5. Crearlos/actualizarlos si hace falta.
   * 6. Crear la orden de compra.
   * 7. Retornar:
   *      - ID documento SIIGO
   *      - Número oficial de OC SIIGO
   *
   * No se deben inventar IDs ni marcar registros
   * como sincronizados antes de recibir respuesta real.
   */

  throw new SiigoIntegrationNotConfiguredError();
}
