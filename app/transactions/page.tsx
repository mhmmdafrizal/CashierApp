"use client";
import { Fragment, useMemo, useState } from "react";
import { useCashier, rupiah, Transaction } from "@/lib/store";

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

const dayLabel = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const txTotal = (t: Transaction) => t.items.reduce((s, it) => s + it.price * it.qty, 0);

export default function TransactionsPage() {
  const { transactions, deleteTransaction, clearTransactions } = useCashier();
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [pending, setPending] = useState<Transaction | "all" | null>(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [period, setPeriod] = useState<"day" | "month">("day");

  const monthOptions = useMemo(
    () => [...new Set(transactions.map((t) => t.iso.slice(0, 7)))].sort().reverse(),
    [transactions]
  );

  const filtered = useMemo(
    () => (monthFilter === "all" ? transactions : transactions.filter((t) => t.iso.startsWith(monthFilter))),
    [transactions, monthFilter]
  );

  const stats = useMemo(
    () => ({ count: filtered.length, revenue: filtered.reduce((sum, t) => sum + txTotal(t), 0) }),
    [filtered]
  );

  // pengelompokan riwayat: Tahun > Bulan, terbaru di atas
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of [...filtered].sort((a, b) => b.iso.localeCompare(a.iso))) {
      const key = t.iso.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // rincian pendapatan per hari / per bulan
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const key = period === "day" ? t.iso.slice(0, 10) : t.iso.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + txTotal(t));
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, total]) => ({ label: period === "day" ? dayLabel(key) : monthLabel(key), total }));
  }, [filtered, period]);

  function confirmDelete() {
    if (pending === "all") clearTransactions();
    else if (pending) deleteTransaction(pending.number);
    setPending(null);
  }

  return (
    <section>
      <div className="page-head">
        <h2 style={{ margin: 0 }}>Riwayat Transaksi</h2>
        {transactions.length > 0 && (
          <button
            className="btn btn-secondary"
            style={{ color: "var(--color-danger-700)" }}
            onClick={() => setPending("all")}
          >
            Hapus Semua
          </button>
        )}
      </div>
      <hr className="hr" style={{ marginBottom: 16 }} />

      {transactions.length > 0 && (
        <div className="stat-row">
          <div className="stat-card">
            <span className="stat-label">Total Transaksi</span>
            <span className="stat-value">{stats.count}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Pendapatan</span>
            <span className="stat-value text-success">{rupiah(stats.revenue)}</span>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="card" style={{ gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="seg" role="group" aria-label="Periode pendapatan">
              <label className="seg-opt">
                <input type="radio" name="period" checked={period === "day"} onChange={() => setPeriod("day")} />
                Per Hari
              </label>
              <label className="seg-opt">
                <input type="radio" name="period" checked={period === "month"} onChange={() => setPeriod("month")} />
                Per Bulan
              </label>
            </div>
            <select
              className="input"
              style={{ width: "auto" }}
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter bulan"
            >
              <option value="all">Semua Bulan</option>
              {monthOptions.map((k) => (
                <option key={k} value={k}>{monthLabel(k)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {breakdown.length === 0 && <span className="text-muted" style={{ fontSize: 13 }}>Tidak ada data.</span>}
            {breakdown.map((b) => (
              <div
                key={b.label}
                style={{
                  display: "flex", justifyContent: "space-between", gap: 8,
                  fontSize: 14, paddingBottom: 6,
                  borderBottom: "1px solid var(--color-divider)",
                }}
              >
                <span>{b.label}</span>
                <span className="text-success" style={{ fontWeight: 700 }}>{rupiah(b.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <p>Belum ada transaksi. Transaksi akan muncul di sini setelah checkout.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr><th>No. Transaksi</th><th>Tanggal</th><th>Total</th><th>Diterima</th><th>Kembalian</th><th></th></tr>
            </thead>
            <tbody>
              {groups.map(([key, list], gi) => {
                const year = key.slice(0, 4);
                const prevYear = gi > 0 ? groups[gi - 1][0].slice(0, 4) : null;
                const monthTotal = list.reduce((s, t) => s + txTotal(t), 0);
                return (
                  <Fragment key={key}>
                    {year !== prevYear && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            background: "var(--color-neutral-200)", padding: "8px 16px",
                            fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
                            fontWeight: 800, color: "var(--color-text-muted)",
                          }}
                        >
                          {year}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={6} style={{ background: "var(--color-neutral-100)", padding: "10px 16px", fontWeight: 700 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span>{monthLabel(key)}</span>
                          <span className="text-success">{rupiah(monthTotal)}</span>
                        </div>
                      </td>
                    </tr>
                    {list.map((t) => {
                      const total = txTotal(t);
                      return (
                        <tr key={t.number}>
                          <td style={{ fontWeight: 600 }}>{t.number}</td>
                          <td>{t.date}</td>
                          <td>{rupiah(total)}</td>
                          <td>{rupiah(t.paid)}</td>
                          <td>{rupiah(t.paid - total)}</td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button className="btn btn-ghost" onClick={() => setDetail(t)}>Detail</button>
                            <button
                              className="btn btn-ghost"
                              style={{ color: "var(--color-danger-700)" }}
                              onClick={() => setPending(t)}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <h3 className="dialog-title" style={{ margin: 0 }}>{detail.number}</h3>
            <div className="dialog-body">
              <p className="text-muted" style={{ margin: "0 0 12px" }}>{detail.date}</p>
              <table className="table">
                <thead><tr><th>Produk</th><th>Qty</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {detail.items.map((it, i) => (
                    <tr key={i}><td>{it.name}</td><td>{it.qty}</td><td>{rupiah(it.price * it.qty)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Total</span><span style={{ fontWeight: 800 }}>{rupiah(txTotal(detail))}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Uang diterima</span><span>{rupiah(detail.paid)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Kembalian</span><span>{rupiah(detail.paid - txTotal(detail))}</span></div>
              </div>
            </div>
            <div className="dialog-actions">
              <button className="btn btn-primary" onClick={() => setDetail(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="dialog-backdrop" onClick={() => setPending(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title" style={{ margin: 0 }}>
              {pending === "all" ? "Hapus semua riwayat?" : "Hapus transaksi ini?"}
            </h3>
            <div className="dialog-body">
              {pending === "all"
                ? `Semua ${transactions.length} transaksi akan dihapus permanen.`
                : `${pending.number} — ${pending.date} akan dihapus permanen.`}
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setPending(null)}>Batal</button>
              <button
                className="btn btn-primary"
                style={{ background: "var(--color-danger-500)" }}
                onClick={confirmDelete}
              >
                Hapus
              </button>
              </div>
          </div>
        </div>
      )}
    </section>
  );
}
