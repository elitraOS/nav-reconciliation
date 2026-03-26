"use client";

import { useState } from "react";
import { NavCard } from "./NavCard";

const EXAMPLE_VAULTS = [
  "0x0000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000002",
];

export function VaultsList() {
  const [customAddress, setCustomAddress] = useState("");
  const [vaults, setVaults] = useState<string[]>(EXAMPLE_VAULTS);

  const addVault = () => {
    const addr = customAddress.trim();
    if (addr && !vaults.includes(addr)) {
      setVaults((prev) => [...prev, addr]);
      setCustomAddress("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          placeholder="Enter vault address (0x...)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => { if (e.key === "Enter") addVault(); }}
        />
        <button
          onClick={addVault}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Vault
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {vaults.map((address) => (
          <NavCard key={address} address={address} />
        ))}
      </div>
    </div>
  );
}
