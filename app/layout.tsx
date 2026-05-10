import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'orbit.ai — Validate your startup',
  description: 'AI startup advisor. Live market evidence + YC-style validation reports in seconds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col text-zinc-900 antialiased" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
