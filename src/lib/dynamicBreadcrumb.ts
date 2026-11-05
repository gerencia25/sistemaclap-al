export const DYNAMIC_BREADCRUMB_EVENT =
  "clap:dynamic-breadcrumb-label";

export type DynamicBreadcrumbLabels =
  Record<string, string>;

function normalizePath(
  path: string,
) {
  if (!path || path === "/") {
    return "/";
  }

  return path.endsWith("/")
    ? path.slice(0, -1)
    : path;
}

export function getDynamicBreadcrumbLabels(): DynamicBreadcrumbLabels {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        "clap:dynamic-breadcrumb-labels",
      );

    if (!raw) {
      return {};
    }

    return JSON.parse(
      raw,
    ) as DynamicBreadcrumbLabels;
  } catch {
    return {};
  }
}

export function setDynamicBreadcrumbLabel(
  href: string,
  label: string,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const normalizedHref =
    normalizePath(href);

  const labels =
    getDynamicBreadcrumbLabels();

  const nextLabels = {
    ...labels,
    [normalizedHref]:
      label,
  };

  window.sessionStorage.setItem(
    "clap:dynamic-breadcrumb-labels",
    JSON.stringify(
      nextLabels,
    ),
  );

  window.dispatchEvent(
    new CustomEvent(
      DYNAMIC_BREADCRUMB_EVENT,
      {
        detail: {
          href:
            normalizedHref,
          label,
        },
      },
    ),
  );
}
