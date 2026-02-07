'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Nav() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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
