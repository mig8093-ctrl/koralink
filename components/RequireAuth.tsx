'use client';

import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const ok = !!data.session;
      setSignedIn(ok);
      setReady(true);
      if (!ok) window.location.replace('/');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const ok = !!session;
      setSignedIn(ok);
      setReady(true);
      if (!ok) window.location.replace('/');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="card">
        <h1>تحميل…</h1>
        <p className="small">لحظات</p>
      </div>
    );
  }

  if (!signedIn) return null;

  return <>{children}</>;
}
