import ProcessDocumentsClient from "@/components/process-documents/ProcessDocumentsClient";

export default function CaracterizacionProcedimientoSCPage() {
  return (
    <ProcessDocumentsClient
      contextKey="sc-general"
      title="Caracterización y procedimiento"
      description="Repositorio documental oficial del Sistema de Gestión de la Calidad."
      createPermission="SC_DOCS_CREATE"
      editPermission="SC_DOCS_EDIT"
      deletePermission="SC_DOCS_DELETE"
    />
  );
}
