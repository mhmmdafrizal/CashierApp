"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCashier, rupiah } from "@/lib/store";
import { PlusIcon, TagIcon, TrashIcon } from "@/components/Icons";
import Toast from "@/components/Toast";

export default function ProductsPage() {
  const { products, categories, addProduct, updateProduct, removeProduct, addCategory, removeCategory, role } = useCashier();
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", variant: "", price: "", stock: "", category: "" });
  const [formError, setFormError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [catDialog, setCatDialog] = useState<{ name: string; usedBy: number } | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [adding, setAdding] = useState(false);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.variant ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  useEffect(() => {
    if (adding) nameRef.current?.focus();
  }, [adding]);

  // chip kategori menyaring saat diketik — tanpa ini user cuma memindai baris pill
  const shownCategories = useMemo(() => {
    const q = draft.category.trim().toLowerCase();
    return q ? categories.filter((c) => c.toLowerCase().includes(q)) : categories;
  }, [categories, draft.category]);

  // Nama yang sudah ada berarti produk varian. Tampilkan harga/stok-nya supaya
  // varian berikutnya cukup klik, bukan ketik ulang (dan tidak salah ketik).
  const sameName = useMemo(() => {
    const q = draft.name.trim().toLowerCase();
    if (!q) return null;
    return products.find((p) => p.name.toLowerCase() === q) ?? null;
  }, [products, draft.name]);

  const siblingVariants = useMemo(
    () =>
      sameName
        ? [...new Set(products.filter((p) => p.name === sameName.name && p.variant).map((p) => p.variant!))]
        : [],
    [products, sameName]
  );

  function copyFromSame() {
    if (!sameName) return;
    setDraft((d) => ({ ...d, price: String(sameName.price), stock: String(sameName.stock) }));
  }

  function startEdit(id: number) {
    const p = products.find((x) => x.id === id)!;
    setDraft({ name: p.name, variant: p.variant ?? "", price: String(p.price), stock: String(p.stock), category: p.category });
    setFormError("");
    setEditingId(id);
  }

  // Kategori hanya bisa dipilih, tidak pernah dibuat dari form produk —
  // satu-satunya tempat pembuatan kategori adalah Kelola Kategori.
  function pickCategory(raw: string) {
    const q = raw.trim().toLowerCase();
    if (!q) return "";
    const exact = categories.find((c) => c.toLowerCase() === q);
    if (exact) return exact;
    if (shownCategories.length === 1) return shownCategories[0];
    return ""; // tidak cocok atau ambigu
  }

  // null = aman disimpan; selain itu pesan yang harus ditampilkan
  function categoryProblem(raw: string) {
    const q = raw.trim();
    if (!q || pickCategory(q)) return null;
    return shownCategories.length > 1
      ? `"${q}" cocok dengan ${shownCategories.length} kategori. Pilih salah satu di daftar.`
      : `Kategori "${q}" belum ada. Tambahkan dulu di Kelola Kategori.`;
  }

  function saveEdit() {
    if (editingId == null) return;
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (!name) return setFormError("Isi nama produk dulu.");
    if (!draft.price.trim() || !Number.isFinite(price) || price <= 0) {
      return setFormError("Harga harus diisi dan lebih dari 0.");
    }
    const problem = categoryProblem(draft.category);
    if (problem) return setFormError(problem);
    updateProduct(editingId, {
      name,
      variant: draft.variant.trim() || undefined,
      price,
      stock: Math.max(0, Number(draft.stock) || 0),
      category: pickCategory(draft.category),
    });
    setEditingId(null);
    setFormError("");
  }

  function startAdd() {
    setDraft({ name: "", variant: "", price: "", stock: "", category: categories[0] || "" });
    setFormError("");
    setAdding(true);
  }

  function saveAdd() {
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (!name) return setFormError("Isi nama produk dulu.");
    // ponytail: harga wajib > 0 — Number("") || 0 dulu bisa membuat produk Rp 0 yang tetap bisa dijual
    if (!draft.price.trim() || !Number.isFinite(price) || price <= 0) {
      return setFormError("Harga harus diisi dan lebih dari 0.");
    }
    const problem = categoryProblem(draft.category);
    if (problem) return setFormError(problem);
    const category = pickCategory(draft.category);
    addProduct({ name, variant: draft.variant.trim() || undefined, price, stock: Math.max(0, Number(draft.stock) || 0), category });
    setDraft({ name: "", variant: "", price: "", stock: "", category });
    setFormError("");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    nameRef.current?.focus();
  }

  function countFor(name: string) {
    return products.reduce((n, p) => n + (p.category === name ? 1 : 0), 0);
  }

  function handleAddCategory() {
    const name = newCategory.trim();
    if (!name) return setCategoryError("Isi nama kategori dulu.");
    if (categories.includes(name)) return setCategoryError(`Kategori "${name}" sudah ada.`);
    addCategory(name);
    setNewCategory("");
    setCategoryError("");
  }

  function handleDeleteCategory() {
    if (!catDialog) return;
    const res = removeCategory(catDialog.name);
    // defensive: store menolak bila produk baru saja memakai kategori ini
    if (res.ok) setCatDialog(null);
    else setCatDialog({ ...catDialog, usedBy: res.usedBy });
  }

  function handleRemove(id: number, name: string) {
    if (window.confirm(`Hapus produk "${name}"?`)) {
      removeProduct(id);
    }
  }

  return (
    <section>
      <div className="page-head">
        <h2 style={{ margin: 0 }}>Manajemen Produk</h2>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={startAdd}>
              <PlusIcon /> Tambah Produk
            </button>
            <button
              className="btn btn-secondary"
              aria-expanded={showCategories}
              onClick={() => setShowCategories((v) => !v)}
            >
              <TagIcon /> {showCategories ? "Tutup Kategori" : "Kelola Kategori"}
            </button>
          </div>
        )}
      </div>
      <hr className="hr" />

      {adding && (
        <form
          className="card"
          style={{ marginBottom: 16, maxWidth: 420 }}
          onSubmit={(e) => { e.preventDefault(); saveAdd(); }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0 12px" }}>
            <div className="field">
              <label htmlFor="p-name">Nama produk</label>
              <input
                id="p-name"
                ref={nameRef}
                className="input"
                placeholder="Teh Manis"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="p-variant">Varian</label>
              <input
                id="p-variant"
                className="input"
                placeholder="opsional: Dingin"
                value={draft.variant}
                onChange={(e) => setDraft({ ...draft, variant: e.target.value })}
              />
            </div>
          </div>

          {sameName && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "-6px 0 10px" }}>
              <span className="text-muted" style={{ fontSize: 12 }}>
                Sudah ada · <strong>{sameName.name}{sameName.variant && ` (${sameName.variant})`}</strong> · {rupiah(sameName.price)} · stok {sameName.stock}
              </span>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={copyFromSame}>
                Salin harga &amp; stok
              </button>
              {siblingVariants.map((v) => {
                const on = draft.variant === v;
                return (
                  <button
                    key={v}
                    type="button"
                    className={`tag ${on ? "tag-accent" : "tag-neutral"}`}
                    aria-pressed={on}
                    style={{ border: 0, cursor: "pointer", fontFamily: "var(--font-body)" }}
                    onClick={() => setDraft({ ...draft, variant: on ? "" : v })}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0 12px" }}>
            <div className="field">
              <label htmlFor="p-price">Harga</label>
              <input
                id="p-price"
                className="input"
                type="number"
                min={0}
                placeholder="15000"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="p-stock">Stok</label>
              <input
                id="p-stock"
                className="input"
                type="number"
                min={0}
                placeholder="0"
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-cat">Kategori</label>
            <input
              id="p-cat"
              className="input"
              value={draft.category}
              placeholder="Pilih atau ketik untuk mencari..."
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault(); // jangan sampai Enter ikut submit form produk
                const picked = pickCategory(draft.category);
                if (picked) setDraft({ ...draft, category: picked });
              }}
            />
            {categories.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {shownCategories.map((cat) => {
                  const on = draft.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`tag ${on ? "tag-accent" : "tag-neutral"}`}
                      aria-pressed={on}
                      style={{ border: 0, cursor: "pointer", fontFamily: "var(--font-body)" }}
                      onClick={() => setDraft({ ...draft, category: on ? "" : cat })}
                    >
                      {cat}
                      <span style={{ fontSize: 10 }}>· {countFor(cat)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {draft.category.trim() && shownCategories.length === 0 && (
              <p style={{ margin: "8px 0 0", fontSize: 12 }} className="text-muted">
                &quot;{draft.category.trim()}&quot; belum ada — tambahkan di Kelola Kategori.
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" type="button" onClick={() => setAdding(false)}>Batal</button>
            <button className="btn btn-primary" type="submit">Simpan</button>
          </div>
        </form>
      )}

      {formError && (
        <p role="alert" className="text-danger" style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600 }}>
          {formError}
        </p>
      )}

      <div className="field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <label>Cari produk</label>
        <input className="input" type="text" placeholder="Nama produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isAdmin && showCategories && (
        <div className="card" style={{ marginBottom: 16, maxWidth: 420 }}>
          <h4 style={{ margin: 0 }}>Kelola Kategori</h4>

          <form
            className="field"
            style={{ marginTop: 12, marginBottom: 0 }}
            onSubmit={(e) => { e.preventDefault(); handleAddCategory(); }}
          >
            <label htmlFor="cat-name">Nama kategori baru</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="cat-name"
                className="input"
                style={{ flex: 1 }}
                placeholder="Makanan, Minuman, ..."
                value={newCategory}
                aria-invalid={categoryError ? true : undefined}
                aria-describedby={categoryError ? "cat-error" : undefined}
                onChange={(e) => { setNewCategory(e.target.value); setCategoryError(""); }}
              />
              <button className="btn btn-primary" type="submit">Tambah</button>
            </div>
            {categoryError && (
              <p id="cat-error" className="text-danger" style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600 }}>
                {categoryError}
              </p>
            )}
          </form>

          {categories.length === 0 ? (
            <p className="text-muted" style={{ margin: "16px 0 0", fontSize: 13 }}>
              Belum ada kategori. Tambahkan dulu supaya produk mudah dikelompokkan.
            </p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              {categories.map((cat) => (
                <span key={cat} className="tag tag-accent" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {cat}
                  <span style={{ fontSize: 10 }}>· {countFor(cat)}</span>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ width: 28, height: 28, margin: -4, padding: 0 }}
                    aria-label={`Hapus kategori ${cat}`}
                    onClick={() => setCatDialog({ name: cat, usedBy: countFor(cat) })}
                  >
                    <TrashIcon />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {catDialog && (
        <div className="dialog-backdrop" onClick={() => setCatDialog(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            {catDialog.usedBy > 0 ? (
              <>
                <h3 className="dialog-title" style={{ margin: 0 }}>Kategori masih dipakai</h3>
                <div className="dialog-body">
                  Kategori <strong>{catDialog.name}</strong> dipakai oleh {catDialog.usedBy} produk. Pindahkan atau hapus produknya dulu, baru kategori ini bisa dihapus.
                </div>
                <div className="dialog-actions">
                  <button className="btn btn-primary" onClick={() => setCatDialog(null)}>Mengerti</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="dialog-title" style={{ margin: 0 }}>Hapus kategori?</h3>
                <div className="dialog-body">
                  Kategori <strong>{catDialog.name}</strong> akan dihapus. Tidak ada produk yang memakai kategori ini.
                </div>
                <div className="dialog-actions">
                  <button className="btn btn-secondary" onClick={() => setCatDialog(null)}>Batal</button>
                  <button
                    className="btn btn-primary"
                    style={{ background: "var(--color-danger-500)" }}
                    onClick={handleDeleteCategory}
                  >
                    Hapus
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <circle cx="7" cy="7" r="1" />
          </svg>
          <p>Belum ada produk. Klik &quot;Tambah Produk&quot; untuk memulai.</p>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <p>Tidak ada produk yang cocok dengan pencarian.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr><th>Nama Produk</th><th>Varian</th><th>Kategori</th><th>Harga</th><th>Stok</th><th></th></tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => (
                <tr key={p.id}>
                  {editingId === p.id ? (
                    <>
                      <td><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
                      <td><input className="input" value={draft.variant} placeholder="—" onChange={(e) => setDraft({ ...draft, variant: e.target.value })} /></td>
                      <td>
                        <input className="input" type="text" list="category-list-edit" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                        <datalist id="category-list-edit">
                          {categories.map((c) => <option key={c} value={c} />)}
                        </datalist>
                      </td>
                      <td><input className="input" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></td>
                      <td><input className="input" type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} /></td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-ghost" onClick={saveEdit}>Simpan</button>
                        <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Batal</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>
                        {p.variant ? (
                          <span className="tag tag-outline">{p.variant}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {p.category ? (
                          <span className="tag tag-accent">{p.category}</span>
                        ) : (
                          <span className="tag tag-neutral">Tanpa Kategori</span>
                        )}
                      </td>
                      <td>{rupiah(p.price)}</td>
                      <td>{p.stock <= 0 ? <span className="tag tag-neutral">0</span> : p.stock}</td>
                      <td style={{ textAlign: "right" }}>
                        {isAdmin && (
                          <>
                            <button className="btn btn-ghost" onClick={() => startEdit(p.id)}>Ubah</button>
                            <button className="btn btn-ghost text-danger" onClick={() => handleRemove(p.id, p.variant ? `${p.name} (${p.variant})` : p.name)}>Hapus</button>
                          </>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast show={savedFlash}>Produk disimpan</Toast>
    </section>
  );
}
