"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10";

export default function CaracterizacionProcedimientoPage() {
  const [documents, setDocuments] = useState<ProcessDocument[]>([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("process_documents")
      .select("*")
      .eq("module_code", "CONFIGURACION")
      .eq("process_code", "PERSONAL")
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
  }

  function closeModal() {
    resetForm();
    setIsModalOpen(false);
  }

  function formatDate(value: string | null) {
    if (!value) return "N/A";

    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  }

  function getStatusClassName(status: string) {
    if (status === "Vigente") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (status === "Obsoleto") {
      return "bg-gray-100 text-gray-600";
    }

    return "bg-amber-50 text-amber-700";
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

    if (!file) {
      alert("Debes seleccionar un archivo PDF.");
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Solo se permiten archivos PDF.");
      return;
    }

    setIsSaving(true);

    try {
      const safeCode = form.document_code.trim().replace(/[^A-Z0-9-]/gi, "_");
      const safeVersion = form.version.trim().replace(/[^A-Z0-9-]/gi, "_");
      const filePath = `CONFIGURACION/PERSONAL/${safeCode}-${safeVersion}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("process-documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from("process-documents")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("process_documents")
        .insert({
          module_code: "CONFIGURACION",
          module_name: "Configuración",
          process_code: "PERSONAL",
          process_name: "Personal",
          document_code: form.document_code.trim(),
          document_name: form.document_name.trim(),
          document_type: form.document_type,
          version: form.version.trim(),
          document_date: form.document_date || null,
          status: form.status,
          file_url: publicUrlData.publicUrl,
          file_name: file.name,
        });

      if (insertError) throw new Error(insertError.message);

      alert("Documento guardado correctamente.");
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

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Personal
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Caracterización y procedimiento
          </h1>

          <p className="mt-3 max-w-4xl text-base leading-7 text-gray-600">
            Repositorio documental oficial del proceso de personal.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          + Subir documento
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Documentos del proceso
          </h2>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar código, documento, tipo, versión..."
            className={`${inputClassName} md:max-w-sm`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
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

            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando documentos...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredDocuments.map((document) => (
                  <tr key={document.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-[#07076b]">
                      {document.document_code}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {document.document_name}
                      </p>

                      {document.file_name && (
                        <p className="mt-1 text-xs text-gray-500">
                          {document.file_name}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {document.document_type}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-700">
                      {document.version}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
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
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                        >
                          Ver
                        </a>

                        <a
                          href={document.file_url}
                          download
                          className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Descargar
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredDocuments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron documentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Documento del proceso
                </p>

                <h2 className="text-2xl font-bold text-[#07076b]">
                  Subir documento
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registra caracterizaciones, procedimientos o documentos
                  oficiales del proceso de personal.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full px-3 py-1 text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
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
                <Field label="Archivo PDF *">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                    className="block w-full rounded-xl border border-gray-300 p-3 text-sm"
                  />

                  {file && (
                    <p className="mt-2 text-xs text-gray-500">
                      Archivo seleccionado: {file.name}
                    </p>
                  )}
                </Field>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveDocument}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar documento"}
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
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}