import { VaultDetail } from '@/components/nav/VaultDetail';

export default async function VaultPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <VaultDetail address={address} />;
}
