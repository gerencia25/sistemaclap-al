"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import Breadcrumb from "@/components/ui/Breadcrumb";

type ProcessDocument = {
  id: string;
  module_code: string;
  module_name: string;
  process_code: string;
  process_name: string;
  document_code: string;
  document_name: string;
  document_type: string;
  version: string;
  document_date: string | null;
  status: string;
  file_url: string;
  file_name: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

const initialForm = {
  document_code: "",
  document_name: "",
  document_type: "Caracterización",
  version: "V1",
  document_date: "",
  status: "Vigente",
};

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

export default function CaracterizacionProcedimientoPage() {
  const { hasPermission } = useAuth();

  const canViewDocuments = hasPermission("CODIFICACION_DOCS_VIEW");
  const canCreateDocuments = hasPermission("CODIFICACION_DOCS_CREATE");
  const canEditDocuments = hasPermission("CODIFICACION_DOCS_EDIT");
  const canDeleteDocuments = hasPermission("CODIFICACION_DOCS_DELETE");

  const [documents, setDocuments] = useState<ProcessDocument[]>([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDocument, setEditingDocument] =
    useState<ProcessDocument | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("process_documents")
      .select("*")
      .eq("module_code", "CONFIGURACION")
      .eq("process_code", "CODIFICACION")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Error cargando documentos: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setDocuments((data ?? []) as ProcessDocument[]);
    setIsLoading(false);
  }

  const filteredDocuments = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return documents;

    return documents.filter((document) =>
      [
        document.document_code,
        document.document_name,
        document.document_type,
        document.version,
        document.status,
        document.file_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [documents, search]);

  function updateForm(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setFile(null);
    setEditingDocument(null);
    setModalMode("create");
  }

  function openCreateModal() {
    if (!canCreateDocuments) {
      alert("No tienes permiso para subir documentos.");
      return;
    }

    resetForm();
    setModalMode("create");
    setIsModalOpen(true);
  }

  function openEditModal(document: ProcessDocument) {
    if (!canEditDocuments) {
      alert("No tienes permiso para editar documentos.");
      return;
    }

    setEditingDocument(document);
    setModalMode("edit");
    setFile(null);
    setForm({
      document_code: document.document_code ?? "",
      document_name: document.document_name ?? "",
      document_type: document.document_type ?? "Caracterización",
      version: document.version ?? "V1",
      document_date: document.document_date ?? "",
      status: document.status ?? "Vigente",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    resetForm();
    setIsModalOpen(false);
  }

  function formatDate(value: string | null) {
    if (!value) return "N/A";

    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return "N/A";

    return `${Number(day)}/${Number(month)}/${year}`;
  }

  function getStatusClassName(status: string) {
    if (status === "Vigente") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (status === "Obsoleto") {
      return "bg-slate-100 text-slate-600";
    }

    return "bg-amber-50 text-amber-700";
  }

  function getStoragePathFromUrl(fileUrl: string) {
    const marker = "/process-documents/";
    const markerIndex = fileUrl.indexOf(marker);

    if (markerIndex === -1) return null;

    const pathWithPossibleQuery = fileUrl.slice(markerIndex + marker.length);
    const cleanPath = pathWithPossibleQuery.split("?")[0];

    return decodeURIComponent(cleanPath);
  }

  async function removeStorageFile(fileUrl: string) {
    const storagePath = getStoragePathFromUrl(fileUrl);

    if (!storagePath) return;

    const { error } = await supabase.storage
      .from("process-documents")
      .remove([storagePath]);

    if (error) {
      console.warn("No se pudo eliminar el archivo del storage:", error.message);
    }
  }

  async function uploadPdfFile() {
    if (!file) return null;

    if (file.type !== "application/pdf") {
      throw new Error("Solo se permiten archivos PDF.");
    }

    const safeCode = form.document_code.trim().replace(/[^A-Z0-9-]/gi, "_");
    const safeVersion = form.version.trim().replace(/[^A-Z0-9-]/gi, "_");
    const filePath = `CONFIGURACION/CODIFICACION/${safeCode}-${safeVersion}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("process-documents")
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from("process-documents")
      .getPublicUrl(filePath);

    return {
      file_url: publicUrlData.publicUrl,
      file_name: file.name,
    };
  }

  async function handleSaveDocument() {
    if (!form.document_code.trim()) {
      alert("Debes ingresar el código del documento.");
      return;
    }

    if (!form.document_name.trim()) {
      alert("Debes ingresar el nombre del documento.");
      return;
    }

    if (!form.version.trim()) {
      alert("Debes ingresar la versión.");
      return;
    }

    if (modalMode === "create" && !file) {
      alert("Debes seleccionar un archivo PDF.");
      return;
    }

    if (modalMode === "create" && !canCreateDocuments) {
      alert("No tienes permiso para subir documentos.");
      return;
    }

    if (modalMode === "edit" && !canEditDocuments) {
      alert("No tienes permiso para editar documentos.");
      return;
    }

    setIsSaving(true);

    try {
      const uploadedFile = await uploadPdfFile();

      if (modalMode === "create") {
        const { error: insertError } = await supabase
          .from("process_documents")
          .insert({
            module_code: "CONFIGURACION",
            module_name: "Configuración",
            process_code: "CODIFICACION",
            process_name: "Codificación",
            document_code: form.document_code.trim(),
            document_name: form.document_name.trim(),
            document_type: form.document_type,
            version: form.version.trim(),
            document_date: form.document_date || null,
            status: form.status,
            file_url: uploadedFile?.file_url,
            file_name: uploadedFile?.file_name,
          });

        if (insertError) throw new Error(insertError.message);

        alert("Documento guardado correctamente.");
      }

      if (modalMode === "edit") {
        if (!editingDocument) {
          throw new Error("No se encontró el documento a editar.");
        }

        const updatePayload = {
          document_code: form.document_code.trim(),
          document_name: form.document_name.trim(),
          document_type: form.document_type,
          version: form.version.trim(),
          document_date: form.document_date || null,
          status: form.status,
          file_url: uploadedFile?.file_url ?? editingDocument.file_url,
          file_name: uploadedFile?.file_name ?? editingDocument.file_name,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from("process_documents")
          .update(updatePayload)
          .eq("id", editingDocument.id);

        if (updateError) throw new Error(updateError.message);

        if (uploadedFile?.file_url && editingDocument.file_url) {
          await removeStorageFile(editingDocument.file_url);
        }

        alert("Documento actualizado correctamente.");
      }

      closeModal();
      await fetchDocuments();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el documento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDocument(document: ProcessDocument) {
    if (!canDeleteDocuments) {
      alert("No tienes permiso para eliminar documentos.");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Seguro que deseas eliminar el documento "${document.document_name}"?\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmDelete) return;

    setIsSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from("process_documents")
        .delete()
        .eq("id", document.id);

      if (deleteError) throw new Error(deleteError.message);

      if (document.file_url) {
        await removeStorageFile(document.file_url);
      }

      alert("Documento eliminado correctamente.");
      await fetchDocuments();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el documento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const hasAnyAction =
    canViewDocuments || canEditDocuments || canDeleteDocuments;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Breadcrumb
            items={[
              { label: "Configuración", href: "/configuracion" },
              {
                label: "Codificación",
                href: "/configuracion/codificacion",
              },
              { label: "Caracterización y procedimiento" },
            ]}
          />

          <h1 className="text-4xl font-semibold tracking-tight text-[#07076b]">
            Caracterización y procedimiento
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
            Repositorio documental oficial del proceso de codificación.
          </p>
        </div>

        {canCreateDocuments && (
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-2xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
          >
            + Subir documento
          </button>
        )}
      </section>

      {!canViewDocuments ? (
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-800">
            No tienes permiso para consultar los documentos de este proceso.
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-700">
            Solicita acceso al administrador del sistema si necesitas revisar la
            caracterización o el procedimiento de Codificación.
          </p>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Documentos del proceso
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Consulta, descarga y administra las versiones documentales del
                proceso.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar código, documento, tipo, versión..."
              className={`${inputClassName} md:max-w-sm`}
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Versión</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      Cargando documentos...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredDocuments.map((document) => (
                    <tr
                      key={document.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-semibold text-[#07076b]">
                        {document.document_code}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">
                          {document.document_name}
                        </p>

                        {document.file_name && (
                          <p className="mt-1 text-xs text-slate-500">
                            {document.file_name}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {document.document_type}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-700">
                        {document.version}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(document.document_date)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClassName(
                            document.status,
                          )}`}
                        >
                          {document.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {hasAnyAction ? (
                          <div className="flex flex-wrap gap-2">
                            {canViewDocuments && (
                              <>
                                <a
                                  href={document.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-xl bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                                >
                                  Ver
                                </a>

                                <a
                                  href={document.file_url}
                                  download
                                  className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Descargar
                                </a>
                              </>
                            )}

                            {canEditDocuments && (
                              <button
                                type="button"
                                onClick={() => openEditModal(document)}
                                className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                              >
                                Editar
                              </button>
                            )}

                            {canDeleteDocuments && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(document)}
                                disabled={isSaving}
                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sin acciones disponibles
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                {!isLoading && filteredDocuments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No se encontraron documentos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Documento del proceso
                </p>

                <h2 className="text-2xl font-semibold text-[#07076b]">
                  {modalMode === "create"
                    ? "Subir documento"
                    : "Editar documento"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === "create"
                    ? "Registra caracterizaciones, procedimientos o documentos oficiales del proceso de codificación."
                    : "Actualiza la información del documento. El archivo PDF es opcional; solo selecciónalo si deseas reemplazarlo."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full px-3 py-1 text-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Código documento *">
                <input
                  value={form.document_code}
                  onChange={(event) =>
                    updateForm("document_code", event.target.value)
                  }
                  placeholder="Ej: CAR-001"
                  className={inputClassName}
                />
              </Field>

              <Field label="Nombre documento *">
                <input
                  value={form.document_name}
                  onChange={(event) =>
                    updateForm("document_name", event.target.value)
                  }
                  placeholder="Ej: Caracterización Codificación"
                  className={inputClassName}
                />
              </Field>

              <Field label="Tipo documento *">
                <select
                  value={form.document_type}
                  onChange={(event) =>
                    updateForm("document_type", event.target.value)
                  }
                  className={inputClassName}
                >
                  <option value="Caracterización">Caracterización</option>
                  <option value="Procedimiento">Procedimiento</option>
                  <option value="Instructivo">Instructivo</option>
                  <option value="Formato">Formato</option>
                  <option value="Manual">Manual</option>
                  <option value="Otro">Otro</option>
                </select>
              </Field>

              <Field label="Versión *">
                <input
                  value={form.version}
                  onChange={(event) => updateForm("version", event.target.value)}
                  placeholder="Ej: V1"
                  className={inputClassName}
                />
              </Field>

              <Field label="Fecha documento">
                <input
                  type="date"
                  value={form.document_date}
                  onChange={(event) =>
                    updateForm("document_date", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>

              <Field label="Estado">
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className={inputClassName}
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Obsoleto">Obsoleto</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field
                  label={
                    modalMode === "create"
                      ? "Archivo PDF *"
                      : "Archivo PDF nuevo, opcional"
                  }
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                    className="block w-full rounded-xl border border-slate-300 p-3 text-sm"
                  />

                  {file && (
                    <p className="mt-2 text-xs text-slate-500">
                      Archivo seleccionado: {file.name}
                    </p>
                  )}

                  {modalMode === "edit" && editingDocument?.file_name && !file && (
                    <p className="mt-2 text-xs text-slate-500">
                      Archivo actual: {editingDocument.file_name}
                    </p>
                  )}
                </Field>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {isSaving
                  ? "Guardando..."
                  : modalMode === "create"
                    ? "Guardar documento"
                    : "Actualizar documento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}
