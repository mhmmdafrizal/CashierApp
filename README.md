# Simple Cashier — Next.js

Recreation of the Simple Cashier POS design (Modernist design system) as a runnable Next.js 16 (App Router, TypeScript) app. The UI language is Indonesian.

## Run in VS Code

```bash
cd cashier_app
npm install
npm run dev
```

Open http://localhost:3000

## Login

No credential lives in the source. Passwords are read server-side in `app/login-action.ts` from environment variables. Create `.env.local` before running:

```bash
ADMIN_PASSWORD=choose-something
KASIR_PASSWORD=choose-something
```

| Username | Password | Role | Can open |
| --- | --- | --- | --- |
| `admin` | `ADMIN_PASSWORD` | admin | all pages |
| `kasir` | `KASIR_PASSWORD` | kasir | Kasir, Produk |

Riwayat and Pengaturan are admin-only. A `kasir` who opens one directly gets an "Akses ditolak" screen rather than a redirect. If a variable is missing, the form names it rather than reporting a wrong password. `.env.local` is gitignored, and the pre-commit hook blocks any `.env*` file.

**This is still not real auth.** The role lives in `localStorage` and is restored without a server check, so anyone can set it in devtools. The environment variables keep the password out of the repository; they do not protect the data.

## Routes

- `/` — **Kasir**: product search, category tabs, card/list toggle, cart, checkout dialog with change calculation
- `/products` — **Produk**: product list, add, edit, delete, and category management
- `/transactions` — **Riwayat**: revenue summary and history grouped by day or month, detail dialog (admin)
- `/settings` — **Pengaturan**: store profile, theme, receipt printer (admin)

## Structure

- `app/page.tsx` — Kasir (POS)
- `app/products/page.tsx` — product + category management
- `app/transactions/page.tsx` — transaction history
- `app/settings/page.tsx` — store settings, theme, printer pairing
- `app/globals.css` — Modernist design tokens and component classes
- `components/` — `Nav.tsx`, `BottomNav.tsx`, `AuthGuard.tsx`, `Toast.tsx`, `Icons.tsx`
- `lib/store.tsx` — all state (React Context): cart, products, categories, transactions, store settings, role
- `lib/printer.ts` — Web Bluetooth ESC/POS receipt printing, no dependencies
- `lib/bluetooth.d.ts` — hand-rolled Web Bluetooth types

## Notes

- **Persistence:** only `theme`, `productView`, and `role` survive a reload (localStorage). Products, categories, transactions, cart, and the store profile are in-memory and reset on refresh.
- **Business rules** run client-side in the store: stock caps how much can be added to the cart, payment must be >= the total, and checkout decrements stock and records a transaction. Receipt numbers look like `TRX-20260924-0001` and the sequence resets each day.
- **Categories** can only be created from Kelola Kategori — the product form selects from the existing list. Deleting a category is blocked while any product still uses it, and name matching is case-insensitive so you cannot end up with both `Makanan` and `makanan`.
- **Printing** is raw Web Bluetooth with ESC/POS, no dependencies. It needs Chrome, Edge, Opera, or Samsung Internet on desktop, served over HTTPS or localhost. The paired printer is reattached on page load via `navigator.bluetooth.getDevices()`.
- Swap `lib/store.tsx`'s in-memory state for real persistence (database + API routes) when ready.
