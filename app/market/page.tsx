'use client';

import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { toLocalInputValue } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';


const AGE_LABEL: Record<string, string> = {
  'u14': 'أقل من 14',
  '14_17': '14 - 17',
  '18_24': '18 - 24',
  '25_34': '25 - 34',
  '35_44': '35 - 44',
  '45_plus': '45+',
};
function ageLabel(v?: string | null) { return v ? (AGE_LABEL[v] || v) : ''; }

type Team = { id: string; name: string; city: string; captain_id: string };
type Profile = { id: string; display_name: string; city: string; position: string; level: string; player_id: string; age_range?: string | null; age_visible?: boolean };

type FreeAgent = {
  player_id: string;
  city: string;
  position: string;
  available_until: string | null;
  created_at: string;
  p: Profile;
};

type RosterRequest = {
  id: string;
  team_id: string;
  city: string;
  needed_position: string;
  when_text: string | null;
  note: string | null;
  status: 'open'|'closed';
  created_at: string;
  team: Team;
};

type Application = {
  id: string;
  request_id: string;
  player_id: string;
  status: 'pending'|'accepted'|'declined';
  created_at: string;
};

export default function MarketPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);

  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [requests, setRequests] = useState<RosterRequest[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);

  const [loading, setLoading] = useState(true);

  // Free agent form
  const [faCity, setFaCity] = useState('');
  const [faPos, setFaPos] = useState<'GK'|'DEF'|'MID'|'ATT'>('MID');
  const [faUntil, setFaUntil] = useState(toLocalInputValue(new Date(Date.now() + 6 * 3600 * 1000)));
  const [faSaving, setFaSaving] = useState(false);

  // Roster request form (captain)
  const [rqTeam, setRqTeam] = useState('');
  const [rqCity, setRqCity] = useState('');
  const [rqPos, setRqPos] = useState<'GK'|'DEF'|'MID'|'ATT'>('GK');
  const [rqWhen, setRqWhen] = useState('');
  const [rqNote, setRqNote] = useState('');
  const [rqSaving, setRqSaving] = useState(false);

  const isCaptain = myTeams.length > 0;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUid(id);
      if (id) {
        const { data: teams } = await supabase.from('teams').select('id,name,city,captain_id').eq('captain_id', id);
        setMyTeams((teams as any) ?? []);
        if ((teams as any)?.length) {
          setRqTeam((teams as any)[0].id);
          setRqCity((teams as any)[0].city);
        }
      } else {
        setMyTeams([]);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const id = session?.user?.id ?? null;
      setUid(id);
      if (id) {
        const { data: teams } = await supabase.from('teams').select('id,name,city,captain_id').eq('captain_id', id);
        setMyTeams((teams as any) ?? []);
        if ((teams as any)?.length) {
          setRqTeam((teams as any)[0].id);
          setRqCity((teams as any)[0].city);
        }
      } else {
        setMyTeams([]);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
    const { data: fa } = await supabase
      .from('free_agent_status')
      .select('player_id, city, position, available_until, created_at, p:profiles(*)')
      .order('created_at', { ascending: false });

    const { data: rq } = await supabase
      .from('roster_requests')
      .select('id, team_id, city, needed_position, when_text, note, status, created_at, team:teams(*)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (uid) {
      const { data: apps } = await supabase
        .from('roster_applications')
        .select('*')
        .eq('player_id', uid)
        .order('created_at', { ascending: false });
      setMyApplications((apps as any) ?? []);
    } else {
      setMyApplications([]);
    }

    setFreeAgents((fa as any) ?? []);
    setRequests((rq as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const myFaRow = useMemo(() => {
    if (!uid) return null;
    return freeAgents.find(x => x.player_id === uid) ?? null;
  }, [freeAgents, uid]);

  async function setFreeAgent(active: boolean) {
    if (!uid) return alert('سجّل دخول');
    setFaSaving(true);
    if (!active) {
      const { error } = await supabase.from('free_agent_status').delete().eq('player_id', uid);
      setFaSaving(false);
      if (error) return alert(error.message);
      await load();
      return;
    }

    const { data: p } = await supabase.from('profiles').select('city').eq('id', uid).maybeSingle();
    const defaultCity = (p as any)?.city ?? '';

    const { error } = await supabase.from('free_agent_status').upsert({
      player_id: uid,
      city: faCity.trim() || defaultCity,
      position: faPos,
      available_until: faUntil ? new Date(faUntil).toISOString() : null,
    });
    setFaSaving(false);
    if (error) return alert(error.message);
    await load();
  }

  async function createRequest() {
    if (!uid) return alert('سجّل دخول');
    if (!isCaptain) return alert('لازم تكون كابتن');
    if (!rqTeam) return alert('اختار فريق');
    if (!rqCity.trim()) return alert('اكتب المدينة');

    setRqSaving(true);
    const { error } = await supabase.from('roster_requests').insert({
      team_id: rqTeam,
      city: rqCity.trim(),
      needed_position: rqPos,
      when_text: rqWhen.trim() || null,
      note: rqNote.trim() || null,
      status: 'open',
      created_by: uid,
    });
    setRqSaving(false);
    if (error) return alert(error.message);
    setRqWhen('');
    setRqNote('');
    await load();
  }

  function myAppStatus(requestId: string) {
    return myApplications.find(a => a.request_id === requestId)?.status ?? null;
  }

  async function applyToRequest(requestId: string) {
    if (!uid) return alert('سجّل دخول');
    const { error } = await supabase.from('roster_applications').insert({
      request_id: requestId,
      player_id: uid,
      status: 'pending',
    });
    if (error) return alert(error.message);
    await load();
  }

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>السوق</h1>
          {!uid ? (
            <Link className="btn" href="/login">سجّل باش تشارك</Link>
          ) : (
            <span className="badge">✅ مسجل</span>
          )}
        </div>
        <p className="small">لاعب ناقصكم الليلة؟ أو أنت لاعب حر وتبي تلعب؟ هنا تلقوا بعض.</p>

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : (
          <>
            <hr />
            <h2>أنا لاعب حر</h2>
            {!uid ? (
              <p className="small">سجّل دخول باش تفعّل وضع لاعب حر.</p>
            ) : (
              <div className="card card-soft">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <b>{myFaRow ? '✅ متاح' : '⛔ غير متاح'}</b>
                    <div className="small">لو متاح: يقدروا الكباتن يشوفوك ويكلموك.</div>
                  </div>
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    {!myFaRow ? (
                      <button className="btn" onClick={() => setFreeAgent(true)} disabled={faSaving}>تفعيل</button>
                    ) : (
                      <button className="btn secondary" onClick={() => setFreeAgent(false)} disabled={faSaving}>إيقاف</button>
                    )}
                  </div>
                </div>

                {!myFaRow && (
                  <>
                    <div style={{ height: 12 }} />
                    <div className="row">
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="label">المدينة (اختياري)</label>
                        <input className="input" value={faCity} onChange={(e) => setFaCity(e.target.value)} placeholder="طرابلس" />
                      </div>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="label">مركزك</label>
                        <select className="input" value={faPos} onChange={(e) => setFaPos(e.target.value as any)}>
                          <option value="GK">GK (حارس)</option>
                          <option value="DEF">DEF (دفاع)</option>
                          <option value="MID">MID (وسط)</option>
                          <option value="ATT">ATT (هجوم)</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="label">متاح لحد (اختياري)</label>
                        <input className="input" type="datetime-local" value={faUntil} onChange={(e) => setFaUntil(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ height: 10 }} />
            {freeAgents.length === 0 ? (
              <p className="small">ما فيش لاعبين أحرار حالياً.</p>
            ) : (
              <div className="row">
                {freeAgents.map((fa) => (
                  <div key={fa.player_id} className="card card-soft" style={{ flex: '1 1 280px', margin: 0 }}>
                    <b>{fa.p?.display_name ?? fa.player_id}</b>
                    <div className="row" style={{ marginTop: 8 }}>
                      <span className="badge">📍 {fa.city}</span>
                      <span className="badge">{fa.position}</span>
                      <span className="badge">{fa.p?.level}</span>
                      {fa.p?.age_visible && fa.p?.age_range ? (
                        <span className="badge">🎂 {ageLabel(fa.p.age_range)}</span>
                      ) : null}
                    </div>
                    {fa.available_until && (
                      <p className="small" style={{ marginTop: 10 }}>متاح لحد: {new Date(fa.available_until).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <hr />
            <h2>طلبات نقص لاعب (Mercato)</h2>
            {isCaptain && (
              <div className="card card-soft" style={{ marginTop: 10 }}>
                <h3 style={{ marginTop: 0 }}>أضف طلب</h3>
                <div className="row">
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label className="label">الفريق</label>
                    <select className="input" value={rqTeam} onChange={(e) => {
                      const v = e.target.value;
                      setRqTeam(v);
                      const t = myTeams.find(x => x.id === v);
                      if (t) setRqCity(t.city);
                    }}>
                      {myTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.city})</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label className="label">المركز المطلوب</label>
                    <select className="input" value={rqPos} onChange={(e) => setRqPos(e.target.value as any)}>
                      <option value="GK">GK (حارس)</option>
                      <option value="DEF">DEF (دفاع)</option>
                      <option value="MID">MID (وسط)</option>
                      <option value="ATT">ATT (هجوم)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label className="label">المدينة</label>
                    <input className="input" value={rqCity} onChange={(e) => setRqCity(e.target.value)} placeholder="طرابلس" />
                  </div>
                </div>
                <div style={{ height: 10 }} />
                <div className="row">
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label className="label">متى؟ (اختياري)</label>
                    <input className="input" value={rqWhen} onChange={(e) => setRqWhen(e.target.value)} placeholder="اليوم 9 مساء" />
                  </div>
                  <div style={{ flex: 2, minWidth: 220 }}>
                    <label className="label">ملاحظة (اختياري)</label>
                    <input className="input" value={rqNote} onChange={(e) => setRqNote(e.target.value)} placeholder="نحتاج حارس ضروري، ملعب قريب..." />
                  </div>
                </div>
                <div style={{ height: 12 }} />
                <button className="btn" onClick={createRequest} disabled={rqSaving}>{rqSaving ? '...' : 'نشر الطلب'}</button>
              </div>
            )}

            {requests.length === 0 ? (
              <p className="small">ما فيش طلبات مفتوحة.</p>
            ) : (
              <div className="row" style={{ marginTop: 10 }}>
                {requests.map((r) => {
                  const st = myAppStatus(r.id);
                  return (
                    <div key={r.id} className="card card-soft" style={{ flex: '1 1 320px', margin: 0 }}>
                      <b>{r.team?.name ?? 'فريق'} يحتاج {r.needed_position}</b>
                      <div className="row" style={{ marginTop: 8 }}>
                        <span className="badge">📍 {r.city}</span>
                        <span className="badge">{r.status}</span>
                        {r.when_text && <span className="badge">🕒 {r.when_text}</span>}
                      </div>
                      {r.note && <p className="small" style={{ marginTop: 10 }}>{r.note}</p>}
                      <div style={{ height: 10 }} />
                      {!uid ? (
                        <Link className="btn sm" href="/login">سجّل للتقديم</Link>
                      ) : st ? (
                        <span className="badge">طلبك: {st}</span>
                      ) : (
                        <button className="btn sm" onClick={() => applyToRequest(r.id)}>قدّم</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
