import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'budget-timeline',
  description: 'Personal budget tracker with timeline view and milestones.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
