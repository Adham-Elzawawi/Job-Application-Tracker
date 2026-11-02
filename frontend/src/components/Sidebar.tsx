'use client';

import Link from "next/link";
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const currentPath = usePathname();
  
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">JobTracker</div>

      <nav className="sidebar-nav">
        <Link href="/" className={`nav-link ${currentPath === '/dashboard' ? 'active' : ''}`}>
          Dashboard
        </Link>
        <Link href="/applications" className={`nav-link ${currentPath === '/applications' ? 'active' : ''}`}>
          Applications
        </Link>
        <Link href="/settings" className={`nav-link ${currentPath === '/settings' ? 'active' : ''}`}>
          Settings
        </Link>
      </nav>
    </aside>
  );
}