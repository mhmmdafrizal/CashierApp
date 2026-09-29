"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreIcon } from "@/components/Icons";
import { useCashier } from "@/lib/store";

export default function Nav() {
  const pathname = usePathname();
  const { storeSettings, role, logout } = useCashier();
  const items = [
    { href: "/", label: "Kasir" },
    { href: "/products", label: "Produk" },
    ...(role === "admin"
      ? [
          { href: "/transactions", label: "Riwayat" },
          { href: "/settings", label: "Pengaturan" },
        ]
      : []),
  ];
  return (
    <header className="nav">
      <div className="nav-brand">
        <span className="nav-brand-mark"><StoreIcon /></span>
        {storeSettings.name}
      </div>
      <nav className="nav-links nav-links-desktop">
        {items.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <button className="btn btn-ghost" onClick={logout} title={`Keluar (${role})`}>
        Keluar
      </button>
    </header>
  );
}
