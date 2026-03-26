"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { registerVaultAllocation } from "@/lib/api/registry";
import {
  RegisterVaultRequest,
  RegisterVaultRequestSchema,
} from "@/lib/api/types";

interface AllocationFormProps {
  defaultVaultAddress?: string;
  onSuccess?: () => void;
}

export function AllocationForm({
  defaultVaultAddress,
  onSuccess,
}: AllocationFormProps) {
  const { address: connectedAddress } = useAccount();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterVaultRequest>({
    resolver: zodResolver(RegisterVaultRequestSchema),
    defaultValues: {
      vaultAddress: defaultVaultAddress ?? "",
      protocol: "",
      chain: "",
    },
  });

  const mutation = useMutation({
    mutationFn: registerVaultAllocation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allocations"] });
      reset();
      onSuccess?.();
    },
  });

  const onSubmit = (data: RegisterVaultRequest) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {connectedAddress && (
        <p className="text-xs text-gray-500">
          Connected as:{" "}
          <span className="font-mono">{connectedAddress}</span>
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vault Address
        </label>
        <input
          {...register("vaultAddress")}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.vaultAddress && (
          <p className="mt-1 text-xs text-red-600">
            {errors.vaultAddress.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Protocol
        </label>
        <input
          {...register("protocol")}
          placeholder="e.g. aave-v3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.protocol && (
          <p className="mt-1 text-xs text-red-600">{errors.protocol.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chain
        </label>
        <input
          {...register("chain")}
          placeholder="e.g. ethereum"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.chain && (
          <p className="mt-1 text-xs text-red-600">{errors.chain.message}</p>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          Failed to register allocation. Please try again.
        </p>
      )}

      {mutation.isSuccess && (
        <p className="text-sm text-green-600">Allocation registered successfully!</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Registering..." : "Register Allocation"}
      </button>
    </form>
  );
}
