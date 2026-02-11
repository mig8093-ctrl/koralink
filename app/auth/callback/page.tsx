'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function safePlayerId() {
  // PL- + 6 digits
  return `PL-${Math.floor(100000 + Math.random() * 900000)}`;
}

export default function AuthCallbackPage() {
  useEffect(() => {
    (async () => {
      // 1) تأكد من session
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        window.location.href = '/login';
        return;
      }

      const uid = session.user.id;

      // 2) شوف هل عنده profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name, city, player_id')
        .eq('id', uid)
        .maybeSingle();

      // لو في error من RLS أو غيره نودّيه login باش ما يعلقش
      if (pErr) {
        console.error('profiles select error', pErr);
        window.location.href = '/login';
        return;
      }

      // 3) لو مش موجود: أنشئه تلقائي
      if (!profile) {
        const fullName =
          (session.user.user_metadata as any)?.full_name ||
          (session.user.user_metadata as any)?.name ||
          session.user.email?.split('@')[0] ||
          'Player';

        const { error: insErr } = await supabase.from('profiles').insert({
          id: uid,
          display_name: fullName,
          city: 'طرابلس',         // تقدر تخليها null لو تبي
          player_id: safePlayerId(),
          position: 'GK',
          level: 'متوسط',
          age_range: null,
          age_visible: false,
        });

        if (insErr) {
          console.error('profiles insert error', insErr);
          // لو فشل الإدخال بسبب سياسة/صلاحيات لازم نصلح RLS (بنحطها تحت)
          window.location.href = '/login';
          return;
        }
      }

      // 4) خلاص -> روح للفرق
      window.location.href = '/teams';
    })();
  }, []);

  return (
    <div className="card">
      <p className="small">جارٍ تسجيل الدخول...</p>
    </div>
  );
}
