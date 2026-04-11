import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'TableSpace BI',
  description: 'Business Intelligence Suite for TableSpace coworking operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto" style={{ marginLeft: '220px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
