import { redirect } from 'next/navigation';

const DEFAULT_VAULT = '0x3048925b3ea5a8c12eecccb8810f5f7544db54af';

export default function Home() {
  redirect(`/vaults/${DEFAULT_VAULT}`);
}
