'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SendHorizontal,
  Search,
  LayoutDashboard,
  ShieldCheck,
  GitBranch,
  FileText,
  Menu,
  X,
  Sparkles,
  Send,
  ExternalLink,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Submit Request', icon: SendHorizontal },
  { href: '/track', label: 'Track Ticket', icon: Search },
  { href: '/admin', label: 'Admin Console', icon: ShieldCheck },
  { href: '/dashboard', label: 'Metrics', icon: LayoutDashboard },
  { href: '/workflow', label: 'Workflow', icon: GitBranch },
  { href: '/about', label: 'Design Notes', icon: FileText },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Wordmark */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-serif-luxury text-sm font-semibold tracking-wider group-hover:bg-sky-500 transition-colors">
              57
            </div>
            <div className="flex flex-col">
              <span className="font-serif-luxury text-lg tracking-tight font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                Physique 57 <span className="font-sans-clean font-light text-slate-400">·</span> People Desk
              </span>
              <span className="text-[10px] tracking-widest uppercase font-medium text-slate-400 -mt-0.5">
                Internal Operations & Helpdesk
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Live System Badge & Telegram Button */}
          <div className="hidden lg:flex items-center gap-2">
            <a
              href="https://t.me/p57_helpBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 transition-colors shadow-2xs"
              title="Open @p57_helpBot on Telegram"
            >
              <Send className="w-3 h-3 text-sky-500" />
              <span>Telegram Bot</span>
              <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
            </a>

            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              <span>IST Business Hours Active</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100">
            <a
              href="https://t.me/p57_helpBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-sky-50 text-sky-800 text-sm font-semibold border border-sky-200"
            >
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-600" />
                <span>Open Telegram Bot (@p57_helpBot)</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
