"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCashier } from "@/lib/store";

const tabs = [
  { href: "/", label: "Kasir", icon: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M2 7h20" />
      <path d="M6 21h12" />
      <path d="M12 17v4" />
    </svg>
  )},
  { href: "/products", label: "Produk", icon: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <circle cx="7" cy="7" r="1" />
    </svg>
  )},
  { href: "/transactions", label: "Riwayat", icon: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )},
  { href: "/settings", label: "Pengaturan", icon: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )},
];

export default function BottomNav() {
  const pathname = usePathname();
  const { role } = useCashier();
  const visible = role === "admin" ? tabs : tabs.filter((t) => t.href === "/" || t.href === "/products");
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {visible.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`bottom-nav-link${pathname === tab.href ? " active" : ""}`}>
            {tab.icon(pathname === tab.href)}
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
