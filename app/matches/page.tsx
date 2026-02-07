'use client';

import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Team = { id: string; name: string; city: string; level: string; captain_id: string };
type Venue = { id: string; name: string; city: string };
type Match = {
  id: string;
  city: string;
  kickoff_at: string | null;
  status: string;
  team_home: string | null;
  team_away: string | null;
  location_text: string | null;
  venue_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  created_at: string;
  home: Team | null;
  away: Team | null;
  venue: Venue | null;
};

export default function MatchesPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [qCity, setQCity] = useState('');
  const [qStatus, setQStatus] = useState<'scheduled'|'finished'|''>('scheduled');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('matches')
      .select('id, city, kickoff_at, status, team_home, team_away, location_text, venue_id, home_goals, away_goals, created_at, home:teams!matches_team_home_fkey(*), away:teams!matches_team_away_fkey(*), venue:venues!matches_venue_id_fkey(*)')
      .order('created_at', { ascending: false });
    if (qCity.trim()) query = query.ilike('city', `%${qCity.trim()}%`);
    if (qStatus) query = query.eq('status', qStatus);
    const { data, error } = await query;
    setLoading(false);
    if (error) alert(error.message);
    else setMatches((data as any) ?? []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [qCity, qStatus]);

  const scheduled = useMemo(() => matches.filter(m => m.status === 'scheduled'), [matches]);
  const finished = useMemo(() => matches.filter(m => m.status === 'finished'), [matches]);

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>المباريات</h1>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Link className="btn secondary" href="/challenges">التحديات</Link>
            {signedIn ? (
              <Link className="btn" href="/matches/new">+ مباراة جديدة</Link>
            ) : (
              <Link className="btn" href="/login">سجّل باش تنشئ مباراة</Link>
            )}
          </div>
        </div>
        <p className="small">مباريات الخماسي: إنشاء، حضور، نتيجة، رجل المباراة، وإحصائيات.</p>

        <hr />

        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label">فلتر مدينة</label>
            <input className="input" value={qCity} onChange={(e) => setQCity(e.target.value)} placeholder="طرابلس..." />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label">الحالة</label>
            <select className="input" value={qStatus} onChange={(e) => setQStatus(e.target.value as any)}>
              <option value="scheduled">مجدولة</option>
              <option value="finished">منتهية</option>
              <option value="">الكل</option>
            </select>
          </div>
        </div>

        <div style={{ height: 10 }} />

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : matches.length === 0 ? (
          <p className="small">ما فيش مباريات.</p>
        ) : (
          <>
            {qStatus === '' && scheduled.length > 0 && (
              <>
                <h2>مجدولة</h2>
                <div className="row">
                  {scheduled.map((m) => (
                    <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none', flex: '1 1 320px' }}>
                      <div className="card card-soft" style={{ margin: 0 }}>
                        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <b>{m.home?.name ?? '—'} vs {m.away?.name ?? '—'}</b>
                          <span className="badge">scheduled</span>
                        </div>
                        <div className="row" style={{ marginTop: 8 }}>
                          <span className="badge">📍 {m.city}</span>
                          {m.kickoff_at && <span className="badge">🕒 {new Date(m.kickoff_at).toLocaleString()}</span>}
                          {m.venue?.name && <span className="badge">🏟️ {m.venue.name}</span>}
                        </div>
                        {m.location_text && <p className="small" style={{ marginTop: 10 }}>{m.location_text}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
                <hr />
              </>
            )}

            {qStatus === '' && finished.length > 0 && (
              <>
                <h2>منتهية</h2>
                <div className="row">
                  {finished.map((m) => (
                    <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none', flex: '1 1 320px' }}>
                      <div className="card card-soft" style={{ margin: 0 }}>
                        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <b>{m.home?.name ?? '—'} vs {m.away?.name ?? '—'}</b>
                          <span className="badge">finished</span>
                        </div>
                        <div className="row" style={{ marginTop: 8 }}>
                          <span className="badge">📍 {m.city}</span>
                          {m.kickoff_at && <span className="badge">🕒 {new Date(m.kickoff_at).toLocaleString()}</span>}
                          {m.home_goals != null && m.away_goals != null && <span className="badge">🏁 {m.home_goals} - {m.away_goals}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {qStatus !== '' && (
              <div className="row">
                {matches.map((m) => (
                  <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none', flex: '1 1 320px' }}>
                    <div className="card card-soft" style={{ margin: 0 }}>
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <b>{m.home?.name ?? '—'} vs {m.away?.name ?? '—'}</b>
                        <span className="badge">{m.status}</span>
                      </div>
                      <div className="row" style={{ marginTop: 8 }}>
                        <span className="badge">📍 {m.city}</span>
                        {m.kickoff_at && <span className="badge">🕒 {new Date(m.kickoff_at).toLocaleString()}</span>}
                        {m.venue?.name && <span className="badge">🏟️ {m.venue.name}</span>}
                        {m.status === 'finished' && m.home_goals != null && m.away_goals != null && (
                          <span className="badge">🏁 {m.home_goals} - {m.away_goals}</span>
                        )}
                      </div>
                      {m.location_text && <p className="small" style={{ marginTop: 10 }}>{m.location_text}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
