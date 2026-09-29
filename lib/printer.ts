// ponytail: raw Web Bluetooth + ESC/POS, no deps
// Works with most generic BLE thermal printers (58mm/80mm)
// Chrome 56+, Edge 79+, Opera 43+, Samsung Internet 6.2+

import type { StoreSettings } from "./store";
import { rupiah } from "./store";

const SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const CHAR = "00002af1-0000-1000-8000-00805f9b34fb";
const MTU = 20;

let char: BluetoothRemoteGATTCharacteristic | null = null;
let dev: BluetoothDevice | null = null;

async function attach(d: BluetoothDevice) {
  const server = await d.gatt?.connect();
  const svc = await server?.getPrimaryService(SERVICE);
  char = (await svc?.getCharacteristic(CHAR)) ?? null;
  dev = char ? d : null;
  return char !== null;
}

export async function connectPrinter(): Promise<boolean> {
  try {
    return await attach(
      await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE] }],
        optionalServices: [SERVICE],
      })
    );
  } catch {
    return false;
  }
}

// Sambung ulang printer yang sudah pernah diizinkan: getDevices() tidak memunculkan chooser
export async function restorePrinter(): Promise<boolean> {
  try {
    const known = await navigator.bluetooth.getDevices();
    return known.length > 0 && (await attach(known[0]));
  } catch {
    return false;
  }
}

export function isPrinterConnected(): boolean {
  return char != null && dev?.gatt?.connected === true;
}

export function disconnectPrinter() {
  dev?.gatt?.disconnect();
  char = null;
  dev = null;
}

async function send(data: Uint8Array) {
  if (!char) throw new Error("Printer not connected");
  for (let i = 0; i < data.length; i += MTU) {
    await char.writeValueWithoutResponse(data.slice(i, i + MTU));
  }
}

function enc(s: string) {
  return new TextEncoder().encode(s);
}

function join(...parts: Uint8Array[]) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ESC/POS helpers
const INIT = new Uint8Array([0x1B, 0x40]);
const ALIGN_L = new Uint8Array([0x1B, 0x61, 0x00]);
const ALIGN_C = new Uint8Array([0x1B, 0x61, 0x01]);
const ALIGN_R = new Uint8Array([0x1B, 0x61, 0x02]);
const BOLD_ON = new Uint8Array([0x1B, 0x45, 0x01]);
const BOLD_OFF = new Uint8Array([0x1B, 0x45, 0x00]);
const CUT = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0 — full cut

function line(str: string) {
  return enc(str + "\n");
}

function pad(str: string, total: number) {
  return str.length >= total ? str.slice(0, total) : str + " ".repeat(total - str.length);
}

export type PrintTx = {
  number: string; date: string;
  items: { name: string; price: number; qty: number }[];
  paid: number; total: number;
};

export async function printReceipt(settings: StoreSettings, tx: PrintTx) {
  const cols = settings.paperWidth === 80 ? 48 : 32;
  const sep = "=".repeat(cols);
  const sepThin = "-".repeat(cols);

  const right = (label: string, val: string) => {
    const gap = cols - label.length - val.length;
    return gap > 0 ? label + " ".repeat(gap) + val : label + " " + val;
  };

  const parts: Uint8Array[] = [INIT];

  // header — bold centered
  parts.push(ALIGN_C, BOLD_ON, line(settings.name), BOLD_OFF);
  parts.push(line(settings.subtitle));
  if (settings.address) parts.push(line(settings.address));
  if (settings.phone) parts.push(line(settings.phone));
  parts.push(line(sep));

  // transaction info
  parts.push(ALIGN_L);
  parts.push(line(right("No", tx.number)));
  parts.push(line(right("Tanggal", tx.date)));
  parts.push(line(sepThin));

  // items — name left, qty x price right
  for (const item of tx.items) {
    const name = item.name.length > cols - 14 ? item.name.slice(0, cols - 15) + ".." : item.name;
    const detail = item.qty + " x " + rupiah(item.price);
    const gap = cols - name.length - detail.length;
    parts.push(line(name + (gap > 0 ? " ".repeat(gap) : " ") + detail));
  }
  parts.push(line(sepThin));

  // totals — right aligned
  parts.push(ALIGN_R, BOLD_ON);
  parts.push(line(right("Total", rupiah(tx.total))));
  parts.push(BOLD_OFF);
  parts.push(line(right("Bayar", rupiah(tx.paid))));
  parts.push(line(right("Kembalian", rupiah(tx.paid - tx.total))));

  // footer
  parts.push(line(sep));
  parts.push(ALIGN_C, line(settings.footer));

  // feed + cut
  parts.push(new Uint8Array([0x1B, 0x64, 0x03]), CUT); // feed 3 lines, cut

  await send(join(...parts));
}
