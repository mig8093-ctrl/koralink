'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    // Supabase reads the auth code from the URL and stores the session automatically.
    supabase.auth.getSession().then(() => {
      // Redirect after successful sign-in
      window.location.replace('/teams');
    });
  }, []);

  return (
    <div className="card">
      <h1>جاري تسجيل الدخول…</h1>
      <p className="small">لحظات ونكملوا.</p>
    </div>
  );
}
