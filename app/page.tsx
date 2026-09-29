"use client";
import { useMemo, useState } from "react";
import { useCashier, rupiah } from "@/lib/store";
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon } from "@/components/Icons";
import { printReceipt, isPrinterConnected } from "@/lib/printer";

const QUICK_AMOUNTS = [
  { amount: 0, label: "Uang Pas" },
  { amount: 50000, label: "Rp 50.000" },
  { amount: 100000, label: "Rp 100.000" },
  { amount: 200000, label: "Rp 200.000" },
];

function CartIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  );
}

export default function PosPage() {
  const { products, categories, cart, cartTotal, storeSettings, productView, setProductView, addToCart, incQty, decQty, removeFromCart, checkout } = useCashier();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [step, setStep] = useState<"input" | "success">("input");
  const [paidAmount, setPaidAmount] = useState("");
  const [lastChange, setLastChange] = useState(0);
  const [lastTx, setLastTx] = useState<{ number: string; date: string; items: { name: string; price: number; qty: number }[]; paid: number; total: number } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [bouncingId, setBouncingId] = useState<number | null>(null);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || (p.variant ?? "").toLowerCase().includes(q)) &&
        (selectedCategory === "Semua" || p.category === selectedCategory)
    );
  }, [products, search, selectedCategory]);

  const cartItemCount = useMemo(() => cart.reduce((sum, c) => sum + c.qty, 0), [cart]);
  const paidNum = parseFloat(paidAmount) || 0;
  const hasPaidInput = paidAmount !== "";
  const showChange = hasPaidInput && paidNum >= cartTotal;
  const showInsufficient = hasPaidInput && paidNum < cartTotal;
  const payDisabled = !hasPaidInput || paidNum < cartTotal;

  function openCheckout() {
    setStep("input");
    setPaidAmount("");
    setCheckoutOpen(true);
  }

  function closeCheckout() {
    setCheckoutOpen(false);
  }

  function handleQuickCash(amount: number) {
    if (amount === 0) {
      setPaidAmount(String(cartTotal));
    } else {
      setPaidAmount(String(amount));
    }
  }

  async function handlePrint() {
    if (!lastTx) return;
    if (!isPrinterConnected()) {
      alert("Printer belum terhubung. Silakan hubungkan di halaman Pengaturan.");
      return;
    }
    setPrinting(true);
    try {
      await printReceipt(storeSettings, lastTx);
    } catch {
      alert("Gagal mencetak. Periksa koneksi printer.");
    }
    setPrinting(false);
  }

  function handleAddToCart(productId: number) {
    addToCart(productId);
    setBouncingId(productId);
    setTimeout(() => setBouncingId(null), 300);
  }

  function handleComplete() {
    const items = cart.map((c) => {
      const p = products.find((pr) => pr.id === c.productId)!;
      return { name: p.name, price: p.price, qty: c.qty };
    });
    const total = cartTotal;
    const result = checkout(paidNum);
    if (!result.ok) return;
    setLastTx({ number: result.number, date: new Date().toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), items, paid: paidNum, total });
    setLastChange(result.change);
    setStep("success");
  }

  return (
    <>
      <div className="pos-grid select-none">
        <section>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Cari produk</label>
              <div className="search-wrap">
                <SearchIcon />
                <input className="input" type="text" placeholder="Nama produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="seg" role="group" aria-label="Tampilan produk">
              <label className="seg-opt">
                <input type="radio" name="view" checked={productView === "card"} onChange={() => setProductView("card")} />
                Card
              </label>
              <label className="seg-opt">
                <input type="radio" name="view" checked={productView === "list"} onChange={() => setProductView("list")} />
                List
              </label>
            </div>
          </div>

          <div className="category-tabs">
            {["Semua", ...categories].map((cat) => (
              <button
                key={cat}
                className={`category-tab ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <SearchIcon />
              <p>Belum ada produk. Tambahkan di halaman Produk.</p>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="empty-state">
              <SearchIcon />
              <p>Produk tidak ditemukan.</p>
            </div>
          ) : productView === "card" ? (
            <div className="product-grid">
              {visibleProducts.map((p) => {
                const outOfStock = p.stock <= 0;
                const inCart = cart.find((c) => c.productId === p.id);
                return (
                  <div
                    className="card"
                    key={p.id}
                    style={{ position: "relative", cursor: outOfStock ? "default" : "pointer" }}
                    onClick={outOfStock ? undefined : () => handleAddToCart(p.id)}
                  >
                    {inCart && (
                      <span className="product-qty-badge">{inCart.qty}</span>
                    )}
                    <h4 style={{ margin: 0 }}>{p.name}</h4>
                    {p.variant && <span className="tag tag-outline">{p.variant}</span>}
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-heading)" }}>{rupiah(p.price)}</div>
                    {outOfStock ? (
                      <span className="tag tag-neutral">Stok habis</span>
                    ) : (
                      <span className="tag tag-outline">Stok&nbsp;{p.stock}</span>
                    )}
                    <button
                      className="btn btn-primary btn-block"
                      disabled={outOfStock}
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(p.id); }}
                      style={{ animation: bouncingId === p.id ? "cartBounce .3s ease" : undefined }}
                    >
                      <PlusIcon /> Tambah
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-card">
              <table className="table">
                <thead>
                  <tr><th>Produk</th><th>Harga</th><th>Stok</th><th></th></tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p) => {
                    const outOfStock = p.stock <= 0;
                    const inCart = cart.find((c) => c.productId === p.id);
                    return (
                      <tr
                        key={p.id}
                        style={{ cursor: outOfStock ? "default" : "pointer" }}
                        onClick={outOfStock ? undefined : () => handleAddToCart(p.id)}
                      >
                        <td style={{ fontWeight: 600 }}>
                          {p.name}
                          {p.variant && <span className="tag tag-outline" style={{ marginLeft: 6 }}>{p.variant}</span>}
                          {inCart && (
                            <span style={{ color: "var(--color-accent)", fontWeight: 800, marginLeft: 8 }}>×{inCart.qty}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 800, fontFamily: "var(--font-heading)" }}>{rupiah(p.price)}</td>
                        <td>
                          {outOfStock ? (
                            <span className="tag tag-neutral">Stok habis</span>
                          ) : (
                            <span className="tag tag-outline">Stok&nbsp;{p.stock}</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-primary"
                            disabled={outOfStock}
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(p.id); }}
                            style={{ animation: bouncingId === p.id ? "cartBounce .3s ease" : undefined }}
                          >
                            <PlusIcon /> Tambah
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card elev-sm cart-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h4 style={{ margin: 0 }}>Keranjang</h4>
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </div>
          <hr className="hr" style={{ margin: "8px 0" }} />

          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <CartIcon />
              <p>Belum ada produk. Ketuk produk untuk menambahkan.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cart.map((line) => {
                const p = products.find((pr) => pr.id === line.productId)!;
                return (
                  <div className="cart-line" key={line.productId}>
                    <div className="cart-line-top">
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14 }}>
                        {p.name}
                        {p.variant && <span className="tag tag-outline" style={{ marginLeft: 6 }}>{p.variant}</span>}
                      </div>
                      <button className="btn btn-icon btn-ghost" aria-label="Hapus" onClick={() => removeFromCart(p.id)}>
                        <TrashIcon />
                      </button>
                    </div>
                    <div className="cart-line-bottom">
                      <div className="qty-stepper" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-icon btn-secondary" style={{ width: 26, height: 26 }} onClick={() => decQty(p.id)}>
                          <MinusIcon />
                        </button>
                        <span style={{ minWidth: 20, textAlign: "center", fontSize: 14 }}>{line.qty}</span>
                        <button
                          className="btn btn-icon btn-secondary"
                          style={{ width: 26, height: 26 }}
                          disabled={line.qty >= p.stock}
                          onClick={() => incQty(p.id)}
                        >
                          <PlusIcon size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-heading)" }}>{rupiah(p.price * line.qty)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <hr className="hr" style={{ margin: "12px 0 8px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontSize: 13 }} className="text-muted">Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-heading)" }}>{rupiah(cartTotal)}</span>
          </div>
          <button className="btn btn-primary btn-block" style={{ justifyContent: "center" }} disabled={cart.length === 0} onClick={openCheckout}>
            Bayar
          </button>
        </section>
      </div>

      {checkoutOpen && (
        <div className="dialog-backdrop">
          <div className="dialog">
            {step === "input" ? (
              <>
                <h3 className="dialog-title" style={{ margin: 0 }}>Pembayaran</h3>
                <div className="dialog-body">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 16 }}>
                    <span className="text-muted">Total transaksi</span>
                    <span style={{ fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 20 }}>{rupiah(cartTotal)}</span>
                  </div>

                  <div className="quick-cash-grid">
                    {QUICK_AMOUNTS.map((qa) => (
                      <button
                        key={qa.amount}
                        className="quick-cash-btn"
                        onClick={() => handleQuickCash(qa.amount)}
                      >
                        <span className="qc-amount">{qa.amount === 0 ? rupiah(cartTotal) : rupiah(qa.amount)}</span>
                        <span className="qc-label">{qa.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="field">
                    <label>Atau masukkan jumlah manual</label>
                    <input className="input" type="number" min={0} placeholder="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                  </div>
                  {showChange && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-success-100)" }}>
                      <span style={{ color: "var(--color-success-700)" }}>Kembalian</span>
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--color-success-700)", fontSize: 16 }}>{rupiah(Math.max(0, paidNum - cartTotal))}</span>
                    </div>
                  )}
                  {showInsufficient && (
                    <div className="warning-card" style={{ marginTop: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      Pembayaran kurang {rupiah(cartTotal - paidNum)}
                    </div>
                  )}
                </div>
                <div className="dialog-actions">
                  <button className="btn btn-secondary" onClick={closeCheckout}>Batal</button>
                  <button className="btn btn-primary" disabled={payDisabled} onClick={handleComplete}>Selesaikan Transaksi</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="dialog-title" style={{ margin: 0 }}>Transaksi Berhasil</h3>
                <div className="dialog-body">
                  <p style={{ margin: "0 0 12px" }}>Transaksi telah disimpan dan stok produk diperbarui.</p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-success-100)" }}>
                    <span style={{ color: "var(--color-success-700)" }}>Kembalian</span>
                    <span style={{ fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 22, color: "var(--color-success-700)" }}>{rupiah(lastChange)}</span>
                  </div>
                </div>
                <div className="dialog-actions">
                  <button className="btn btn-secondary" disabled={printing} onClick={handlePrint}>{printing ? "Mencetak..." : "Cetak Struk"}</button>
                  <button className="btn btn-primary" onClick={closeCheckout}>Selesai</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
