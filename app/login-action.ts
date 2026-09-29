"use server";
// Satu-satunya tempat password dibaca. Tidak ada "use client" di file ini,
// jadi process.env tidak pernah ikut ter-inline ke bundle browser. Itulah
// alasan kredensial harus lewat server, bukan NEXT_PUBLIC_ (yang justru
// bisa dibaca siapa pun lewat devtools).

type Role = "admin" | "kasir";

type LoginResult = { ok: true; role: Role } | { ok: false; error: string };

// username bukan rahasia, jadi boleh tetap di source
const ROLES: Record<string, Role> = { admin: "admin", kasir: "kasir" };
const ENV: Record<Role, string | undefined> = {
  admin: process.env.ADMIN_PASSWORD,
  kasir: process.env.KASIR_PASSWORD,
};
const ENV_NAME: Record<Role, string> = { admin: "ADMIN_PASSWORD", kasir: "KASIR_PASSWORD" };

export async function verifyLogin(username: string, password: string): Promise<LoginResult> {
  const role = ROLES[username.trim().toLowerCase()];
  if (!role) return { ok: false, error: "Username/password salah" };

  // env yang belum diset harus bernama jelas, bukan ikut terbaca "salah" —
  // user tidak akan pernah menebak file mana yang perlu diperbaiki
  const expected = ENV[role];
  if (!expected) return { ok: false, error: `${ENV_NAME[role]} belum diset di .env.local` };
  if (expected !== password) return { ok: false, error: "Username/password salah" };

  return { ok: true, role };
}
