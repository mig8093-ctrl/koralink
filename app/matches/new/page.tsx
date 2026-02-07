'use client';

import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { toLocalInputValue } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

type Team = { id: string; name: string; city: string; level: string; captain_id: string };
type Venue = { id: string; name: string; city: string };

export default function NewMatchPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [city, setCity] = useState('');
  const [venueId, setVenueId] = useState('');
  const [kickoff, setKickoff] = useState(toLocalInputValue(new Date(Date.now() + 2 * 3600 * 1000)));
  const [locationText, setLocationText] = useState('');

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id ?? null;
      setUid(id);
      if (!id) {
        setLoading(false);
        return;
      }

      const { data: t } = await supabase.from('teams').select('*').eq('captain_id', id).order('created_at', { ascending: false });
      setMyTeams((t as any) ?? []);
      if ((t as any)?.length) {
        setHomeTeam((t as any)[0].id);
        setCity((t as any)[0].city);
      }

      const { data: v } = await supabase.from('venues').select('id,name,city').order('created_at', { ascending: false });
      setVenues((v as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const toTeamsFiltered = useMemo(() => myTeams.filter(t => t.id !== homeTeam), [myTeams, homeTeam]);
  const venuesFiltered = useMemo(() => {
    if (!city.trim()) return venues;
    return venues.filter(v => v.city?.toLowerCase().includes(city.trim().toLowerCase()));
  }, [venues, city]);

  const canSave = useMemo(() => {
    return !!(uid && homeTeam && awayTeam && city.trim());
  }, [uid, homeTeam, awayTeam, city]);

  async function createMatch() {
    if (!uid) return alert('لازم تسجل دخول');
    if (!canSave) return;
    if (homeTeam === awayTeam) return alert('اختار فريقين مختلفين');

    setSaving(true);
    const { error } = await supabase.from('matches').insert({
      created_by: uid,
      city: city.trim(),
      kickoff_at: kickoff ? new Date(kickoff).toISOString() : null,
      venue_id: venueId || null,
      location_text: locationText.trim() || null,
      status: 'scheduled',
      team_home: homeTeam,
      team_away: awayTeam,
    });
    setSaving(false);
    if (error) return alert(error.message);
    window.location.href = '/matches';
  }

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>مباراة جديدة</h1>
          <Link className="btn secondary" href="/matches">رجوع</Link>
        </div>

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : !uid ? (
          <p className="small">لازم تسجل دخول.</p>
        ) : myTeams.length === 0 ? (
          <p className="small">لازم يكون عندك فريق (كابتن) باش تنشئ مباراة. روح أنشئ فريق أولًا.</p>
        ) : (
          <>
            <p className="small">هنا تنشئ مباراة مباشرة (بدون تحدي). تقدر أيضًا تستخدم صفحة التحديات.</p>
            <hr />

            <div className="row">
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">فريقي (Home)</label>
                <select className="input" value={homeTeam} onChange={(e) => {
                  const v = e.target.value;
                  setHomeTeam(v);
                  const t = myTeams.find(x => x.id === v);
                  if (t) setCity(t.city);
                }}>
                  {myTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.city})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">الخصم (Away) — من فرقك (اختصار)</label>
                <select className="input" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)}>
                  <option value="" disabled>اختار</option>
                  {toTeamsFiltered.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <p className="small">* تقدر تختار خصم من فرقك الكباتن (للتجربة). لو تبي خصم من فرق أخرى: أنشئ تحدي.</p>
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="row">
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">المدينة</label>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="طرابلس" />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">وقت البداية</label>
                <input className="input" type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} />
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="row">
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">ملعب (اختياري)</label>
                <select className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                  <option value="">— بدون —</option>
                  {venuesFiltered.map(v => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">ملاحظات/موقع نصّي (اختياري)</label>
                <input className="input" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="ملعب... حي..." />
              </div>
            </div>

            <div style={{ height: 14 }} />
            <button className="btn" onClick={createMatch} disabled={!canSave || saving}>
              {saving ? '...' : 'إنشاء'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
