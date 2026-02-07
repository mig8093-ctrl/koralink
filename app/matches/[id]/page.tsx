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
  status: 'scheduled'|'finished'|'canceled';
  team_home: string | null;
  team_away: string | null;
  location_text: string | null;
  venue_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  motm_player: string | null;
  created_at: string;
  home: Team | null;
  away: Team | null;
  venue: Venue | null;
};

type Profile = {
  id: string;
  display_name: string;
  player_id: string;
  position: string;
  level: string;
  city: string;
  matches_played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  motm_count?: number;
  trust_score?: number;
  age_range?: string | null;
  age_visible?: boolean;
};

const AGE_LABEL: Record<string, string> = {
  'u14': 'أقل من 14',
  '14_17': '14 - 17',
  '18_24': '18 - 24',
  '25_34': '25 - 34',
  '35_44': '35 - 44',
  '45_plus': '45+',
};
function ageLabel(v?: string | null) { return v ? (AGE_LABEL[v] || v) : ''; }



type MatchPlayer = {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string | null;
  status: 'invited'|'confirmed'|'present'|'absent';
  created_at: string;
  p: Profile;
};

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const matchId = params.id;
  const [uid, setUid] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  const [motm, setMotm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUid(id);
      if (id) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        setMyProfile((p as any) ?? null);
      } else {
        setMyProfile(null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const id = session?.user?.id ?? null;
      setUid(id);
      if (id) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        setMyProfile((p as any) ?? null);
      } else {
        setMyProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
    const { data: m, error: e1 } = await supabase
      .from('matches')
      .select('*, home:teams!matches_team_home_fkey(*), away:teams!matches_team_away_fkey(*), venue:venues!matches_venue_id_fkey(*)')
      .eq('id', matchId)
      .maybeSingle();

    const { data: mp, error: e2 } = await supabase
      .from('match_players')
      .select('id, match_id, player_id, team_id, status, created_at, p:profiles(*)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    setLoading(false);
    if (e1) alert(e1.message);
    if (e2) alert(e2.message);
    setMatch((m as any) ?? null);
    setPlayers((mp as any) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const isCaptain = useMemo(() => {
    if (!uid || !match) return false;
    return match.home?.captain_id === uid || match.away?.captain_id === uid;
  }, [uid, match]);

  const myRow = useMemo(() => {
    if (!uid) return null;
    return players.find(p => p.player_id === uid) ?? null;
  }, [players, uid]);

  const canConfirm = !!uid && (!!match && match.status === 'scheduled');

  async function confirmMe() {
    if (!uid) return alert('سجّل دخول');
    if (!match) return;
    // Determine team side (if member of home/away). Otherwise allow as neutral.
    let myTeam: string | null = null;
    if (match.team_home) {
      const { data } = await supabase.from('team_members').select('team_id').eq('team_id', match.team_home).eq('player_id', uid).maybeSingle();
      if (data) myTeam = match.team_home;
    }
    if (!myTeam && match.team_away) {
      const { data } = await supabase.from('team_members').select('team_id').eq('team_id', match.team_away).eq('player_id', uid).maybeSingle();
      if (data) myTeam = match.team_away;
    }

    const payload = {
      match_id: match.id,
      player_id: uid,
      team_id: myTeam,
      status: 'confirmed',
    };

    const { error } = myRow
      ? await supabase.from('match_players').update({ status: 'confirmed', team_id: myTeam }).eq('id', myRow.id)
      : await supabase.from('match_players').insert(payload);

    if (error) return alert(error.message);
    await load();
  }

  async function setAttendance(rowId: string, status: 'present'|'absent') {
    if (!isCaptain) return;
    const { error } = await supabase.from('match_players').update({ status }).eq('id', rowId);
    if (error) return alert(error.message);
    await load();
  }

  const eligibleMotm = useMemo(() => {
    // Prefer present, then confirmed
    const present = players.filter(p => p.status === 'present');
    const confirmed = players.filter(p => p.status === 'confirmed');
    return present.length ? present : confirmed;
  }, [players]);

  async function finishMatch() {
    if (!isCaptain) return;
    if (!match) return;
    const hg = Number(homeGoals);
    const ag = Number(awayGoals);
    if (Number.isNaN(hg) || Number.isNaN(ag)) return alert('دخل نتيجة صحيحة');
    if (!motm) return alert('اختار رجل المباراة');

    setSaving(true);
    const { error: e1 } = await supabase
      .from('matches')
      .update({
        status: 'finished',
        home_goals: hg,
        away_goals: ag,
        motm_player: motm,
      })
      .eq('id', match.id);

    if (e1) {
      setSaving(false);
      return alert(e1.message);
    }

    // Apply stats + trust via RPC (security definer)
    const { error: e2 } = await supabase.rpc('apply_match_result', { p_match_id: match.id });
    if (e2) {
      // Not fatal for UI, but show message.
      alert('تم حفظ النتيجة، لكن تحديث الإحصائيات فشل: ' + e2.message);
    }

    setSaving(false);
    await load();
  }

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>تفاصيل المباراة</h1>
          <Link className="btn secondary" href="/matches">رجوع</Link>
        </div>

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : !match ? (
          <p className="small">المباراة غير موجودة.</p>
        ) : (
          <>
            <div className="card card-soft" style={{ marginTop: 12 }}>
              <h2 style={{ marginTop: 0 }}>{match.home?.name ?? '—'} vs {match.away?.name ?? '—'}</h2>
              <div className="row">
                <span className="badge">📍 {match.city}</span>
                {match.kickoff_at && <span className="badge">🕒 {new Date(match.kickoff_at).toLocaleString()}</span>}
                {match.venue?.name && <span className="badge">🏟️ {match.venue.name}</span>}
                <span className="badge">{match.status}</span>
                {match.status === 'finished' && match.home_goals != null && match.away_goals != null && (
                  <span className="badge">🏁 {match.home_goals} - {match.away_goals}</span>
                )}
              </div>
              {match.location_text && <p className="small" style={{ marginTop: 10 }}>{match.location_text}</p>}
            </div>

            <hr />

            <h2>حضورك</h2>
            {!uid ? (
              <p className="small">سجّل دخول باش تأكد حضورك.</p>
            ) : (
              <div className="card card-soft">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <b>{myProfile?.display_name ?? 'أنت'}</b>
                    <div className="small">الحالة: {myRow?.status ?? 'غير مسجل'}</div>
                  </div>
                  <button className="btn" onClick={confirmMe} disabled={!canConfirm}>
                    أكّد حضورك
                  </button>
                </div>
                {myProfile && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <span className="badge">🎮 مباريات: {myProfile.matches_played ?? 0}</span>
                    <span className="badge">✅ فوز: {myProfile.wins ?? 0}</span>
                    <span className="badge">🤝 تعادل: {myProfile.draws ?? 0}</span>
                    <span className="badge">❌ خسارة: {myProfile.losses ?? 0}</span>
                    <span className="badge">🏅 MOTM: {myProfile.motm_count ?? 0}</span>
                    <span className="badge">🧠 Trust: {myProfile.trust_score ?? 100}</span>
                  </div>
                )}
              </div>
            )}

            <hr />

            <h2>قائمة اللاعبين</h2>
            {players.length === 0 ? (
              <p className="small">ما فيش لاعبين في المباراة بعد. أول شي كل لاعب يأكد حضوره.</p>
            ) : (
              <div className="row">
                {players.map((pl) => (
                  <div key={pl.id} className="card card-soft" style={{ flex: '1 1 300px', margin: 0 }}>
                    <b>{pl.p?.display_name ?? pl.player_id}</b>
                    <div className="row" style={{ marginTop: 8 }}>
                      <span className="badge">{pl.p?.position}</span>
                      <span className="badge">{pl.p?.level}</span>
                      <span className="badge">{pl.status}</span>
                    </div>
                    {isCaptain && match.status === 'scheduled' && (
                      <div className="row" style={{ marginTop: 12 }}>
                        <button className="btn sm" onClick={() => setAttendance(pl.id, 'present')}>حضر</button>
                        <button className="btn sm secondary" onClick={() => setAttendance(pl.id, 'absent')}>غاب</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isCaptain && match.status === 'scheduled' && (
              <>
                <hr />
                <h2>إنهاء المباراة + النتيجة</h2>
                <p className="small">بعد حفظ النتيجة، الإحصائيات و Trust Score تتحدث تلقائيًا.</p>

                <div className="card card-soft">
                  <div className="row">
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label className="label">أهداف {match.home?.name ?? 'Home'}</label>
                      <input className="input" type="number" value={homeGoals} onChange={(e) => setHomeGoals(e.target.value)} placeholder="0" />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label className="label">أهداف {match.away?.name ?? 'Away'}</label>
                      <input className="input" type="number" value={awayGoals} onChange={(e) => setAwayGoals(e.target.value)} placeholder="0" />
                    </div>
                    <div style={{ flex: 2, minWidth: 220 }}>
                      <label className="label">رجل المباراة (MOTM)</label>
                      <select className="input" value={motm} onChange={(e) => setMotm(e.target.value)}>
                        <option value="" disabled>اختار لاعب</option>
                        {eligibleMotm.map(p => (
                          <option key={p.player_id} value={p.player_id}>{p.p?.display_name ?? p.player_id} ({p.status})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ height: 12 }} />
                  <button className="btn" onClick={finishMatch} disabled={saving}>
                    {saving ? '...' : 'حفظ النتيجة وإنهاء'}
                  </button>
                </div>
              </>
            )}

            {match.status === 'finished' && match.motm_player && (
              <>
                <hr />
                <p className="small">🏅 رجل المباراة: {players.find(p => p.player_id === match.motm_player)?.p?.display_name ?? match.motm_player}</p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
