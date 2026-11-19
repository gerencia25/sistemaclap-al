export type ProductNameSegment = {
  fieldKey: string;
  value: string;
};

export type ProductNameFormatOptions = {
  separatorBeforeCapacity?: boolean;
};

function normalizeSegment(
  fieldKey: string,
  value: string,
): string {
  let text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (fieldKey === "boca") {
    text = text.replace(
      /\bB(?:OCA)?\s*\.?\s*(?=\d)/gi,
      "B. ",
    );
  }

  text = text
    .replace(/(\d)\s*mm\b/gi, "$1mm")
    .replace(/(\d)\s*ml\b/gi, "$1 mL")
    .replace(/\s*\*\s*/g, " * ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

export function formatProductName(
  segments: ProductNameSegment[],
  options: ProductNameFormatOptions = {},
): string {
  const parts: string[] = [];

  for (const segment of segments) {
    const value = normalizeSegment(
      segment.fieldKey,
      segment.value,
    );

    if (!value) continue;

    if (
      segment.fieldKey === "capacidad" &&
      options.separatorBeforeCapacity &&
      parts.length > 0 &&
      !parts[parts.length - 1].endsWith("*") &&
      !value.startsWith("*")
    ) {
      parts.push("*");
    }

    parts.push(value);
  }

  return parts
    .join(" ")
    .replace(/\s*\*\s*/g, " * ")
    .replace(/\s+/g, " ")
    .trim();
}

export function shouldSeparateCapacity(
  classificationCode: string,
): boolean {
  return new Set([
    "PTF-AL-EN",
    "PTF-FM-EN",
    "PTC-FM-EN",
    "PTF-AL-CJ",
    "PTF-ES-EN",
    "PTF-FM-CJ",
    "PTF-FM-JG",
  ]).has(classificationCode);
}


export function matchesCodificationOption(
  fieldKey: string,
  optionName: string,
  rawValue: string,
): boolean {
  const current = optionName.trim().toUpperCase();
  const selected = rawValue.trim().toUpperCase();

  if (current === selected) return true;

  if (fieldKey === "boca") {
    const normalizeBoca = (text: string) =>
      text.replace(/(\d)\s*mm\b/gi, "$1mm");

    return normalizeBoca(current) ===
      normalizeBoca(selected);
  }

  // Compatibilidad de capacidades históricas numéricas.
  // Solo las asociamos con opciones expresadas en mL.
  if (
    fieldKey === "capacidad" &&
    /^\d+$/.test(selected)
  ) {
    return current === `${selected} ML`;
  }

  return false;
}


const STRICT_CAPACITY_CLASSIFICATIONS = new Set([
  "PTF-FM-EN",
  "PTF-AL-EN",
  "PTC-FM-EN",
  "PTF-AL-CJ",
  "PTF-ES-EN",
  "PTF-FM-CJ",
  "PTF-FM-JG",
]);

export function normalizeCodificationOptionName(
  fieldKey: string,
  rawValue: string,
  classificationCode?: string,
): string | null {
  const value = String(rawValue ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (fieldKey === "boca") {
    return value
      .replace(/\bB(?:OCA)?\s*\.?\s*(?=\d)/gi, "B. ")
      .replace(/(\d)\s*mm\b/gi, "$1mm");
  }

  if (
    fieldKey === "capacidad" &&
    STRICT_CAPACITY_CLASSIFICATIONS.has(
      classificationCode ?? "",
    )
  ) {
    const match = value.match(
      /^(\d+(?:[.,]\d+)?)\s*(ml|gr|g|oz)$/i
    );

    if (!match) {
      return null;
    }

    const unit = match[2].toLowerCase() === "ml"
      ? "mL"
      : match[2].toLowerCase();

    return `${match[1]} ${unit}`;
  }

  return value;
}
