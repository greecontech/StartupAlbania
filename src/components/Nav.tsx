"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number; group?: string };

export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  let lastGroup: string | undefined;
  return (
    <nav className="nav" aria-label="Main navigation">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const header = item.group && item.group !== lastGroup ? item.group : null;
        lastGroup = item.group;
        return (
          <div key={item.href} style={{ display: "contents" }}>
            {header && <div className="nav-group">{header}</div>}
            <Link href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
              {item.label}
              {item.count ? <span className="count">{item.count}</span> : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
