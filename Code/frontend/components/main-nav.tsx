"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/scraper", label: "1. Scraper" },
  { href: "/eda", label: "2. EDA" },
  { href: "/baseline", label: "3. Baseline" },
  { href: "/transformer", label: "4. Transformer" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 text-sm">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={[
              "rounded-md px-3 py-1 transition-colors",
              isActive
                ? "bg-slate-800 text-slate-50"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
            ].join(" ")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}