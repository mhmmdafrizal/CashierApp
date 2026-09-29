"use client";
import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { useCashier } from "@/lib/store";

const KASIR_PAGES = ["/", "/products"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { role, hydrated, login } = useCashier();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!hydrated) return null; // tunggu restore session dari localStorage

  if (!role) {
    async function handleSubmit(e: FormEvent) {
      e.preventDefault();
      const res = await login(username, password);
      if (res.ok) {
        setError("");
        setPassword("");
      } else {
        setError(res.error);
      }
    }
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
        <form className="card" style={{ width: "min(360px, 100%)", gap: 12 }} onSubmit={handleSubmit}>
          <h2 style={{ margin: "0 0 4px", textAlign: "center" }}>Masuk</h2>
          <div className="field">
            <label>Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoCapitalize="none"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-danger" style={{ margin: 0, fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" style={{ justifyContent: "center" }}>
            Masuk
          </button>
        </form>
      </div>
    );
  }

  if (role === "kasir" && !KASIR_PAGES.includes(pathname)) {
    return (
      <div className="empty-state" style={{ minHeight: "60vh" }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Akses ditolak</p>
        <p>Hanya admin yang boleh membuka halaman ini.</p>
        <a className="btn btn-primary" href="/" style={{ marginTop: 8 }}>Ke Halaman Kasir</a>
      </div>
    );
  }

  return <>{children}</>;
}
