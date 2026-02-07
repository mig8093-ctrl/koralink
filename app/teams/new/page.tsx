'use client';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function NewTeamPage() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [loading, setLoading] = useState(false);

  async function createTeam() {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { alert('لازم تسجل دخول'); setLoading(false); return; }

    const { error: e1, data: team } = await supabase.from('teams')
      .insert({ name, city, level, captain_id: uid })
      .select('*').single();

    if (e1) { setLoading(false); alert(e1.message); return; }

    // add captain as member
    const { error: e2 } = await supabase.from('team_members')
      .insert({ team_id: team.id, player_id: uid, role: 'captain' });

    setLoading(false);
    if (e2) alert(e2.message);
    window.location.href = `/teams/${team.id}`;
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h1>إنشاء فريق</h1>
        <p className="small">فريق خماسي (5 + GK). تقدر تضيف صحابك لاحقًا بالـPlayer ID.</p>

        <label className="label">اسم الفريق</label>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} />

        <div style={{height:10}} />
        <label className="label">المدينة</label>
        <input className="input" value={city} onChange={e=>setCity(e.target.value)} />

        <div style={{height:10}} />
        <label className="label">المستوى</label>
        <select className="input" value={level} onChange={e=>setLevel(e.target.value)}>
          <option value="beginner">مبتدئ</option>
          <option value="intermediate">متوسط</option>
          <option value="advanced">قوي</option>
        </select>

        <div style={{height:12}} />
        <button className="btn" onClick={createTeam} disabled={!name || !city || loading}>
          {loading ? '...' : 'إنشاء'}
        </button>
      </div>
    </>
  );
}
