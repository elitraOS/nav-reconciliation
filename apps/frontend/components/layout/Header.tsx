"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="flex justify-between items-center px-6 py-4 border-b">
      <nav className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-600">
          NAV Engine
        </Link>
        <Link href="/vaults" className="text-sm text-gray-600 hover:text-gray-900">
          Vaults
        </Link>
      </nav>
      <ConnectButton />
    </header>
  );
}
