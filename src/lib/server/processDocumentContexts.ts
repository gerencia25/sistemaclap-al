export type ProcessDocumentContext = {
  key: string;
  moduleCode: string;
  moduleName: string;
  processCode: string;
  processName: string;
  permissions: {
    view: string;
    create: string;
    edit: string;
    delete: string;
  };
};

const PROCESS_DOCUMENT_CONTEXTS: Record<
  string,
  ProcessDocumentContext
> = {
  "sc-general": {
    key: "sc-general",
    moduleCode: "SISTEMA_GESTION_CALIDAD",
    moduleName: "Sistema de Gestión de la Calidad",
    processCode: "GENERAL",
    processName: "Sistema de Gestión de la Calidad",
    permissions: {
      view: "SC_DOCS_VIEW",
      create: "SC_DOCS_CREATE",
      edit: "SC_DOCS_EDIT",
      delete: "SC_DOCS_DELETE",
    },
  },

  "sc-codificacion": {
    key: "sc-codificacion",
    moduleCode: "SISTEMA_GESTION_CALIDAD",
    moduleName: "Sistema de Gestión de la Calidad",
    processCode: "CODIFICACION",
    processName: "Codificación",
    permissions: {
      view: "CODIFICACION_DOCS_VIEW",
      create: "CODIFICACION_DOCS_CREATE",
      edit: "CODIFICACION_DOCS_EDIT",
      delete: "CODIFICACION_DOCS_DELETE",
    },
  },
};

export function getProcessDocumentContext(
  key: string,
): ProcessDocumentContext | null {
  return PROCESS_DOCUMENT_CONTEXTS[key] ?? null;
}
