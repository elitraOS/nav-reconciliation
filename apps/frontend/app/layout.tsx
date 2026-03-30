import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NAV Reconciliation Dashboard',
  description: 'Curator dashboard for vault NAV reconciliation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#f9fafb',
          color: '#111827',
        }}
      >
        <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
