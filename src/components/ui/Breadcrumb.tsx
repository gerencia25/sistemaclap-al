import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className="transition hover:text-[#07076b]">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-slate-500" : ""}>
                {item.label}
              </span>
            )}

            {!isLast && <span className="text-slate-300">·</span>}
          </div>
        );
      })}
    </nav>
  );
}
