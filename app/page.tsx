'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) alert(error.message);
  }

  if (checking) {
    return (
      <div className="card">
        <h1>تحميل…</h1>
        <p className="small">لحظات</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>KoraLink</h1>
      <p className="small">
        KoraLink يساعدك تنظم مباريات الخماسي (5 + حارس) بدون قروبات وفوضى.
        <br />• كوّن فريقك
        <br />• ضيف لاعبين بالـ Player ID
        <br />• تحدّى فرق ثانية وحدد مكان الملعب
        <br />• تقييم الفرق + بلاغات على الفرق المخالفة
      </p>

      <hr />

      {!signedIn ? (
        <button className="btn" onClick={signInWithGoogle} disabled={loading}>
          {loading ? '...' : 'متابعة عبر Google'}
        </button>
      ) : (
        <div className="row">
          <Link className="btn secondary" href="/teams">دخول للبرنامج</Link>
        </div>
      )}
    </div>
  );
}
