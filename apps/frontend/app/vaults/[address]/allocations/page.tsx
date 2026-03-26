import { AllocationForm } from "@/components/registry/AllocationForm";
import { AllocationList } from "@/components/registry/AllocationList";
import Link from "next/link";

interface Props {
  params: { address: string };
}

export default function VaultAllocationsPage({ params }: Props) {
  const { address } = params;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/vaults/${address}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Vault Detail
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">Allocations</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Allocation Manager
      </h1>

      <div className="space-y-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Registered Allocations
          </h2>
          <AllocationList vaultAddress={address} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Register New Allocation
          </h2>
          <AllocationForm defaultVaultAddress={address} />
        </div>
      </div>
    </div>
  );
}
