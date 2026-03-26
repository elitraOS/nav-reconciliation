"use client";

import { useState } from "react";
import { AllocationList } from "./AllocationList";
import { AllocationForm } from "./AllocationForm";
import Link from "next/link";

interface VaultAllocationsProps {
  address: string;
}

export function VaultAllocations({ address }: VaultAllocationsProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/vaults/${address}`} className="text-sm text-blue-600 hover:underline">
          ← Vault Detail
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">Allocations</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Allocations</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Allocation"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Register Allocation
          </h2>
          <AllocationForm
            defaultVaultAddress={address}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <AllocationList vaultAddress={address} />
      </div>
    </div>
  );
}
