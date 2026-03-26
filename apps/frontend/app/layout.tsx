import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "NAV Engine Dashboard",
  description: "Vault NAV reconciliation dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Web3Provider>
          <Header />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
