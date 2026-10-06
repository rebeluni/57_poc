import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Physique 57 · People Desk | Employee Helpdesk & Request System',
  description:
    'Internal request management and omnichannel helpdesk platform for Physique 57 barre fitness studios.',
  keywords: ['Physique 57', 'Barre Fitness', 'Helpdesk', 'People Desk', 'Ticketing'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans-clean bg-[#FAFAFA] text-slate-900 selection:bg-sky-100 selection:text-sky-900">
        <Navbar />
        <main className="flex-1 pb-16">{children}</main>
        <footer className="border-t border-slate-200 bg-white/60 py-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Physique 57 India · Employee Helpdesk Proof-of-Concept</span>
            <span className="text-slate-400">Designed with luxury-minimalist principles & operational logic</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
