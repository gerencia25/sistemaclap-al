"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createClassificationOption } from "@/lib/itemClassificationEngine";

const productTypes = ["Simple", "Compuesto", "Servicio", "Materia prima"];
const supplyTypes = ["Fabricado", "Comprado", "Mixto", "Servicio"];
const productionProcesses = [
  "Inyección",
  "Soplado",
  "Extrusión",
  "Comprado",
  "Servicio",
  "No aplica",
];

type ItemCategory = { id: string; code: string; name: string };
type ItemGroup = {
  id: string;
  category_id: string;
  code: string;
  name: string;
};
type ItemSubgroup = {
  id: string;
  group_id: string;
  code: string;
  name: string;
};

type ClassificationTemplate = {
  id: string;
  category_code: string;
  group_code: string;
  subgroup_code: string;
  full_code: string;
  name: string | null;
  code_pattern: string | null;
  name_pattern: string | null;
  numeric_code_length: number;
  status: string;
};

type ClassificationTemplateField = {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  required: boolean;
  display_order: number;
  code_length: number;
  contributes_to_code: boolean;
  contributes_to_name: boolean;
  allow_new_options: boolean;
  status: string;
};

type ClassificationOption = {
  id: string;
  template_id: string;
  field_key: string;
  code: string;
  name: string;
  status: string;
};

type Product = {
  id: string;
  reference: string;
  name: string;
  category: string | null;
  item_type: string | null;
  category_id: string | null;
  group_id: string | null;
  subgroup_id: string | null;
  classification_code: string | null;
  product_type: string;
  supply_type: string;
  production_process: string | null;
  color: string | null;
  unit: string;
  material: string | null;
  mouth_size: string | null;
  capacity_ml: number | null;
  width_cm: number | null;
  length_m: number | null;
  finish: string | null;
  technical_description: string | null;
  suggested_price: number;
  image_url: string | null;
  status: "Activo" | "Inactivo";
  can_be_sold: boolean;
  can_be_purchased: boolean;
  can_be_manufactured: boolean;
  tracks_inventory: boolean;
  tracks_lots: boolean;
  tracks_serials: boolean;
  requires_formula: boolean;
  requires_components: boolean;
  requires_route: boolean;
  requires_maintenance: boolean;
  depreciable: boolean;
  dynamic_code_data: Record<string, string> | null;
  dynamic_name: string | null;
  generated_reference: string | null;
  final_code: string | null;
  technical_sheet_url?: string | null;
  technical_sheet_filename?: string | null;
};

const emptyProduct: Omit<Product, "id"> = {
  reference: "",
  name: "",
  category: null,
  item_type: null,
  category_id: null,
  group_id: null,
  subgroup_id: null,
  classification_code: null,
  product_type: "Simple",
  supply_type: "Fabricado",
  production_process: "Inyección",
  color: "",
  unit: "Unidad",
  material: "",
  mouth_size: "",
  capacity_ml: null,
  width_cm: null,
  length_m: null,
  finish: "",
  technical_description: "",
  suggested_price: 0,
  image_url: "",
  status: "Activo",
  can_be_sold: true,
  can_be_purchased: false,
  can_be_manufactured: false,
  tracks_inventory: true,
  tracks_lots: false,
  tracks_serials: false,
  requires_formula: false,
  requires_components: false,
  requires_route: false,
  requires_maintenance: false,
  depreciable: false,
  dynamic_code_data: {},
  dynamic_name: null,
  generated_reference: null,
  final_code: null,
  technical_sheet_url: null,
  technical_sheet_filename: null,
};

function normalizeText(value: string) {
  return value.trim().toUpperCase();
}

function padCode(value: string | number, length: number) {
  return String(value).padStart(length, "0").slice(-length);
}

function formatValueForName(field: ClassificationTemplateField, value: string) {
  const cleanValue = normalizeText(value);

  if (field.field_label.toLowerCase().includes("kg")) {
    const numberValue = Number(String(value).replace(/\D/g, ""));
    return numberValue ? `${numberValue} KG` : cleanValue;
  }

  if (field.field_label.toLowerCase().includes("g]")) {
    const numberValue = Number(String(value).replace(/\D/g, ""));
    return numberValue ? `${numberValue}G` : cleanValue;
  }

  return cleanValue;
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [subgroups, setSubgroups] = useState<ItemSubgroup[]>([]);
  const [templates, setTemplates] = useState<ClassificationTemplate[]>([]);
  const [templateFields, setTemplateFields] = useState<
    ClassificationTemplateField[]
  >([]);
  const [classificationOptions, setClassificationOptions] = useState<
    ClassificationOption[]
  >([]);
  const [technicalSheetFile, setTechnicalSheetFile] = useState<File | null>(
    null,
  );
  const [dynamicData, setDynamicData] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const isEditing = editingProductId !== null;
  const inputClassName =
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#07076b] focus:ring-2 focus:ring-[#07076b]/10 disabled:bg-gray-50 disabled:text-gray-400";

const selectedCategory = categories.find(
  (category) => category.id === newProduct.category_id
);

const selectedGroup = groups.find(
  (group) => group.id === newProduct.group_id
);

const availableGroupCodes = Array.from(
  new Set(
    templates
      .filter((template) => template.category_code === selectedCategory?.code)
      .map((template) => template.group_code)
  )
);

const filteredGroups = groups.filter(
  (group) =>
    group.category_id === newProduct.category_id &&
    availableGroupCodes.includes(group.code)
);

const availableSubgroupCodes = Array.from(
  new Set(
    templates
      .filter(
        (template) =>
          template.category_code === selectedCategory?.code &&
          template.group_code === selectedGroup?.code
      )
      .map((template) => template.subgroup_code)
  )
);

const filteredSubgroups = subgroups.filter(
  (subgroup) =>
    subgroup.group_id === newProduct.group_id &&
    availableSubgroupCodes.includes(subgroup.code)
);

  const selectedSubgroup = subgroups.find(
    (subgroup) => subgroup.id === newProduct.subgroup_id,
  );

  const selectedTemplate = templates.find(
    (template) =>
      template.category_code === selectedCategory?.code &&
      template.group_code === selectedGroup?.code &&
      template.subgroup_code === selectedSubgroup?.code,
  );

  const selectedTemplateFields = templateFields
    .filter((field) => field.template_id === selectedTemplate?.id)
    .sort((a, b) => a.display_order - b.display_order);

  const generatedPreview = useMemo(() => {
    if (!newProduct.classification_code || !selectedTemplate) {
      return {
        reference: "",
        name: "",
        numericBlock: "",
        isValidLength: false,
      };
    }

    const numericParts: string[] = [];
    const nameParts: string[] = [];

    selectedTemplateFields.forEach((field) => {
      const rawValue = dynamicData[field.field_key] ?? "";
      if (!rawValue) return;

      const selectedOption = classificationOptions.find(
        (option) =>
          option.template_id === selectedTemplate.id &&
          option.field_key === field.field_key &&
          option.name === rawValue,
      );

      if (field.contributes_to_code) {
        if (selectedOption) {
          numericParts.push(padCode(selectedOption.code, field.code_length));
        } else if (field.field_type === "number") {
          const numericValue = Number(String(rawValue).replace(/\D/g, ""));
          if (numericValue)
            numericParts.push(padCode(numericValue, field.code_length));
        }
      }

      if (field.contributes_to_name) {
        nameParts.push(
          selectedOption?.name ?? formatValueForName(field, rawValue),
        );
      }
    });

    const numericBlock = numericParts.join("");
    const reference = numericBlock
      ? `${newProduct.classification_code}-${numericBlock}`
      : "";
    const name = nameParts.join(" ").replace(/\s+/g, " ").trim();

    return {
      reference,
      name,
      numericBlock,
      isValidLength:
        numericBlock.length === selectedTemplate.numeric_code_length,
    };
  }, [
    classificationOptions,
    dynamicData,
    newProduct.classification_code,
    selectedTemplate,
    selectedTemplateFields,
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedCategory || !selectedGroup || !selectedSubgroup) return;

    const nextClassificationCode = `${selectedCategory.code}-${selectedGroup.code}-${selectedSubgroup.code}`;

    setNewProduct((current) => {
      if (
        current.classification_code === nextClassificationCode &&
        current.category === selectedCategory.name &&
        current.item_type === selectedCategory.name
      ) {
        return current;
      }

      return {
        ...current,
        classification_code: nextClassificationCode,
        category: selectedCategory.name,
        item_type: selectedCategory.name,
      };
    });
  }, [selectedCategory, selectedGroup, selectedSubgroup]);

  useEffect(() => {
    setNewProduct((current) => {
      if (
        current.name === generatedPreview.name &&
        current.reference === generatedPreview.reference &&
        current.dynamic_name === (generatedPreview.name || null) &&
        current.generated_reference === (generatedPreview.reference || null) &&
        current.final_code === (generatedPreview.reference || null) &&
        JSON.stringify(current.dynamic_code_data ?? {}) ===
          JSON.stringify(dynamicData)
      ) {
        return current;
      }

      return {
        ...current,
        name: generatedPreview.name,
        reference: generatedPreview.reference,
        dynamic_name: generatedPreview.name || null,
        generated_reference: generatedPreview.reference || null,
        final_code: generatedPreview.reference || null,
        dynamic_code_data: dynamicData,
      };
    });
  }, [dynamicData, generatedPreview.name, generatedPreview.reference]);

  async function fetchInitialData() {
    setIsLoading(true);
const { data: templateCategoriesData, error: templateCategoriesError } =
  await supabase
    .from("item_classification_templates")
    .select("category_code")
    .eq("status", "Activo");

if (templateCategoriesError) {
  throw templateCategoriesError;
}

const uniqueCategoryCodes = Array.from(
  new Set(
    (templateCategoriesData || []).map(
      (item) => item.category_code
    )
  )
);
    const [
      { data: productsData, error: productsError },
      { data: categoriesData },
      { data: groupsData },
      { data: subgroupsData },
      { data: templatesData },
      { data: templateFieldsData },
      { data: optionsData },
      
    ] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
  .from("item_categories")
  .select("id, code, name")
  .in("code", uniqueCategoryCodes)
  .eq("status", "Activo")
  .order("code"),
      supabase
        .from("item_groups")
        .select("id, category_id, code, name")
        .eq("status", "Activo")
        .order("code"),
      supabase
        .from("item_subgroups")
        .select("id, group_id, code, name")
        .eq("status", "Activo")
        .order("code"),
      supabase
        .from("item_classification_templates")
        .select("*")
        .eq("status", "Activo"),
      supabase
        .from("item_classification_template_fields")
        .select("*")
        .eq("status", "Activo")
        .order("display_order"),
      supabase
        .from("item_classification_field_options")
        .select("*")
        .eq("status", "Activo")
        .order("code"),
    ]);

    if (productsError) {
      alert(`Error cargando items: ${productsError.message}`);
      setIsLoading(false);
      return;
    }

    setProducts((productsData ?? []) as Product[]);
    setCategories((categoriesData ?? []) as ItemCategory[]);
    setGroups((groupsData ?? []) as ItemGroup[]);
    setSubgroups((subgroupsData ?? []) as ItemSubgroup[]);
    setTemplates((templatesData ?? []) as ClassificationTemplate[]);
    setTemplateFields(
      (templateFieldsData ?? []) as ClassificationTemplateField[],
    );
    setClassificationOptions((optionsData ?? []) as ClassificationOption[]);
    setIsLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;

    return products.filter((product) =>
      [
        product.reference,
        product.name,
        product.final_code ?? "",
        product.classification_code ?? "",
        product.category ?? "",
        product.item_type ?? "",
        product.product_type,
        product.supply_type,
        product.production_process ?? "",
        product.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [products, search]);

  const updateNewProduct = (
    field: keyof Omit<Product, "id">,
    value: string | number | boolean | Record<string, string> | null,
  ) => {
    setNewProduct((current) => ({ ...current, [field]: value }));
  };

  function handleDynamicFieldChange(fieldKey: string, value: string) {
    setDynamicData((current) => ({ ...current, [fieldKey]: value }));
  }

  function getOptionsForField(field: ClassificationTemplateField) {
    if (!selectedTemplate) return [];
    return classificationOptions.filter(
      (option) =>
        option.template_id === selectedTemplate.id &&
        option.field_key === field.field_key,
    );
  }

  async function handleCreateDynamicOption(field: ClassificationTemplateField) {
    if (!selectedTemplate) return;

    const name = window.prompt(`Nuevo valor para ${field.field_label}`);
    if (!name?.trim()) return;

    try {
      const option = await createClassificationOption({
        templateId: selectedTemplate.id,
        fieldKey: field.field_key,
        name,
        codeLength: field.code_length,
      });

      setClassificationOptions((current) => {
        const exists = current.some((item) => item.id === option.id);
        return exists ? current : [...current, option as ClassificationOption];
      });

      handleDynamicFieldChange(field.field_key, option.name);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "No se pudo crear la opción.",
      );
    }
  }

  function handleCategoryChange(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    setDynamicData({});
    setNewProduct((current) => ({
      ...current,
      category_id: categoryId || null,
      group_id: null,
      subgroup_id: null,
      classification_code: null,
      category: category?.name ?? null,
      item_type: category?.name ?? null,
      reference: "",
      name: "",
      dynamic_name: null,
      generated_reference: null,
      final_code: null,
      dynamic_code_data: {},
    }));
  }

  function handleGroupChange(groupId: string) {
    setDynamicData({});
    setNewProduct((current) => ({
      ...current,
      group_id: groupId || null,
      subgroup_id: null,
      classification_code: null,
      reference: "",
      name: "",
      dynamic_name: null,
      generated_reference: null,
      final_code: null,
      dynamic_code_data: {},
    }));
  }

  function handleSubgroupChange(subgroupId: string) {
    setDynamicData({});
    setNewProduct((current) => ({
      ...current,
      subgroup_id: subgroupId || null,
      reference: "",
      name: "",
      dynamic_name: null,
      generated_reference: null,
      final_code: null,
      dynamic_code_data: {},
    }));
  }

  function handleEditProduct(product: Product) {
    setEditingProductId(product.id);
    setDynamicData(product.dynamic_code_data ?? {});
    setTechnicalSheetFile(null);
    setNewProduct({
      reference: product.reference,
      name: product.name,
      category: product.category ?? null,
      item_type: product.item_type ?? null,
      category_id: product.category_id ?? null,
      group_id: product.group_id ?? null,
      subgroup_id: product.subgroup_id ?? null,
      classification_code: product.classification_code ?? null,
      product_type: product.product_type ?? "Simple",
      supply_type: product.supply_type ?? "Fabricado",
      production_process: product.production_process ?? "Inyección",
      color: product.color ?? "",
      unit: product.unit ?? "Unidad",
      material: product.material ?? "",
      mouth_size: product.mouth_size ?? "",
      capacity_ml: product.capacity_ml,
      width_cm: product.width_cm,
      length_m: product.length_m,
      finish: product.finish ?? "",
      technical_description: product.technical_description ?? "",
      suggested_price: Number(product.suggested_price || 0),
      image_url: product.image_url ?? "",
      status: product.status ?? "Activo",
      can_be_sold: product.can_be_sold ?? true,
      can_be_purchased: product.can_be_purchased ?? false,
      can_be_manufactured: product.can_be_manufactured ?? false,
      tracks_inventory: product.tracks_inventory ?? true,
      tracks_lots: product.tracks_lots ?? false,
      tracks_serials: product.tracks_serials ?? false,
      requires_formula: product.requires_formula ?? false,
      requires_components: product.requires_components ?? false,
      requires_route: product.requires_route ?? false,
      requires_maintenance: product.requires_maintenance ?? false,
      depreciable: product.depreciable ?? false,
      dynamic_code_data: product.dynamic_code_data ?? {},
      dynamic_name: product.dynamic_name ?? product.name,
      generated_reference: product.generated_reference ?? product.reference,
      final_code: product.final_code ?? product.reference,
      technical_sheet_url: product.technical_sheet_url ?? null,
      technical_sheet_filename: product.technical_sheet_filename ?? null,
    });
    setIsModalOpen(true);
  }

  function validateDynamicFields() {
    if (!selectedTemplate) {
      alert(
        "No existe una plantilla de codificación para esta categoría, grupo y subgrupo.",
      );
      return false;
    }

    for (const field of selectedTemplateFields) {
      if (field.required && !dynamicData[field.field_key]?.trim()) {
        alert(`Debes seleccionar o ingresar: ${field.field_label}.`);
        return false;
      }
    }

    if (!generatedPreview.isValidLength) {
      alert(
        `El bloque numérico debe tener ${selectedTemplate.numeric_code_length} dígitos. Actualmente tiene ${generatedPreview.numericBlock.length}.`,
      );
      return false;
    }

    return true;
  }

  async function uploadTechnicalSheet() {
    if (!technicalSheetFile) {
      return {
        url: newProduct.technical_sheet_url ?? null,
        filename: newProduct.technical_sheet_filename ?? null,
      };
    }

    const extension = technicalSheetFile.name.split(".").pop() ?? "pdf";
    const safeReference = (generatedPreview.reference || "item").replace(
      /[^A-Z0-9-]/gi,
      "_",
    );
    const filePath = `${safeReference}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-technical-sheets")
      .upload(filePath, technicalSheetFile, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage
      .from("product-technical-sheets")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      filename: technicalSheetFile.name,
    };
  }

  async function handleSaveProduct() {
    if (
      !newProduct.category_id ||
      !newProduct.group_id ||
      !newProduct.subgroup_id
    ) {
      alert("Debes seleccionar categoría, grupo y subgrupo.");
      return;
    }

    if (!validateDynamicFields()) return;

    setIsSaving(true);

    try {
      const technicalSheet = await uploadTechnicalSheet();

      const productData = {
        reference: generatedPreview.reference,
        name: generatedPreview.name,
        category: selectedCategory?.name ?? newProduct.category,
        item_type: selectedCategory?.name ?? newProduct.item_type,
        category_id: newProduct.category_id,
        group_id: newProduct.group_id,
        subgroup_id: newProduct.subgroup_id,
        classification_code: newProduct.classification_code,
        product_type: newProduct.product_type,
        supply_type: newProduct.supply_type,
        production_process: newProduct.production_process || null,
        color: newProduct.color || null,
        unit: newProduct.unit,
        material: newProduct.material || null,
        mouth_size: newProduct.mouth_size || null,
        capacity_ml: newProduct.capacity_ml,
        width_cm: newProduct.width_cm,
        length_m: newProduct.length_m,
        finish: newProduct.finish || null,
        technical_description: newProduct.technical_description || null,
        suggested_price: newProduct.suggested_price,
        image_url: newProduct.image_url || null,
        status: newProduct.status,
        can_be_sold: newProduct.can_be_sold,
        can_be_purchased: newProduct.can_be_purchased,
        can_be_manufactured: newProduct.can_be_manufactured,
        tracks_inventory: newProduct.tracks_inventory,
        tracks_lots: newProduct.tracks_lots,
        tracks_serials: newProduct.tracks_serials,
        requires_formula: newProduct.requires_formula,
        requires_components: newProduct.requires_components,
        requires_route: newProduct.requires_route,
        requires_maintenance: newProduct.requires_maintenance,
        depreciable: newProduct.depreciable,
        dynamic_code_data: dynamicData,
        dynamic_name: generatedPreview.name,
        generated_reference: generatedPreview.reference,
        final_code: generatedPreview.reference,
        technical_sheet_url: technicalSheet.url,
        technical_sheet_filename: technicalSheet.filename,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProductId);
        if (error) throw new Error(error.message);
        alert("Item actualizado correctamente.");
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw new Error(error.message);
        alert("Item creado correctamente.");
      }

      await fetchInitialData();
      closeModal();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "No se pudo guardar el item.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProductId(null);
    setDynamicData({});
    setTechnicalSheetFile(null);
    setNewProduct(emptyProduct);
  }

  function getCategoryLabel(product: Product) {
    if (product.final_code) return product.final_code;
    if (product.reference) return product.reference;
    if (product.classification_code) return product.classification_code;
    if (product.category) return product.category;
    return "—";
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
            Configuración · Items
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-[#07076b]">
            Maestro de Items
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
            Administra productos, materias primas, insumos, repuestos, activos,
            servicios y su clasificación industrial según la matriz SIIGO.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
        >
          Nuevo item
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Base de items</h2>
          <input
            type="text"
            placeholder="Buscar item, referencia, clasificación, proceso..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClassName} md:max-w-sm`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Clasificación</th>
                <th className="px-4 py-3">Tipo producto</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Proceso</th>
                <th className="px-4 py-3">Precio sugerido</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ficha técnica</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando items...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredProducts.map((product) => (
                  <tr key={product.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-[#07076b]">
                      {product.reference}
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {getCategoryLabel(product)}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {product.product_type}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {product.supply_type}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {product.production_process || "—"}
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900">
                      $
                      {Number(product.suggested_price || 0).toLocaleString(
                        "es-CO",
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          product.status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {product.technical_sheet_url ? (
                        <a
                          href={product.technical_sheet_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-[#07076b] underline"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="rounded-lg bg-[#07076b]/10 px-3 py-2 text-xs font-medium text-[#07076b] transition hover:bg-[#07076b]/20"
                      >
                        Editar
                      </button>
                      {product.requires_components && (
                        <Link
                          href={`/configuracion/productos/${product.id}/componentes`}
                          className="ml-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                        >
                          Componentes
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron items con ese criterio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Configuración · Items
                </p>
                <h2 className="text-2xl font-bold text-[#07076b]">
                  {isEditing ? "Editar item" : "Nuevo item"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Registra la clasificación, información técnica y
                  comportamiento operativo del item.
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
              <Field label="Categoría *">
                <select
                  value={newProduct.category_id ?? ""}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.code} · {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Grupo *">
                <select
                  value={newProduct.group_id ?? ""}
                  onChange={(event) => handleGroupChange(event.target.value)}
                  className={inputClassName}
                  disabled={!newProduct.category_id}
                >
                  <option value="">Seleccionar grupo</option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.code} · {group.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Subgrupo *">
                <select
                  value={newProduct.subgroup_id ?? ""}
                  onChange={(event) => handleSubgroupChange(event.target.value)}
                  className={inputClassName}
                  disabled={!newProduct.group_id}
                >
                  <option value="">Seleccionar subgrupo</option>
                  {filteredSubgroups.map((subgroup) => (
                    <option key={subgroup.id} value={subgroup.id}>
                      {subgroup.code} · {subgroup.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Código clasificación">
                <input
                  value={newProduct.classification_code ?? ""}
                  readOnly
                  className={`${inputClassName} bg-gray-50 font-semibold text-[#07076b]`}
                  placeholder="Se genera automáticamente"
                />
              </Field>

              <div className="md:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-[#07076b]">
                    Configuración industrial dinámica
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Los campos y listas se cargan desde la matriz de
                    codificación.
                  </p>
                </div>

                {!selectedTemplate && newProduct.subgroup_id && (
                  <div className="rounded-xl bg-white p-4 text-sm text-amber-700">
                    No existe plantilla para esta combinación. Configúrala en
                    Matriz de codificación.
                  </div>
                )}

                {!newProduct.subgroup_id && (
                  <div className="rounded-xl bg-white p-4 text-sm text-gray-500">
                    Selecciona categoría, grupo y subgrupo para ver los campos
                    requeridos.
                  </div>
                )}

                {selectedTemplate && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {selectedTemplateFields.map((field) => (
                      <Field
                        key={field.id}
                        label={`${field.field_label}${field.required ? " *" : ""}`}
                      >
                        {field.field_type === "number" ? (
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={dynamicData[field.field_key] ?? ""}
                            onChange={(event) =>
                              handleDynamicFieldChange(
                                field.field_key,
                                event.target.value,
                              )
                            }
                            placeholder={field.field_label}
                            className={inputClassName}
                          />
                        ) : (
                          <div className="space-y-2">
                            <select
                              value={dynamicData[field.field_key] ?? ""}
                              onChange={(event) =>
                                handleDynamicFieldChange(
                                  field.field_key,
                                  event.target.value,
                                )
                              }
                              className={inputClassName}
                            >
                              <option value="">
                                Seleccionar {field.field_label.toLowerCase()}
                              </option>
                              {getOptionsForField(field).map((option) => (
                                <option key={option.id} value={option.name}>
                                  {option.code} · {option.name}
                                </option>
                              ))}
                            </select>

                            {field.allow_new_options && (
                              <button
                                type="button"
                                onClick={() => handleCreateDynamicOption(field)}
                                className="text-sm font-medium text-[#07076b] hover:underline"
                              >
                                + Crear nuevo
                              </button>
                            )}
                          </div>
                        )}
                      </Field>
                    ))}
                  </div>
                )}
              </div>

              <Field label="Referencia automática">
                <input
                  value={newProduct.reference}
                  readOnly
                  className={`${inputClassName} bg-gray-50 font-semibold text-[#07076b]`}
                  placeholder="Se genera automáticamente"
                />
                {selectedTemplate &&
                  generatedPreview.numericBlock &&
                  !generatedPreview.isValidLength && (
                    <p className="mt-2 text-xs text-amber-600">
                      Bloque numérico: {generatedPreview.numericBlock.length}/
                      {selectedTemplate.numeric_code_length} dígitos.
                    </p>
                  )}
              </Field>

              <Field label="Nombre automático del item">
                <input
                  value={newProduct.name}
                  readOnly
                  className={`${inputClassName} bg-gray-50 font-semibold text-[#07076b]`}
                  placeholder="Se genera automáticamente"
                />
              </Field>

              <Field label="Tipo de producto">
                <select
                  value={newProduct.product_type}
                  onChange={(event) =>
                    updateNewProduct("product_type", event.target.value)
                  }
                  className={inputClassName}
                >
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Origen / abastecimiento">
                <select
                  value={newProduct.supply_type}
                  onChange={(event) =>
                    updateNewProduct("supply_type", event.target.value)
                  }
                  className={inputClassName}
                >
                  {supplyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Proceso">
                <select
                  value={newProduct.production_process ?? ""}
                  onChange={(event) =>
                    updateNewProduct("production_process", event.target.value)
                  }
                  className={inputClassName}
                >
                  {productionProcesses.map((process) => (
                    <option key={process} value={process}>
                      {process}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Estado">
                <select
                  value={newProduct.status}
                  onChange={(event) =>
                    updateNewProduct(
                      "status",
                      event.target.value as Product["status"],
                    )
                  }
                  className={inputClassName}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </Field>

              <Field label="Unidad">
                <input
                  value={newProduct.unit}
                  onChange={(event) =>
                    updateNewProduct("unit", event.target.value)
                  }
                  placeholder="Ej: Unidad, KG, metro"
                  className={inputClassName}
                />
              </Field>

              <Field label="Precio sugerido">
                <input
                  type="number"
                  value={newProduct.suggested_price}
                  onChange={(event) =>
                    updateNewProduct(
                      "suggested_price",
                      Number(event.target.value),
                    )
                  }
                  placeholder="0"
                  className={inputClassName}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Ficha técnica PDF (Opcional)">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      setTechnicalSheetFile(event.target.files?.[0] ?? null)
                    }
                    className={inputClassName}
                  />
                  {technicalSheetFile && (
                    <p className="mt-2 text-xs text-gray-500">
                      Archivo seleccionado: {technicalSheetFile.name}
                    </p>
                  )}
                  {!technicalSheetFile && newProduct.technical_sheet_url && (
                    <a
                      href={newProduct.technical_sheet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-[#07076b] underline"
                    >
                      Ver ficha actual
                    </a>
                  )}
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Descripción técnica">
                  <textarea
                    rows={3}
                    value={newProduct.technical_description ?? ""}
                    onChange={(event) =>
                      updateNewProduct(
                        "technical_description",
                        event.target.value,
                      )
                    }
                    placeholder="Notas técnicas adicionales del item..."
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-[#07076b]">
                  Comportamiento del item
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Define cómo se comporta este item dentro de inventarios,
                  producción, compras, activos y mantenimiento.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <CheckboxGroup title="Comercial">
                  <CheckboxField
                    label="Se vende"
                    checked={newProduct.can_be_sold}
                    onChange={(value) => updateNewProduct("can_be_sold", value)}
                  />
                  <CheckboxField
                    label="Se compra"
                    checked={newProduct.can_be_purchased}
                    onChange={(value) =>
                      updateNewProduct("can_be_purchased", value)
                    }
                  />
                  <CheckboxField
                    label="Se fabrica"
                    checked={newProduct.can_be_manufactured}
                    onChange={(value) =>
                      updateNewProduct("can_be_manufactured", value)
                    }
                  />
                </CheckboxGroup>

                <CheckboxGroup title="Inventarios">
                  <CheckboxField
                    label="Maneja inventario"
                    checked={newProduct.tracks_inventory}
                    onChange={(value) =>
                      updateNewProduct("tracks_inventory", value)
                    }
                  />
                  <CheckboxField
                    label="Maneja lotes"
                    checked={newProduct.tracks_lots}
                    onChange={(value) => updateNewProduct("tracks_lots", value)}
                  />
                  <CheckboxField
                    label="Maneja seriales"
                    checked={newProduct.tracks_serials}
                    onChange={(value) =>
                      updateNewProduct("tracks_serials", value)
                    }
                  />
                </CheckboxGroup>

                <CheckboxGroup title="Ingeniería">
                  <CheckboxField
                    label="Requiere fórmula"
                    checked={newProduct.requires_formula}
                    onChange={(value) =>
                      updateNewProduct("requires_formula", value)
                    }
                  />
                  <CheckboxField
                    label="Requiere componentes"
                    checked={newProduct.requires_components}
                    onChange={(value) =>
                      updateNewProduct("requires_components", value)
                    }
                  />
                  <CheckboxField
                    label="Requiere ruta"
                    checked={newProduct.requires_route}
                    onChange={(value) =>
                      updateNewProduct("requires_route", value)
                    }
                  />
                </CheckboxGroup>

                <CheckboxGroup title="Activos">
                  <CheckboxField
                    label="Requiere mantenimiento"
                    checked={newProduct.requires_maintenance}
                    onChange={(value) =>
                      updateNewProduct("requires_maintenance", value)
                    }
                  />
                  <CheckboxField
                    label="Depreciable"
                    checked={newProduct.depreciable}
                    onChange={(value) => updateNewProduct("depreciable", value)}
                  />
                </CheckboxGroup>
              </div>
            </div>

            {newProduct.requires_components && (
              <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
                Este item requiere componentes. Después de guardarlo, podrás
                configurar su composición desde el botón Componentes.
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="rounded-xl bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar item"
                    : "Guardar item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckboxGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      {children}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-[#07076b] focus:ring-[#07076b]"
      />
      {label}
    </label>
  );
}
