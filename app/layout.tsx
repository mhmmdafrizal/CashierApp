import type { Metadata } from "next";
import "./globals.css";
import { CashierProvider } from "@/lib/store";
import AuthGuard from "@/components/AuthGuard";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Simple Cashier",
  description: "Aplikasi kasir sederhana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        <CashierProvider>
          <AuthGuard>
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <Nav />
              <main className="app-main">{children}</main>
              <BottomNav />
            </div>
          </AuthGuard>
        </CashierProvider>
      </body>
    </html>
  );
}
