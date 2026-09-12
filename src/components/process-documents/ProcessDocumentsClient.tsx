"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type ProcessDocument = {
  id: string;
  document_code: string;
  document_name: string;
  document_type: string;
  version: string;
  document_date: string | null;
  status: string;
  file_name: string | null;
  access_url: string;
};

type ProcessDocumentsClientProps = {
  contextKey: string;
  title: string;
  description: string;
  createPermission: string;
  editPermission: string;
  deletePermission: string;
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

export default function ProcessDocumentsClient({
  contextKey,
  title,
  description,
  createPermission,
  editPermission,
  deletePermission,
}: ProcessDocumentsClientProps) {
  const { session, hasPermission } = useAuth();

  const canCreate = hasPermission(createPermission);
  const canEdit = hasPermission(editPermission);
  const canDelete = hasPermission(deletePermission);

  const [documents, setDocuments] = useState<ProcessDocument[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] =
    useState<"create" | "edit">("create");
  const [editingDocument, setEditingDocument] =
    useState<ProcessDocument | null>(null);

  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);

  async function loadDocuments() {
    if (!session?.access_token) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/process-documents?context=${encodeURIComponent(contextKey)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "No se pudieron consultar los documentos.",
        );
      }

      setDocuments(payload?.documents ?? []);
    } catch (error) {
      setDocuments([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron consultar los documentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!session?.access_token) return;

    void loadDocuments();
  }, [contextKey, session?.access_token]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();

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

  function updateForm(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetModal() {
    setForm(initialForm);
    setFile(null);
    setEditingDocument(null);
    setModalMode("create");
  }

  function openCreateModal() {
    if (!canCreate) return;

    resetModal();
    setModalMode("create");
    setIsModalOpen(true);
  }

  function openEditModal(document: ProcessDocument) {
    if (!canEdit) return;

    setEditingDocument(document);
    setModalMode("edit");
    setFile(null);

    setForm({
      document_code: document.document_code ?? "",
      document_name: document.document_name ?? "",
      document_type:
        document.document_type ?? "Caracterización",
      version: document.version ?? "V1",
      document_date: document.document_date ?? "",
      status: document.status ?? "Vigente",
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    resetModal();
    setIsModalOpen(false);
  }

  async function handleSaveDocument() {
    if (!session?.access_token) {
      alert("No se encontró una sesión activa.");
      return;
    }

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

    if (modalMode === "edit" && !editingDocument) {
      alert("No se encontró el documento a editar.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();

      formData.append("context", contextKey);

      if (editingDocument) {
        formData.append("id", editingDocument.id);
      }

      formData.append(
        "document_code",
        form.document_code.trim(),
      );

      formData.append(
        "document_name",
        form.document_name.trim(),
      );

      formData.append(
        "document_type",
        form.document_type,
      );

      formData.append(
        "version",
        form.version.trim(),
      );

      formData.append(
        "document_date",
        form.document_date,
      );

      formData.append(
        "status",
        form.status,
      );

      if (file) {
        formData.append("file", file);
      }

      const response = await fetch(
        "/api/process-documents",
        {
          method:
            modalMode === "create"
              ? "POST"
              : "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "No se pudo guardar el documento.",
        );
      }

      alert(
        modalMode === "create"
          ? "Documento guardado correctamente."
          : "Documento actualizado correctamente.",
      );

      closeModal();
      await loadDocuments();
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

  async function handleDeleteDocument(
    document: ProcessDocument,
  ) {
    if (!canDelete || !session?.access_token) {
      return;
    }

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el documento "${document.document_name}"?\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/process-documents",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context: contextKey,
            id: document.id,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "No se pudo eliminar el documento.",
        );
      }

      alert("Documento eliminado correctamente.");

      await loadDocuments();
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

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#07076b]">
            {title}
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
            {description}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-2xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
          >
            + Subir documento
          </button>
        )}
      </section>

      {errorMessage ? (
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-800">
            No fue posible consultar los documentos.
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-700">
            {errorMessage}
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
                Consulta las versiones documentales registradas en CLAP.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
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
                      className="px-4 py-8 text-center text-slate-500"
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
                        {formatDate(
                          document.document_date,
                        )}
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
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={document.access_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                          >
                            Ver
                          </a>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(document)
                              }
                              className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                            >
                              Editar
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteDocument(
                                  document,
                                )
                              }
                              disabled={isSaving}
                              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!isLoading &&
                  filteredDocuments.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No hay documentos registrados para este proceso.
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
                    ? "Registra un documento oficial en CLAP."
                    : "Actualiza la información del documento. Selecciona otro PDF solamente si deseas reemplazar el archivo actual."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-full px-3 py-1 text-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Código documento *">
                <input
                  value={form.document_code}
                  onChange={(event) =>
                    updateForm(
                      "document_code",
                      event.target.value,
                    )
                  }
                  placeholder="Ej: SC-CP-001"
                  className={inputClassName}
                />
              </Field>

              <Field label="Nombre documento *">
                <input
                  value={form.document_name}
                  onChange={(event) =>
                    updateForm(
                      "document_name",
                      event.target.value,
                    )
                  }
                  placeholder="Ej: Caracterización del proceso"
                  className={inputClassName}
                />
              </Field>

              <Field label="Tipo documento *">
                <select
                  value={form.document_type}
                  onChange={(event) =>
                    updateForm(
                      "document_type",
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="Caracterización">
                    Caracterización
                  </option>
                  <option value="Procedimiento">
                    Procedimiento
                  </option>
                  <option value="Instructivo">
                    Instructivo
                  </option>
                  <option value="Manual">
                    Manual
                  </option>
                  <option value="Otro">
                    Otro
                  </option>
                </select>
              </Field>

              <Field label="Versión *">
                <input
                  value={form.version}
                  onChange={(event) =>
                    updateForm(
                      "version",
                      event.target.value,
                    )
                  }
                  placeholder="Ej: V1"
                  className={inputClassName}
                />
              </Field>

              <Field label="Fecha documento">
                <input
                  type="date"
                  value={form.document_date}
                  onChange={(event) =>
                    updateForm(
                      "document_date",
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </Field>

              <Field label="Estado">
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm(
                      "status",
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="Vigente">
                    Vigente
                  </option>
                  <option value="Obsoleto">
                    Obsoleto
                  </option>
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
                    accept="application/pdf,.pdf"
                    onChange={(event) =>
                      setFile(
                        event.target.files?.[0] ??
                          null,
                      )
                    }
                    className="block w-full rounded-xl border border-slate-300 p-3 text-sm"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Solo PDF. Tamaño máximo: 10 MB.
                  </p>

                  {modalMode === "edit" &&
                    editingDocument?.file_name &&
                    !file && (
                      <p className="mt-1 text-xs text-slate-500">
                        Archivo actual:{" "}
                        {editingDocument.file_name}
                      </p>
                    )}

                  {file && (
                    <p className="mt-1 text-xs font-medium text-[#07076b]">
                      Archivo seleccionado: {file.name}
                    </p>
                  )}
                </Field>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Guardando..."
                  : modalMode === "create"
                    ? "Guardar documento"
                    : "Guardar cambios"}
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
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}
