'use client';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Team = { id:string; name:string; city:string; level:string; captain_id:string; created_at:string };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [qCity, setQCity] = useState('');
  const [qLevel, setQLevel] = useState('');
  const [signedIn, setSignedIn] = useState(false);

  async function load() {
    let query = supabase.from('teams').select('*').order('created_at', { ascending:false });
    if (qCity) query = query.ilike('city', `%${qCity}%`);
    if (qLevel) query = query.eq('level', qLevel);
    const { data, error } = await query;
    if (error) alert(error.message);
    else setTeams(data as any);
  }

  useEffect(() => { load(); }, [qCity, qLevel]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', width:'100%', alignItems:'center'}}>
          <h1>الفرق</h1>
          {signedIn ? (
            <div className="row" style={{justifyContent:'flex-end'}}>
              <Link className="btn secondary" href="/invites">الدعوات</Link>
              <Link className="btn" href="/teams/new">+ إنشاء فريق</Link>
            </div>
          ) : (
            <Link className="btn" href="/login">سجّل باش تنشئ فريق</Link>
          )}
        </div>

        <div className="row">
          <div style={{flex:1, minWidth:220}}>
            <label className="label">فلتر مدينة</label>
            <input className="input" value={qCity} onChange={e=>setQCity(e.target.value)} placeholder="طرابلس..." />
          </div>
          <div style={{flex:1, minWidth:220}}>
            <label className="label">فلتر مستوى</label>
            <select className="input" value={qLevel} onChange={e=>setQLevel(e.target.value)}>
              <option value="">الكل</option>
              <option value="beginner">مبتدئ</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">قوي</option>
            </select>
          </div>
        </div>

        <hr />
        {teams.length === 0 ? (
          <p className="small">ما فيش فرق مطابقة للفلاتر.</p>
        ) : (
          <div className="row">
            {teams.map(t => (
              <Link key={t.id} href={`/teams/${t.id}`} style={{textDecoration:'none', flex:'1 1 280px'}}>
                <div className="card">
                  <h3>{t.name}</h3>
                  <div className="row">
                    <span className="badge">{t.city}</span>
                    <span className="badge">{t.level}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
