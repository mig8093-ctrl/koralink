'use client';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  player_id: string;
  display_name: string;
  city: string;
  position: 'GK'|'DEF'|'MID'|'ATT';
  level: 'beginner'|'intermediate'|'advanced';
  phone: string | null;
  phone_visible: boolean;
  age_range: 'u14'|'14_17'|'18_24'|'25_34'|'35_44'|'45_plus' | null;
  age_visible: boolean;
};

function genPlayerId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'PL-';
  for (let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const canSave = useMemo(() => {
    return !!((profile.display_name && profile.city && profile.position && profile.level && profile.age_range));
  }, [profile]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        const complete = !!p && !!p.display_name && !!p.city && !!p.position && !!p.level && !!p.age_range;
        setHasProfile(complete);
        if (!p) setProfile({ player_id: genPlayerId(), phone_visible: false, phone: null });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        const complete = !!p && !!p.display_name && !!p.city && !!p.position && !!p.level && !!p.age_range;
        setHasProfile(complete);
        if (!p) setProfile({ player_id: genPlayerId(), phone_visible: false, phone: null });
      } else {
        setHasProfile(false);
        setProfile({});
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
    setLoading(false);
    if (error) alert(error.message);
  }

  async function sendOtp() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) alert(error.message);
    else setSent(true);
  }

  async function saveProfile() {
    if (!userId) return;

    const payload: any = {
      id: userId,
      player_id: profile.player_id || genPlayerId(),
      display_name: (profile.display_name ?? '').toString().trim(),
      city: (profile.city ?? '').toString().trim(),
      position: profile.position,
      level: profile.level,
      phone: (profile.phone ?? '').toString().trim() || null,
      phone_visible: !!profile.phone_visible,
      age_range: profile.age_range ?? null,
      age_visible: profile.age_visible ?? true,
    };

    if (!payload.display_name || !payload.city || !payload.position || !payload.level) {
      alert('رجاءً كمّل الاسم/المدينة/المركز/المستوى.');
      return;
    }
    if (payload.phone_visible && !payload.phone) {
      alert('لو تبي رقمك يكون ظاهر، لازم تكتب رقم الهاتف أولاً.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    setLoading(false);

    if (error) alert(error.message);
    else {
      setHasProfile(true);
      router.push('/teams');
    }
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h1>تسجيل الدخول</h1>
        <p className="small">
          سجل بـ Google (مجاني). بعد الدخول، كمّل بيانات ملفك. رقم الهاتف اختياري، لكن الكابتن لازم يكون رقمّه ظاهر.
        </p>

        {!userId && (
          <>
            <button className="btn" onClick={signInWithGoogle} disabled={loading}>
              {loading ? '...' : 'Continue with Google'}
            </button>

            <div style={{ height: 12 }} />
            <hr />
            <div style={{ height: 12 }} />

            <label className="label">Email (اختياري)</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
            <div style={{height:10}} />
            <button className="btn secondary" onClick={sendOtp} disabled={!email || loading}>
              {loading ? '...' : 'أرسل رابط الدخول'}
            </button>
            {sent && <p className="small">✅ تم الإرسال. افتح الإيميل واضغط الرابط.</p>}
          </>
        )}

        {userId && !hasProfile && (
          <>
            <hr />
            <h2>كمّل ملفك</h2>
            <p className="small">هذا الـID تعطيه لصحابك باش يضيفوك للفريق.</p>

            <div className="row">
              <div style={{flex:1, minWidth:240}}>
                <label className="label">الاسم</label>
                <input className="input" value={profile.display_name ?? ''} onChange={e=>setProfile(p=>({...p, display_name:e.target.value}))} />
              </div>
              <div style={{flex:1, minWidth:240}}>
                <label className="label">المدينة</label>
                <input className="input" value={profile.city ?? ''} onChange={e=>setProfile(p=>({...p, city:e.target.value}))} />
              </div>
            </div>

            <div style={{height:10}} />

            <div className="row">
              <div style={{flex:1, minWidth:240}}>
                <label className="label">مركزك</label>
                <select className="input" value={profile.position ?? ''} onChange={e=>setProfile(p=>({...p, position: e.target.value as any}))}>
                  <option value="" disabled>اختر</option>
                  <option value="GK">GK (حارس)</option>
                  <option value="DEF">DEF (دفاع)</option>
                  <option value="MID">MID (وسط)</option>
                  <option value="ATT">ATT (هجوم)</option>
                </select>
              </div>
              <div style={{flex:1, minWidth:240}}>
                <label className="label">مستواك</label>
                <select className="input" value={profile.level ?? ''} onChange={e=>setProfile(p=>({...p, level: e.target.value as any}))}>
                  <option value="" disabled>اختر</option>
                  <option value="beginner">مبتدئ</option>
                  <option value="intermediate">متوسط</option>
                  <option value="advanced">قوي</option>
                </select>
              </div>
            </div>

            <div style={{height:10}} />
            <label className="label">Player ID</label>
            <input className="input" value={profile.player_id ?? ''} readOnly />

            <div style={{height:14}} />
            <label className="label">رقم الهاتف (اختياري)</label>
            <input className="input" value={(profile.phone ?? '') as any} onChange={e=>setProfile(p=>({...p, phone: e.target.value}))} placeholder="+2189xxxxxxx" />

            <div style={{height:10}} />
            <label className="label">هل تريد إظهار رقمك للآخرين؟</label>
            <select
              className="input"
              value={(profile.phone_visible ?? false) ? 'yes' : 'no'}
              onChange={(e)=>setProfile(p=>({...p, phone_visible: e.target.value === 'yes'}))}
            >
              <option value="no">لا (مخفي)</option>
              <option value="yes">نعم (ظاهر)</option>
            </select>

            <p className="small" style={{marginTop:8}}>
              👑 الكابتن لازم يكون رقمّه <b>موجود</b> و<b>ظاهر</b> عشان يقدر ينشئ فريق.
            </p>


            <div style={{height:14}} />
            <label className="label">الفئة العمرية</label>
            <select
              className="input"
              value={((profile.age_range ?? '') as any)}
              onChange={(e)=>setProfile(p=>({...p, age_range: (e.target.value ? (e.target.value as any) : null)}))}
            >
              <option value="" disabled>اختر</option>
              <option value="u14">أقل من 14</option>
              <option value="14_17">14 - 17</option>
              <option value="18_24">18 - 24</option>
              <option value="25_34">25 - 34</option>
              <option value="35_44">35 - 44</option>
              <option value="45_plus">45+</option>
            </select>

            <div style={{height:10}} />
            <label className="label">هل تريد إظهار فئتك العمرية للآخرين؟</label>
            <select
              className="input"
              value={(profile.age_visible ?? true) ? 'yes' : 'no'}
              onChange={(e)=>setProfile(p=>({...p, age_visible: e.target.value === 'yes'}))}
            >
              <option value="yes">نعم (ظاهر)</option>
              <option value="no">لا (مخفي)</option>
            </select>

            <div style={{height:10}} />
            <button className="btn" onClick={saveProfile} disabled={!canSave || loading}>
              {loading ? '...' : 'حفظ'}
            </button>
          </>
        )}

        {userId && hasProfile && (
          <>
            <hr />
            <p>✅ انت مسجل وجاهز. روح لصفحة الفرق.</p>
            <a className="btn" href="/teams">الفرق</a>
          </>
        )}
      </div>
    </>
  );
}
