'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = 'dark' | 'light';

export default function Nav() {
  const [signedIn, setSignedIn] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // 1) Auth state
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    // 2) Theme init from localStorage or current html dataset
    try {
      const saved = (localStorage.getItem('koralink-theme') as Theme | null);
      const current = (document.documentElement.dataset.theme as Theme | undefined);
      const initial: Theme = saved || current || 'dark';
      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    } catch {
      // ignore
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('koralink-theme', next);
    } catch {
      // ignore
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="navbar">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-badge" />
          <span className="neon-text">KoraLink</span>
        </Link>

        <div className="nav-links">
          <Link className="navlink" href="/teams">الفرق</Link>
          <Link className="navlink" href="/matches">المباريات</Link>
          <Link className="navlink" href="/market">السوق</Link>
          <Link className="navlink" href="/venues">الملاعب</Link>
        </div>

        <div className="nav-actions">
          {/* ✅ Theme toggle */}
          <button className="btn secondary sm" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ نهاري' : '🌙 ليلي'}
          </button>

          {!signedIn ? (
            <Link className="btn sm" href="/login">تسجيل الدخول</Link>
          ) : (
            <button className="btn sm danger" onClick={signOut}>خروج</button>
          )}
        </div>
      </div>
    </div>
  );
}
