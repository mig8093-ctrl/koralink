'use client';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) alert(error.message);
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h1>تسجيل الدخول</h1>
        <p className="small">التسجيل حالياً عبر Google فقط.</p>

        <button className="btn" onClick={signInWithGoogle} disabled={loading}>
          {loading ? '...' : 'متابعة عبر Google'}
        </button>
      </div>
    </>
  );
}
