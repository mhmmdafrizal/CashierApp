"use client";
import { useEffect, useState } from "react";
import { useCashier } from "@/lib/store";
import { connectPrinter, disconnectPrinter, restorePrinter } from "@/lib/printer";
import Toast from "@/components/Toast";

export default function SettingsPage() {
  const { storeSettings, updateStoreSettings } = useCashier();
  const [draft, setDraft] = useState({ ...storeSettings });
  const [toast, setToast] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => { void restorePrinter().then(setConnected); }, []);
  // draft ikut tersinkron setelah restore tema/persisten dari store
  useEffect(() => { setDraft({ ...storeSettings }); }, [storeSettings]);

  async function handleConnect() {
    setConnecting(true);
    const ok = await connectPrinter();
    setConnected(ok);
    setConnecting(false);
  }

  function handleDisconnect() {
    disconnectPrinter();
    setConnected(false);
  }

  function handleSave() {
    updateStoreSettings(draft);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  return (
    <section>
      <div className="page-head select-none">
        <h2 style={{ margin: 0 }}>Pengaturan Toko</h2>
      </div>
      <hr className="hr" />

      <h4 style={{ marginBottom: 12 }}>Toko</h4>
      <div className="card select-none" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>Nama Toko</label>
          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Masukkan Nama Toko" />
        </div>
        <div className="field">
          <label>Subtitle Struk</label>
          <input className="input" value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} placeholder="Struk Pembayaran" />
        </div>
        <div className="field">
          <label>Alamat</label>
          <input className="input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Jl. Merdeka No. 10" />
        </div>
        <div className="field">
          <label>No. Telepon</label>
          <input className="input" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="0812-3456-7890" />
        </div>
        <div className="field">
          <label>Pesan Penutup Struk</label>
          <input className="input" value={draft.footer} onChange={(e) => setDraft({ ...draft, footer: e.target.value })} placeholder="Terima kasih!" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
        </div>
      </div>

      <h4 style={{ margin: "24px 0 12px" }}>Tampilan</h4>
      <div className="card select-none" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>Tema Aplikasi</label>
          <div className="seg" role="group" aria-label="Tema aplikasi">
            <label className="seg-opt">
              <input type="radio" name="theme" checked={draft.theme === "terang"} onChange={() => setDraft({ ...draft, theme: "terang" })} />
              Terang
            </label>
            <label className="seg-opt">
              <input type="radio" name="theme" checked={draft.theme === "gelap"} onChange={() => setDraft({ ...draft, theme: "gelap" })} />
              Gelap
            </label>
            <label className="seg-opt">
              <input type="radio" name="theme" checked={draft.theme === "auto"} onChange={() => setDraft({ ...draft, theme: "auto" })} />
              Otomatis
            </label>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12 }} className="text-muted">
            Otomatis menyesuaikan mode terang/gelap sistem.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
        </div>
      </div>

      <h4 style={{ margin: "24px 0 12px" }}>Printer</h4>
      <div className="card" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>Lebar Kertas</label>
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" name="paperWidth" checked={draft.paperWidth === 58} onChange={() => setDraft({ ...draft, paperWidth: 58 })} />
              58mm
            </label>
            <label className="seg-opt">
              <input type="radio" name="paperWidth" checked={draft.paperWidth === 80} onChange={() => setDraft({ ...draft, paperWidth: 80 })} />
              80mm
            </label>
          </div>
        </div>

        <div className="field">
          <label>Koneksi Bluetooth</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {connected ? (
              <>
                <span className="tag tag-success">Terhubung</span>
                <button className="btn btn-secondary" onClick={handleDisconnect}>Putuskan</button>
              </>
            ) : (
              <button className="btn btn-primary" disabled={connecting} onClick={handleConnect}>
                {connecting ? "Menyambungkan..." : "Hubungkan Printer"}
              </button>
            )}
          </div>
        </div>

        <p style={{ margin: "8px 0 0", fontSize: 12 }} className="text-muted select-none">
          Mendukung Chrome, Edge, Opera. Tidak mendukung Firefox / Safari.
        </p>
      </div>

      <Toast show={toast}>Tersimpan!</Toast>
    </section>
  );
}
