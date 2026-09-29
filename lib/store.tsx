"use client";
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { verifyLogin } from "@/app/login-action";

export type Product = { id: number; name: string; price: number; stock: number; category: string; variant?: string };
export type CartLine = { productId: number; qty: number };
export type TxItem = { name: string; price: number; qty: number };
export type Transaction = { number: string; date: string; iso: string; paid: number; items: TxItem[] };
// ponytail: password tidak lagi ada di source — dibaca server di app/login-action.ts.
// Role di bawah ini hanya untuk tampilan UI; otorisasi sebenarnya masih client-side.
export type Role = "admin" | "kasir";


export type StoreSettings = { name: string; subtitle: string; address: string; phone: string; footer: string; paperWidth: 58 | 80; theme: "terang" | "gelap" | "auto" };

export function rupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

// Kode transaksi unik: TRX-YYYYMMDD-SSSS
//   TRX      = jenis (transaksi)
//   YYYYMMDD = tanggal transaksi (20260924 = 24 Sep 2026)
//   SSSS     = nomor urut ke-(n+1) pada hari itu (reset tiap tanggal baru)
export function nextTxNumber(transactions: Transaction[]) {
  const d = new Date();
  const ymd =
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const prefix = `TRX-${ymd}-`;
  const seq = transactions
    .filter((t) => t.number.startsWith(prefix))
    .reduce((m, t) => Math.max(m, parseInt(t.number.slice(prefix.length), 10) || 0), 0);
  return prefix + String(seq + 1).padStart(4, "0");
}

const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_CATEGORIES: string[] = ["Makanan", "Minuman"];
const INITIAL_TRANSACTIONS: Transaction[] = [];

const DEFAULT_SETTINGS: StoreSettings = { name: "", subtitle: "", address: "", phone: "", footer: "", paperWidth: 58, theme: "terang" };

type CashierContextValue = {
  products: Product[];
  categories: string[];
  cart: CartLine[];
  transactions: Transaction[];
  storeSettings: StoreSettings;
  cartTotal: number;
  addToCart: (productId: number) => void;
  incQty: (productId: number) => void;
  decQty: (productId: number) => void;
  removeFromCart: (productId: number) => void;
  checkout: (paidAmount: number) => { ok: boolean; change: number; number: string };
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: number, patch: Partial<Product>) => void;
  removeProduct: (id: number) => void;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => { ok: boolean; usedBy: number };
  updateStoreSettings: (patch: Partial<StoreSettings>) => void;
  deleteTransaction: (number: string) => void;
  clearTransactions: () => void;
  productView: "card" | "list";
  setProductView: (v: "card" | "list") => void;
  role: Role | null;
  hydrated: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error: string }>;
  logout: () => void;
};

const CashierContext = createContext<CashierContextValue | null>(null);

export function CashierProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [productView, setProductViewState] = useState<"card" | "list">("card");
  const [role, setRole] = useState<Role | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // pulihkan pilihan tersimpan setelah mount (hindari hydration mismatch)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "terang" || savedTheme === "gelap" || savedTheme === "auto") {
      setStoreSettings((prev) => ({ ...prev, theme: savedTheme }));
    }
    const savedView = localStorage.getItem("productView");
    if (savedView === "card" || savedView === "list") setProductViewState(savedView);
    const savedRole = localStorage.getItem("role");
    if (savedRole === "admin" || savedRole === "kasir") setRole(savedRole);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // script inline sudah menerapkan tema pra-paint
    document.documentElement.dataset.theme = storeSettings.theme;
    localStorage.setItem("theme", storeSettings.theme);
  }, [storeSettings.theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (role) localStorage.setItem("role", role);
    else localStorage.removeItem("role");
  }, [role, hydrated]);

  async function login(username: string, password: string) {
    const res = await verifyLogin(username, password);
    if (!res.ok) return { ok: false, error: res.error };
    setRole(res.role);
    localStorage.setItem("role", res.role);
    return { ok: true, error: "" };
  }

  function logout() {
    setRole(null);
    localStorage.removeItem("role");
  }

  function setProductView(v: "card" | "list") {
    setProductViewState(v);
    localStorage.setItem("productView", v);
  }

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => {
      const p = products.find((pr) => pr.id === c.productId);
      return sum + (p ? p.price * c.qty : 0);
    }, 0),
    [cart, products]
  );

  function addToCart(productId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { productId, qty: 1 }];
    });
  }

  function incQty(productId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => prev.map((c) => (c.productId === productId && c.qty < product.stock ? { ...c, qty: c.qty + 1 } : c)));
  }

  function decQty(productId: number) {
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0));
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  function checkout(paidAmount: number) {
    if (paidAmount < cartTotal) return { ok: false, change: 0, number: "" };
    const change = paidAmount - cartTotal;
    const items: TxItem[] = cart.map((c) => {
      const p = products.find((pr) => pr.id === c.productId)!;
      // ponytail: gabung varian ke name saat snapshot — struk, detail riwayat,
      // dan ringkasan setelah bayar semua baca TxItem.name, jadi cukup di satu titik
      return { name: p.variant ? `${p.name} (${p.variant})` : p.name, price: p.price, qty: c.qty };
    });
    setProducts((prev) =>
      prev.map((p) => {
        const line = cart.find((c) => c.productId === p.id);
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      })
    );
    const number = nextTxNumber(transactions);
    const now = new Date();
    const date = now.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    setTransactions((prev) => [{ number, date, iso: now.toISOString(), paid: paidAmount, items }, ...prev]);
    setCart([]);
    return { ok: true, change, number };
  }

  function addProduct(p: Omit<Product, "id">) {
    setProducts((prev) => [...prev, { ...p, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }]);
  }

  function updateProduct(id: number, patch: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removeProduct(id: number) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((c) => c.productId !== id));
  }

  function addCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]));
  }

  // kategori tidak boleh dihapus selama masih dipakai produk — mencegah produk yatim
  // (hilang dari tab POS tapi tetap memakai nama kategori lama)
  function removeCategory(name: string) {
    const usedBy = products.reduce((n, p) => n + (p.category === name ? 1 : 0), 0);
    if (usedBy > 0) return { ok: false, usedBy };
    setCategories((prev) => prev.filter((c) => c !== name));
    return { ok: true, usedBy: 0 };
  }

  function updateStoreSettings(patch: Partial<StoreSettings>) {
    setStoreSettings((prev) => ({ ...prev, ...patch }));
  }

  function deleteTransaction(number: string) {
    setTransactions((prev) => prev.filter((t) => t.number !== number));
  }

  function clearTransactions() {
    setTransactions([]);
  }

  return (
    <CashierContext.Provider
      value={{ products, categories, cart, transactions, storeSettings, cartTotal, addToCart, incQty, decQty, removeFromCart, checkout, addProduct, updateProduct, removeProduct, addCategory, removeCategory, updateStoreSettings, deleteTransaction, clearTransactions, productView, setProductView, role, hydrated, login, logout }}
    >
      {children}
    </CashierContext.Provider>
  );
}

export function useCashier() {
  const ctx = useContext(CashierContext);
  if (!ctx) throw new Error("useCashier must be used within CashierProvider");
  return ctx;
}
