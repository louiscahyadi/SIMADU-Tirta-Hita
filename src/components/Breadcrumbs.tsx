import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-600">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center">
              {item.href && !isLast ? (
                <Link className="hover:underline" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "font-medium text-gray-800" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? <span className="mx-2 text-gray-400">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
